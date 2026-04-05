import { supabase } from '../config.js';

let currentClassId = null;
let currentClassName = '';
let currentExamId = null;
let rosterData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchClasses();
  await loadSubjects();
});

// ==============================================
// 共用功能與畫面切換
// ==============================================
window.switchView = (viewId) => {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewId}`).classList.add('active');
};

function showCustomDialog(title, message, type = 'info') {
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-message').innerHTML = message;
  const icon = type === 'success' ? '<span class="material-symbols-outlined" style="font-size:48px; color:var(--success);">check_circle</span>' : '<span class="material-symbols-outlined" style="font-size:48px; color:var(--primary);">info</span>';
  document.getElementById('dialog-icon').innerHTML = icon;
  document.getElementById('custom-dialog').style.display = 'flex';
}

// ==============================================
// 1. 班級列表載入
// ==============================================
async function fetchClasses() {
  const tbody = document.getElementById('class-list');
  const { data, error } = await supabase.from('classes').select('*, branches(name), staff(name)');
  
  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">目前無班級資料</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td style="font-weight:bold;">${c.class_name}</td>
      <td>${c.branches?.name || '未指定'}</td>
      <td>${c.staff?.name || '未指定'}</td>
      <td><button class="btn btn-primary" onclick="window.openClassExams('${c.id}', '${c.class_name}', '${c.branches?.name || ''}', '${c.staff?.name || ''}')">管理成績</button></td>
    </tr>
  `).join('');
}

window.openClassExams = (classId, className, branchName, teacherName) => {
  currentClassId = classId;
  currentClassName = className;
  document.getElementById('manage-class-title').textContent = className;
  document.getElementById('manage-class-subtitle').textContent = `${branchName} / 授課教師：${teacherName}`;
  fetchExamsList();
  window.switchView('exams');
};

// ==============================================
// 2. 測驗列表載入
// ==============================================
async function fetchExamsList() {
  const tbody = document.getElementById('exam-list');
  const { data, error } = await supabase.from('class_exams').select('*').eq('class_id', currentClassId).order('exam_date', { ascending: false });

  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light);">本班級尚無測驗紀錄</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(ex => `
    <tr>
      <td>${ex.exam_date}</td>
      <td style="font-weight:bold;">${ex.exam_name} <span style="font-size:12px; color:var(--text-light);">(${ex.subject})</span></td>
      <td style="color:var(--primary); font-weight:bold;">${ex.class_average || '--'} 分</td>
      <td>--</td>
      <td>--</td>
      <td>
        <button class="btn" style="background:#f1f5f9; border:1px solid var(--border);" onclick="window.openExamEditor('${ex.id}')">編輯與登錄</button>
        <button class="btn" style="background:#fee2e2; color:#ef4444;" onclick="deleteExam('${ex.id}')">刪除</button>
      </td>
    </tr>
  `).join('');
}

// ==============================================
// 3. 成績編輯器 (核心功能)
// ==============================================
window.openExamEditor = async (examId = null) => {
  currentExamId = examId;
  document.getElementById('editor-title').textContent = examId ? '編輯測驗成績' : '新增班級測驗成績';
  
  // 清空表單
  document.getElementById('exam_name').value = '';
  document.getElementById('exam_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('class_notice').value = '';
  document.getElementById('subject').selectedIndex = 0;

  // 抓取全班學生名單
  const { data: students } = await supabase.from('students').select('*').eq('class_id', currentClassId);
  rosterData = students || [];

  let existingGrades = [];
  if (examId) {
    const { data: examData } = await supabase.from('class_exams').select('*').eq('id', examId).single();
    if (examData) {
      document.getElementById('exam_name').value = examData.exam_name;
      document.getElementById('exam_date').value = examData.exam_date;
      document.getElementById('class_notice').value = examData.class_notice || '';
      document.getElementById('subject').value = examData.subject;
    }
    const { data: grades } = await supabase.from('grades').select('*').eq('class_exam_id', examId);
    existingGrades = grades || [];
  }

  renderRosterTable(existingGrades);
  window.switchView('editor');
};

function renderRosterTable(existingGrades) {
  const tbody = document.getElementById('roster-list');
  if (rosterData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">此班級目前無學生資料</td></tr>';
    return;
  }

  tbody.innerHTML = rosterData.map(student => {
    const grade = existingGrades.find(g => g.student_id === student.id) || {};
    return `
      <tr>
        <td>${student.student_number || ''} - <strong>${student.name}</strong></td>
        <td style="text-align:center;">
          <input type="number" class="score-input" data-sid="${student.id}" value="${grade.score !== undefined ? grade.score : ''}" placeholder="缺考">
        </td>
        <td style="text-align:center;">
          <input type="text" class="rank-input" id="rank-${student.id}" value="${grade.rank || ''}" placeholder="自動計算" readonly style="background:#f1f5f9; color:#64748b; border:none;">
        </td>
        <td>
          <input type="text" class="row-note" data-sid="${student.id}" value="${grade.note || ''}" placeholder="輸入個人評語...">
        </td>
      </tr>
    `;
  }).join('');

  // 綁定「自動算分與排名」事件
  document.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', calculateStatsAndRanks);
  });
  
  // 支援 Excel 貼上
  bindExcelPaste();
  
  // 初始化計算一次
  calculateStatsAndRanks();
}

// 💡 自動計算平均與排名的超級引擎
function calculateStatsAndRanks() {
  const inputs = document.querySelectorAll('.score-input');
  let validScores = [];

  inputs.forEach(inp => {
    const val = parseFloat(inp.value);
    if (!isNaN(val)) validScores.push({ sid: inp.dataset.sid, score: val });
    else document.getElementById(`rank-${inp.dataset.sid}`).value = ''; // 清空缺考者的排名
  });

  if (validScores.length === 0) {
    document.getElementById('stat-avg').textContent = '-';
    document.getElementById('stat-high').textContent = '-';
    document.getElementById('stat-low').textContent = '-';
    return;
  }

  // 1. 算平均與極值
  const sum = validScores.reduce((a, b) => a + b.score, 0);
  document.getElementById('stat-avg').textContent = (sum / validScores.length).toFixed(1);
  document.getElementById('stat-high').textContent = Math.max(...validScores.map(s => s.score));
  document.getElementById('stat-low').textContent = Math.min(...validScores.map(s => s.score));

  // 2. 自動算排名 (處理同分並列)
  validScores.sort((a, b) => b.score - a.score);
  let currentRank = 1;
  let previousScore = null;
  let tieCount = 0;

  validScores.forEach((item, index) => {
    if (item.score === previousScore) {
      tieCount++;
    } else {
      currentRank = index + 1;
      tieCount = 0;
    }
    document.getElementById(`rank-${item.sid}`).value = currentRank;
    previousScore = item.score;
  });
}

// Excel 貼上功能
function bindExcelPaste() {
  const firstInput = document.querySelector('.score-input');
  if (!firstInput) return;
  
  firstInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split('\n').map(r => r.trim()).filter(r => r);
    const inputs = document.querySelectorAll('.score-input');
    
    rows.forEach((val, i) => {
      if (inputs[i]) {
        inputs[i].value = val;
      }
    });
    calculateStatsAndRanks(); // 貼完自動算分
  });
}

window.saveExamData = async () => {
  const exam_name = document.getElementById('exam_name').value.trim();
  const subject = document.getElementById('subject').value;
  const exam_date = document.getElementById('exam_date').value;
  const class_notice = document.getElementById('class_notice').value.trim();
  const class_average = document.getElementById('stat-avg').textContent;

  if (!exam_name || !subject || !exam_date) return showCustomDialog('錯誤', '請填寫完整的測驗名稱、科目與日期！');

  const btn = document.getElementById('btn-save-exam');
  btn.disabled = true; btn.textContent = '儲存中...';

  try {
    // 1. 儲存測驗主檔 (包含家長專區需要的 class_name, avg, notice)
    const examPayload = { 
      class_id: currentClassId, 
      exam_name, subject, exam_date, class_notice,
      class_name: currentClassName,
      class_average: class_average === '-' ? null : class_average 
    };

    let examId = currentExamId;
    if (examId) {
      await supabase.from('class_exams').update(examPayload).eq('id', examId);
    } else {
      const { data, error } = await supabase.from('class_exams').insert([examPayload]).select().single();
      if (error) throw error;
      examId = data.id;
    }

    // 2. 收集所有學生的成績、排名、評語
    const gradesPayload = [];
    document.querySelectorAll('.score-input').forEach(inp => {
      const sid = inp.dataset.sid;
      const score = inp.value;
      const rank = document.getElementById(`rank-${sid}`).value;
      const note = document.querySelector(`.row-note[data-sid="${sid}"]`).value;

      if (score !== '') {
        gradesPayload.push({ class_exam_id: examId, student_id: sid, score: parseFloat(score), rank, note });
      }
    });

    // 3. 砍掉舊成績，寫入新成績 (最穩定的更新法)
    await supabase.from('grades').delete().eq('class_exam_id', examId);
    if (gradesPayload.length > 0) {
      await supabase.from('grades').insert(gradesPayload);
    }

    showCustomDialog('成功', '成績已成功儲存並發布給家長！', 'success');
    window.handleBackFromEditor();
  } catch (err) {
    showCustomDialog('錯誤', '儲存失敗：' + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存成績與發布';
  }
};

window.handleBackFromEditor = () => {
  fetchExamsList();
  window.switchView('exams');
};

async function deleteExam(examId) {
  if(!confirm('確定要刪除整個測驗嗎？這會同時刪除所有學生的成績喔！')) return;
  await supabase.from('grades').delete().eq('class_exam_id', examId);
  await supabase.from('class_exams').delete().eq('id', examId);
  fetchExamsList();
}

// 科目載入邏輯 (保留你原本的)
async function loadSubjects() {
  const { data } = await supabase.from('subjects').select('*');
  if (data) {
    const select = document.getElementById('subject');
    select.innerHTML = '<option value="" disabled selected>請選擇科目</option>' + data.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  }
}
window.openSubjectModal = () => { document.getElementById('subject-modal').style.display = 'flex'; };
window.closeSubjectModal = () => { document.getElementById('subject-modal').style.display = 'none'; };
window.printReportCard = () => { window.print(); };

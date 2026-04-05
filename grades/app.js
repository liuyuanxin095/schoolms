import { supabase } from '../config.js';

let examsData = [];
let studentsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchExams();
  await fetchStudents();
});

// ==============================================
// 1. 測驗項目管理 (包含班級、平均、通知)
// ==============================================
async function fetchExams() {
  const { data, error } = await supabase.from('class_exams').select('*').order('created_at', { ascending: false });
  if (error) return console.error('抓取測驗失敗', error);
  
  examsData = data;
  const select = document.getElementById('exam-select');
  select.innerHTML = '<option value="">-- 請先選擇測驗項目 --</option>';
  data.forEach(ex => {
    select.innerHTML += `<option value="${ex.id}">${ex.exam_date} | ${ex.exam_name} (${ex.subject}) - ${ex.class_name || '未設班級'}</option>`;
  });
}

window.openExamModal = () => {
  document.getElementById('exam-id').value = '';
  document.getElementById('exam-name').value = '';
  document.getElementById('exam-subject').value = '';
  document.getElementById('exam-date').value = new Date().toISOString().split('T')[0];
  
  // 新增的欄位
  document.getElementById('exam-class-name').value = '';
  document.getElementById('exam-class-avg').value = '';
  document.getElementById('exam-class-notice').value = '';

  document.getElementById('exam-modal-title').textContent = '新增測驗項目';
  document.getElementById('exam-modal').style.display = 'flex';
};

window.editCurrentExam = () => {
  const examId = document.getElementById('exam-select').value;
  if (!examId) return alert('請先從下拉選單選擇一個測驗！');
  
  const ex = examsData.find(e => e.id === examId);
  if (!ex) return;

  document.getElementById('exam-id').value = ex.id;
  document.getElementById('exam-name').value = ex.exam_name;
  document.getElementById('exam-subject').value = ex.subject;
  document.getElementById('exam-date').value = ex.exam_date;
  
  // 載入新欄位
  document.getElementById('exam-class-name').value = ex.class_name || '';
  document.getElementById('exam-class-avg').value = ex.class_average || '';
  document.getElementById('exam-class-notice').value = ex.class_notice || '';

  document.getElementById('exam-modal-title').textContent = '編輯測驗設定';
  document.getElementById('exam-modal').style.display = 'flex';
};

window.saveExam = async () => {
  const id = document.getElementById('exam-id').value;
  const exam_name = document.getElementById('exam-name').value.trim();
  const subject = document.getElementById('exam-subject').value.trim();
  const exam_date = document.getElementById('exam-date').value;
  
  // 讀取新欄位
  const class_name = document.getElementById('exam-class-name').value.trim();
  const class_average = document.getElementById('exam-class-avg').value.trim();
  const class_notice = document.getElementById('exam-class-notice').value.trim();

  if (!exam_name || !subject || !exam_date) return alert('打 * 號為必填欄位！');

  const payload = { exam_name, subject, exam_date, class_name, class_average, class_notice };
  let error;

  if (id) {
    ({ error } = await supabase.from('class_exams').update(payload).eq('id', id));
  } else {
    ({ error } = await supabase.from('class_exams').insert([payload]));
  }

  if (error) {
    alert('儲存失敗：' + error.message);
  } else {
    alert('測驗設定已儲存！');
    window.closeModal('exam-modal');
    await fetchExams();
    if(id) document.getElementById('exam-select').value = id; // 保持選中
  }
};

// ==============================================
// 2. 學生成績管理 (包含分數、排名、評語)
// ==============================================
async function fetchStudents() {
  const { data } = await supabase.from('students').select('id, name, student_number');
  if(data) {
    studentsData = data;
    const stuSelect = document.getElementById('grade-student');
    stuSelect.innerHTML = data.map(s => `<option value="${s.id}">${s.student_number} - ${s.name}</option>`).join('');
  }
}

window.loadGrades = async () => {
  const examId = document.getElementById('exam-select').value;
  const tbody = document.getElementById('grades-table-body');
  const btnAdd = document.getElementById('btn-add-grade');

  if (!examId) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">請先從上方選擇測驗項目</td></tr>';
    btnAdd.disabled = true;
    return;
  }

  btnAdd.disabled = false;
  const { data, error } = await supabase.from('grades').select('*, students(name)').eq('class_exam_id', examId).order('score', { ascending: false });

  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">本測驗尚無成績紀錄</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(g => `
    <tr>
      <td style="font-weight:bold;">${g.students?.name || '未知學生'}</td>
      <td style="color:var(--primary); font-weight:bold; font-size:16px;">${g.score}</td>
      <td>${g.rank || '--'}</td>
      <td style="color:var(--text-muted); font-size:13px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.note || '無'}</td>
      <td>
        <button class="btn" style="background:#f1f5f9; padding:6px 10px;" onclick='window.editGrade(${JSON.stringify(g).replace(/'/g, "&apos;")})'>編輯</button>
        <button class="btn" style="background:#fee2e2; color:#ef4444; padding:6px 10px;" onclick="window.deleteGrade('${g.id}')">刪除</button>
      </td>
    </tr>
  `).join('');
};

window.openGradeModal = () => {
  document.getElementById('grade-id').value = '';
  document.getElementById('grade-student').disabled = false; // 新增時可選學生
  document.getElementById('grade-score').value = '';
  document.getElementById('grade-rank').value = '';
  document.getElementById('grade-note').value = '';
  
  document.getElementById('grade-modal-title').textContent = '登錄成績';
  document.getElementById('grade-modal').style.display = 'flex';
};

window.editGrade = (grade) => {
  document.getElementById('grade-id').value = grade.id;
  document.getElementById('grade-student').value = grade.student_id;
  document.getElementById('grade-student').disabled = true; // 編輯時不給換人
  document.getElementById('grade-score').value = grade.score;
  document.getElementById('grade-rank').value = grade.rank || '';
  document.getElementById('grade-note').value = grade.note || '';
  
  document.getElementById('grade-modal-title').textContent = '修改成績';
  document.getElementById('grade-modal').style.display = 'flex';
};

window.saveGrade = async () => {
  const examId = document.getElementById('exam-select').value;
  const gradeId = document.getElementById('grade-id').value;
  const student_id = document.getElementById('grade-student').value;
  const score = document.getElementById('grade-score').value;
  const rank = document.getElementById('grade-rank').value.trim();
  const note = document.getElementById('grade-note').value.trim();

  if (!examId || !student_id || !score) return alert('請確認已選擇測驗、學生並填寫分數！');

  const payload = { class_exam_id: examId, student_id, score, rank, note };
  let error;

  if (gradeId) {
    ({ error } = await supabase.from('grades').update(payload).eq('id', gradeId));
  } else {
    // 檢查是否重複登錄
    const { data: exist } = await supabase.from('grades').select('id').match({class_exam_id: examId, student_id}).maybeSingle();
    if(exist) return alert('此學生在本次測驗中已有成績，請使用編輯功能！');
    
    ({ error } = await supabase.from('grades').insert([payload]));
  }

  if (error) return alert('儲存失敗：' + error.message);
  
  window.closeModal('grade-modal');
  window.loadGrades();
};

window.deleteGrade = async (id) => {
  if(!confirm('確定要刪除這筆成績嗎？')) return;
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) alert('刪除失敗');
  else window.loadGrades();
};

window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };

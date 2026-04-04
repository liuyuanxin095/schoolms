import { supabase } from '../config.js'

const viewClasses = document.getElementById('view-classes'); const viewExams = document.getElementById('view-exams'); const viewEditor = document.getElementById('view-editor')
const classListContainer = document.getElementById('class-list'); const examList = document.getElementById('exam-list'); const rosterList = document.getElementById('roster-list')
const subjectModal = document.getElementById('subject-modal'); const subjectForm = document.getElementById('subject-form'); const subjectListContainer = document.getElementById('subject-list')

let currentClassId = null; let currentClassName = ''; let rosterData = []; let hasUnsavedChanges = false; let allClasses = [];

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>')
    const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`
    const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm')
    btnCancel.style.display = type === 'confirm' ? 'block' : 'none'
    const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }
    btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex'
  })
}

window.switchView = (view) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  if(view === 'classes') viewClasses.classList.add('active')
  if(view === 'exams') viewExams.classList.add('active')
  if(view === 'editor') viewEditor.classList.add('active')
}

async function loadSubjects() {
  const { data } = await supabase.from('subjects').select('*').order('name')
  const select = document.getElementById('subject'); select.innerHTML = '<option value="" disabled selected>請選擇科目...</option>'
  subjectListContainer.innerHTML = ''
  if(data) data.forEach(s => {
    select.appendChild(new Option(s.name, s.name))
    subjectListContainer.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px 15px; border-bottom:1px solid var(--border);"><span>${s.name}</span><span class="material-symbols-outlined" style="color:var(--danger); cursor:pointer; font-size:18px;" onclick="window.deleteSubject('${s.id}')">delete</span></div>`
  })
}

async function loadClasses() {
  let query = supabase.from('classes').select('id, name, teacher_id, tutor_id, branches(name), staff!classes_teacher_id_fkey(name), tutor:staff!classes_tutor_id_fkey(name)')
  
  const user = window.currentUser
  if (user) {
    if (user.role === 'teacher') {
      query = query.or(`teacher_id.eq.${user.id},tutor_id.eq.${user.id}`)
    } else if (user.role === 'admin' || user.role === 'manager') {
      query = query.eq('branch_id', user.branch_id)
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  classListContainer.innerHTML = ''
  
  if (error || !data || data.length === 0) { classListContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">查無授權管理之班級</td></tr>'; return }
  
  allClasses = data;
  data.forEach(c => {
    const branchName = c.branches ? c.branches.name : '-'
    const teacherName = c.staff ? c.staff.name : '<span style="color:var(--text-light);">未指派</span>'
    const tutorName = c.tutor ? c.tutor.name : '<span style="color:var(--text-light);">未指派</span>'

    classListContainer.innerHTML += `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${branchName}</td>
        <td><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle; color:var(--text-light);">person</span> ${teacherName}</td>
        <td><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle; color:var(--text-light);">assignment_ind</span> ${tutorName}</td>
        <td><button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="window.openClassExams('${c.id}', '${c.name}', '${branchName}', '${c.staff ? c.staff.name : '未指派'}')">進入登錄</button></td>
      </tr>`
  })
}

window.openClassExams = (classId, className, branchName, teacherName) => {
  currentClassId = classId; currentClassName = className
  document.getElementById('manage-class-title').textContent = className
  document.getElementById('manage-class-subtitle').textContent = `${branchName} | 授課老師: ${teacherName}`
  window.switchView('exams'); loadExamsList()
}

async function loadExamsList() {
  const { data } = await supabase.from('class_exams').select('*').eq('class_id', currentClassId).order('exam_date', { ascending: false })
  examList.innerHTML = ''
  if (!data || data.length === 0) { examList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">尚無測驗紀錄</td></tr>'; return }
  data.forEach(e => {
    const avgHtml = e.avg_score !== null ? `<strong style="color:#0369a1;">${e.avg_score}</strong>` : '-'
    examList.innerHTML += `
      <tr>
        <td>${e.exam_date}</td><td><strong>${e.exam_name}</strong> <span style="font-size:12px; color:var(--text-light);">(${e.subject})</span></td>
        <td>${avgHtml}</td><td><span style="color:#15803d; font-weight:bold;">${e.high_score !== null ? e.high_score : '-'}</span></td><td><span style="color:#b91c1c; font-weight:bold;">${e.low_score !== null ? e.low_score : '-'}</span></td>
        <td><button class="btn-icon" onclick="window.openExamEditor('${e.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button></td>
      </tr>`
  })
}

window.openExamEditor = async (examId = null) => {
  document.getElementById('exam-form').reset(); document.getElementById('exam-id').value = examId || ''
  
  const c = allClasses.find(x => x.id === currentClassId);
  if (c && !c.teacher_id && !c.tutor_id) {
    return window.showCustomDialog('無法登錄', '此班級尚未指派「授課教師」或「帶班導師」，無法登錄成績！\n請先至「班級與排課管理」進行設定。', 'alert', 'error');
  }

  if (examId) {
    document.getElementById('editor-title').textContent = '修改測驗成績'
    const { data: exam } = await supabase.from('class_exams').select('*').eq('id', examId).single()
    if (exam) { 
      document.getElementById('exam_name').value = exam.exam_name; 
      document.getElementById('subject').value = exam.subject; 
      document.getElementById('exam_date').value = exam.exam_date; 
      document.getElementById('teacher_notice').value = exam.teacher_notice || ''; 
    }
  } else {
    document.getElementById('editor-title').textContent = `新增測驗 (${currentClassName})`; 
    document.getElementById('exam_date').value = new Date().toISOString().split('T')[0]
  }
  
  rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center;">載入名單中...</td></tr>'; window.switchView('editor')

  const { data: students } = await supabase.from('class_students').select('student_id, students(id, name, student_number)').eq('class_id', currentClassId)
  let existingScores = {}
  
  if (examId) { 
    const { data: scores } = await supabase.from('grades').select('*').eq('exam_id', examId); 
    if (scores) scores.forEach(s => existingScores[s.student_id] = s) 
  }
  
  if (!students || students.length === 0) { rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center;">班上尚無學生</td></tr>'; return }
  rosterData = students.map(s => ({ student_id: s.student_id, name: s.students?.name, student_number: s.students?.student_number }))
  rosterData.sort((a,b) => (a.student_number||'').localeCompare(b.student_number||'', 'zh-TW', {numeric:true}))
  
  rosterList.innerHTML = ''
  rosterData.forEach((s, idx) => {
    const sc = existingScores[s.student_id]; 
    const scoreVal = sc && sc.score !== null ? sc.score : ''; 
    const noteVal = sc && sc.note ? sc.note : ''
    rosterList.innerHTML += `
      <tr>
        <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number||''}</span><input type="hidden" class="row-student-id" value="${s.student_id}"></td>
        <td><input type="number" class="row-score" min="0" max="100" step="1" value="${scoreVal}" data-idx="${idx}" onchange="window.calcStats()"></td>
        <td><input type="text" class="row-note" value="${noteVal}" placeholder="輸入個人評語..."></td>
      </tr>`
  })
  hasUnsavedChanges = false; window.calcStats()
}

window.calcStats = () => {
  hasUnsavedChanges = true; const inputs = document.querySelectorAll('.row-score'); let total = 0, count = 0, high = -1, low = 999
  inputs.forEach(inp => { const v = inp.value; if(v !== '') { const num = parseFloat(v); total += num; count++; if(num > high) high = num; if(num < low) low = num } })
  document.getElementById('stat-avg').textContent = count > 0 ? (total/count).toFixed(1) : '-'; document.getElementById('stat-high').textContent = count > 0 ? high : '-'; document.getElementById('stat-low').textContent = count > 0 ? low : '-'
}

window.saveExamData = async () => {
  const btn = document.getElementById('btn-save-exam'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    const examId = document.getElementById('exam-id').value; const eName = document.getElementById('exam_name').value; const subj = document.getElementById('subject').value; const eDate = document.getElementById('exam_date').value; const notice = document.getElementById('teacher_notice').value
    if(!eName || !subj || !eDate) throw new Error('請填寫完整測驗基本設定')
    
    const avg = document.getElementById('stat-avg').textContent; const high = document.getElementById('stat-high').textContent; const low = document.getElementById('stat-low').textContent
    const examPayload = { class_id: currentClassId, exam_name: eName, subject: subj, exam_date: eDate, teacher_notice: notice || null, avg_score: avg==='-'?null:parseFloat(avg), high_score: high==='-'?null:parseFloat(high), low_score: low==='-'?null:parseFloat(low) }
    
    let targetExamId = examId
    if (examId) await supabase.from('class_exams').update(examPayload).eq('id', examId)
    else { const { data } = await supabase.from('class_exams').insert([examPayload]).select(); targetExamId = data[0].id }

    const rows = document.querySelectorAll('#roster-list tr'); const gradesPayload = []
    rows.forEach(tr => {
      const sId = tr.querySelector('.row-student-id').value; const scoreStr = tr.querySelector('.row-score').value; const note = tr.querySelector('.row-note').value
      gradesPayload.push({ exam_id: targetExamId, student_id: sId, score: scoreStr===''?null:parseFloat(scoreStr), note: note||null })
    })

    if (examId) await supabase.from('grades').delete().eq('exam_id', targetExamId)
    await supabase.from('grades').insert(gradesPayload)

    await window.showCustomDialog('成功', '成績儲存完畢！', 'alert', 'check_circle'); hasUnsavedChanges = false; window.switchView('exams'); loadExamsList()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存成績與發布' }
}

window.handleBackFromEditor = async () => { if (hasUnsavedChanges) { const confirm = await window.showCustomDialog('確認離開', '有尚未儲存的成績，確定要放棄變更嗎？', 'confirm', 'warning'); if(!confirm) return }; window.switchView('exams') }

document.addEventListener('paste', (e) => {
  if (!viewEditor.classList.contains('active')) return; const target = e.target; if (!target.classList.contains('row-score')) return
  e.preventDefault(); const pasteData = (e.clipboardData || window.clipboardData).getData('text')
  const rows = pasteData.split(/\r\n|\n|\r/); let currentIdx = parseInt(target.getAttribute('data-idx'))
  const inputs = document.querySelectorAll('.row-score')
  rows.forEach(r => { const val = r.trim(); if(val!=='' && currentIdx < inputs.length){ inputs[currentIdx].value = isNaN(parseFloat(val))?'':parseFloat(val); currentIdx++ } })
  window.calcStats()
})

window.openSubjectModal = () => { subjectForm.reset(); subjectModal.style.display = 'flex' }
window.closeSubjectModal = () => subjectModal.style.display = 'none'
subjectForm.addEventListener('submit', async (e) => { e.preventDefault(); const val = document.getElementById('new-subject').value.trim(); if(val){ await supabase.from('subjects').insert([{name: val}]); document.getElementById('new-subject').value=''; loadSubjects() } })
window.deleteSubject = async (id) => { const confirm = await window.showCustomDialog('刪除科目', '確定要刪除嗎？', 'confirm', 'delete'); if(confirm){ await supabase.from('subjects').delete().eq('id', id); loadSubjects() } }

window.printReportCard = () => {
  const examName = document.getElementById('exam_name').value;
  if (!examName) return window.showCustomDialog('提示', '請先儲存測驗名稱！', 'alert', 'info');
  
  let rowsHtml = '';
  document.querySelectorAll('#roster-list tr').forEach((tr, idx) => {
    const name = tr.querySelector('strong').textContent;
    const num = tr.querySelector('span').textContent;
    const score = tr.querySelector('.row-score').value || '缺考';
    const note = tr.querySelector('.row-note').value || '';
    rowsHtml += `<tr><td style="border:1px solid #cbd5e1; padding:8px;">${idx+1}</td><td style="border:1px solid #cbd5e1; padding:8px;">${name} ${num}</td><td style="border:1px solid #cbd5e1; padding:8px; text-align:center; font-weight:bold;">${score}</td><td style="border:1px solid #cbd5e1; padding:8px;">${note}</td></tr>`;
  });

  const content = `
    <h2 style="text-align:center; color:#1e293b;">${currentClassName} - ${examName} 測驗成績單</h2>
    <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:10px;">
      <span>考試科目：${document.getElementById('subject').value}</span>
      <span>考試日期：${document.getElementById('exam_date').value}</span>
    </div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc;">班級平均</th><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc;">最高分</th><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc;">最低分</th></tr>
      <tr><td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${document.getElementById('stat-avg').textContent}</td><td style="border:1px solid #cbd5e1; padding:8px; text-align:center; color:#15803d;">${document.getElementById('stat-high').textContent}</td><td style="border:1px solid #cbd5e1; padding:8px; text-align:center; color:#b91c1c;">${document.getElementById('stat-low').textContent}</td></tr>
    </table>
    <table style="width:100%; border-collapse:collapse;">
      <tr><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:left;">項次</th><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:left;">姓名 (學號)</th><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:center;">分數</th><th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:left;">評語備註</th></tr>
      ${rowsHtml}
    </table>
    <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }<\/script>
  `;
  const printWin = window.open('', '_blank'); printWin.document.write(content); printWin.document.close();
}

loadSubjects(); loadClasses()

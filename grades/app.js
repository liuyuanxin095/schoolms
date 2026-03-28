import { supabase } from '../config.js'

const viewClasses = document.getElementById('view-classes')
const viewExams = document.getElementById('view-exams')
const viewEditor = document.getElementById('view-editor')

const classGrid = document.getElementById('class-grid')
const examList = document.getElementById('exam-list')
const rosterList = document.getElementById('roster-list')
const subjectSelect = document.getElementById('subject')
const subjectModal = document.getElementById('subject-modal')

let allSubjects = []
let currentClassId = null
let currentExams = []
let isFormDirty = false

document.getElementById('exam-form').addEventListener('input', () => isFormDirty = true)
document.getElementById('roster-list').addEventListener('input', () => isFormDirty = true)

window.switchView = (viewName) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  if (viewName === 'classes') viewClasses.classList.add('active')
  if (viewName === 'exams') viewExams.classList.add('active')
  if (viewName === 'editor') viewEditor.classList.add('active')
  window.scrollTo(0, 0)
}

window.handleBackFromEditor = async () => {
  if (isFormDirty) {
    const wantToSave = confirm('⚠️ 您的成績尚未儲存！\n\n按下「確定」：系統會為您自動暫存成績並返回\n按下「取消」：直接放棄修改並返回')
    if (wantToSave) { await window.saveExamData(); return }
  }
  isFormDirty = false
  window.switchView('exams')
}

async function fetchSubjects() {
  const { data } = await supabase.from('subjects').select('*').order('created_at', { ascending: true })
  allSubjects = data || []
  subjectSelect.innerHTML = '<option value="" disabled selected>請選擇科目</option>'
  allSubjects.forEach(s => subjectSelect.appendChild(new Option(s.name, s.name)))
  
  const sList = document.getElementById('subject-list')
  sList.innerHTML = ''
  allSubjects.forEach(s => {
    sList.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px 15px; border-bottom:1px solid var(--border);">
      <span>${s.name}</span>
      <button class="btn-icon" style="color:var(--danger); padding:0;" onclick="window.deleteSubject('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
    </div>`
  })
}

window.openSubjectModal = () => subjectModal.style.display = 'flex'
window.closeSubjectModal = () => subjectModal.style.display = 'none'

document.getElementById('subject-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const name = document.getElementById('new-subject').value
  await supabase.from('subjects').insert([{ name }]); 
  document.getElementById('new-subject').value = ''; await fetchSubjects()
})

window.deleteSubject = async (id) => {
  if(!confirm('確定刪除此科目？')) return;
  await supabase.from('subjects').delete().eq('id', id); await fetchSubjects()
}

async function loadClasses() {
  const { data, error } = await supabase.from('classes').select('id, name, semester, branches(name), staff!classes_teacher_id_fkey(name)').order('created_at', { ascending: false })
  if (error) { classGrid.innerHTML = '載入失敗'; return }
  classGrid.innerHTML = ''
  if (data.length === 0) { classGrid.innerHTML = '<div style="grid-column:span 3; text-align:center; color:var(--text-light);">請先至班級管理建立班級</div>'; return }
  data.forEach(c => {
    const branch = c.branches ? c.branches.name : '無分校'
    const teacher = c.staff ? c.staff.name : '未指派老師'
    const sem = c.semester ? `<span style="background:#e0e7ff; color:var(--primary); padding:2px 6px; border-radius:4px; font-size:11px;">${c.semester}</span>` : ''
    
    const card = document.createElement('div')
    card.className = 'class-card'
    card.onclick = () => window.enterClassManage(c.id, c.name, branch, teacher)
    card.innerHTML = `
      <div class="class-card-header"><div class="class-card-title">${c.name}</div>${sem}</div>
      <div class="class-card-subtitle"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">domain</span> ${branch}</div>
      <div class="class-card-subtitle"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">school</span> ${teacher}</div>
    `
    classGrid.appendChild(card)
  })
}

window.enterClassManage = async (classId, className, branchName, teacherName) => {
  currentClassId = classId
  document.getElementById('manage-class-title').textContent = className
  document.getElementById('manage-class-subtitle').textContent = `${branchName} | 授課：${teacherName}`
  window.switchView('exams')
  await fetchExams()
}

async function fetchExams() {
  examList.innerHTML = '<tr><td colspan="6" style="text-align:center;">載入測驗紀錄中...</td></tr>'
  const { data, error } = await supabase.from('class_exams').select('*').eq('class_id', currentClassId).order('exam_date', { ascending: false })
  if (error) { examList.innerHTML = `<tr><td colspan="6" style="color:red;">錯誤: ${error.message}</td></tr>`; return }
  currentExams = data || []
  
  if (currentExams.length === 0) { examList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">該班級目前沒有測驗紀錄</td></tr>'; return }

  examList.innerHTML = ''
  currentExams.forEach(ex => {
    const notice = ex.teacher_notice ? `<div style="background:#fffbeb; color:#92400e; padding:4px 8px; border-radius:4px; font-size:12px; margin-top:4px;">通知：${ex.teacher_notice}</div>` : ''
    examList.innerHTML += `
      <tr>
        <td>${ex.exam_date || '-'}</td>
        <td><strong>${ex.exam_name}</strong> <span style="font-size:12px; color:var(--text-light);">(${ex.subject || '-'})</span>${notice}</td>
        <td style="color:#0369a1; font-weight:bold;">${ex.avg_score || 0}</td>
        <td style="color:#15803d; font-weight:bold;">${ex.high_score || 0}</td>
        <td style="color:#b91c1c; font-weight:bold;">${ex.low_score || 0}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="window.openExamEditor('${ex.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
            <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteExam('${ex.id}', '${ex.exam_name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
          </div>
        </td>
      </tr>`
  })
}

window.openExamEditor = async (examId = null) => {
  isFormDirty = false
  rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px;">載入學生名冊中...</td></tr>'
  document.getElementById('stat-avg').textContent = '-'; document.getElementById('stat-high').textContent = '-'; document.getElementById('stat-low').textContent = '-'
  document.getElementById('exam-id').value = examId || ''
  
  if (examId) {
    document.getElementById('editor-title').textContent = '編輯測驗與成績'
    const ex = currentExams.find(x => x.id === examId)
    document.getElementById('exam_name').value = ex.exam_name || ''; document.getElementById('subject').value = ex.subject || ''
    document.getElementById('exam_date').value = ex.exam_date || ''; document.getElementById('teacher_notice').value = ex.teacher_notice || ''
  } else {
    document.getElementById('editor-title').textContent = '新增班級測驗成績'
    document.getElementById('exam-form').reset()
    document.getElementById('exam_date').value = new Date().toISOString().split('T')[0]
  }
  
  window.switchView('editor')

  const { data: rosterData } = await supabase.from('class_students').select('student_id, students(name, student_number)').eq('class_id', currentClassId)
  if (!rosterData || rosterData.length === 0) {
    rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--danger); padding:30px;">這個班級目前沒有學生，請先至班級管理加入學生。</td></tr>'
    return
  }

  // 💡 關鍵修復：改為「升冪」排列 (小到大 A to Z)
  rosterData.sort((a, b) => {
    const numA = a.students?.student_number || ''
    const numB = b.students?.student_number || ''
    return numA.localeCompare(numB, 'zh-TW', { numeric: true })
  })

  let existingGrades = []
  if (examId) {
    const { data: gData } = await supabase.from('grades').select('*').eq('exam_id', examId)
    existingGrades = gData || []
  }

  rosterList.innerHTML = ''
  rosterData.forEach((r, index) => {
    const s = r.students; if (!s) return
    const prevGrade = existingGrades.find(g => g.student_id === r.student_id)
    const scoreVal = prevGrade && prevGrade.score !== null ? prevGrade.score : ''
    const noteVal = prevGrade && prevGrade.note ? prevGrade.note : ''

    rosterList.innerHTML += `
      <tr>
        <td>
          <div style="font-weight:600;">${s.name}</div>
          <div style="font-size:12px; color:var(--text-light);">序號: ${s.student_number || '無'}</div>
        </td>
        <td><input type="number" class="score-input" data-index="${index}" data-sid="${r.student_id}" step="0.1" value="${scoreVal}" placeholder="缺考"></td>
        <td><input type="text" class="note-input" data-sid="${r.student_id}" value="${noteVal}" placeholder="選填評語"></td>
      </tr>`
  })

  bindExcelPasteEvent()
  window.calculateLiveStats()
}

function bindExcelPasteEvent() {
  const inputs = document.querySelectorAll('.score-input')
  inputs.forEach(input => {
    input.addEventListener('paste', (e) => {
      e.preventDefault()
      isFormDirty = true
      const pasteData = (e.clipboardData || window.clipboardData).getData('text')
      const lines = pasteData.split(/\r\n|\n|\r/)
      
      const startIndex = parseInt(input.getAttribute('data-index'))
      let lineIdx = 0
      
      for (let i = startIndex; i < inputs.length && lineIdx < lines.length; i++) {
        let val = lines[lineIdx].trim()
        if (val !== '' && !isNaN(parseFloat(val))) { inputs[i].value = parseFloat(val) }
        else if (val === '') { inputs[i].value = '' }
        lineIdx++
      }
      window.calculateLiveStats()
    })
  })
}

window.calculateLiveStats = () => {
  const inputs = document.querySelectorAll('.score-input')
  let total = 0, count = 0, max = -Infinity, min = Infinity
  inputs.forEach(inp => {
    if (inp.value !== '') {
      const val = parseFloat(inp.value)
      total += val; count++; if (val > max) max = val; if (val < min) min = val
    }
  })
  document.getElementById('stat-avg').textContent = count > 0 ? (total / count).toFixed(1) : '-'
  document.getElementById('stat-high').textContent = count > 0 ? max : '-'
  document.getElementById('stat-low').textContent = count > 0 ? min : '-'
}

window.saveExamData = async () => {
  const examName = document.getElementById('exam_name').value; const examDate = document.getElementById('exam_date').value; const subject = document.getElementById('subject').value
  if (!examName || !examDate || !subject) { alert('測驗名稱、科目與日期為必填！'); return }

  const btn = document.getElementById('btn-save-exam'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    let examId = document.getElementById('exam-id').value
    const avgText = document.getElementById('stat-avg').textContent; const highText = document.getElementById('stat-high').textContent; const lowText = document.getElementById('stat-low').textContent

    const examPayload = {
      class_id: currentClassId, exam_name: examName, subject: subject, exam_date: examDate, teacher_notice: document.getElementById('teacher_notice').value || null,
      avg_score: avgText !== '-' ? parseFloat(avgText) : 0, high_score: highText !== '-' ? parseFloat(highText) : 0, low_score: lowText !== '-' ? parseFloat(lowText) : 0
    }

    if (examId) { await supabase.from('class_exams').update(examPayload).eq('id', examId) } 
    else { const { data } = await supabase.from('class_exams').insert([examPayload]).select().single(); examId = data.id }

    const inputs = document.querySelectorAll('.score-input'); const gradePayloads = []
    inputs.forEach(inp => {
      const sid = inp.getAttribute('data-sid'); const scoreStr = inp.value; const noteStr = document.querySelector(`.note-input[data-sid="${sid}"]`).value
      if (scoreStr !== '') gradePayloads.push({ exam_id: examId, student_id: sid, score: parseFloat(scoreStr), note: noteStr || null })
    })

    await supabase.from('grades').delete().eq('exam_id', examId)
    if (gradePayloads.length > 0) await supabase.from('grades').insert(gradePayloads)

    isFormDirty = false
    window.switchView('exams'); fetchExams()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存成績與發布' }
}

window.deleteExam = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」？全班成績將一併刪除。`)) return
  await supabase.from('class_exams').delete().eq('id', id); fetchExams()
}

fetchSubjects().then(loadClasses)

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
  // 💡 1. 考試日期改為「升冪」排序 (ascending: true)
  const { data, error } = await supabase.from('class_exams').select('*').eq('class_id', currentClassId).order('exam_date', { ascending: true })
  if (error) { examList.innerHTML = `<tr><td colspan="6" style="color:red;">錯誤: ${error.message}</td></tr>`; return }
  currentExams = data || []
  
  if (currentExams.length === 0) { examList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">該班級目前沒有測驗紀錄</td></tr>'; return }

  examList.innerHTML = ''
  currentExams.forEach(ex => {
    const notice = ex.teacher_notice ? `<div style="background:#fffbeb; color:#92400e; padding:4px 8px; border-radius:4px; font-size:12px; margin-top:6px;">通知：${ex.teacher_notice}</div>` : ''
    
    // 💡 2. 科目改為獨立的底色小方框標籤
    const subjectBadge = ex.subject ? `<span style="background:#eff6ff; color:var(--primary); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600;">${ex.subject}</span>` : ''

    examList.innerHTML += `
      <tr>
        <td>${ex.exam_date || '-'}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong>${ex.exam_name}</strong>
            ${subjectBadge}
          </div>
          ${notice}
        </td>
        <td style="color:#0369a1; font-weight:bold;">${ex.avg_score || 0}</td>
        <td style="color:#15803d; font-weight:bold;">${ex.high_score || 0}</td>
        <td style="color:#b91c1c; font-weight:bold;">${ex.low_score || 0}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="列印成 PDF" onclick="window.printExamReport('${ex.id}')"><span class="material-symbols-outlined" style="font-size:18px;">print</span></button>
            <button class="btn-icon" title="下載 CSV" onclick="window.downloadExamReport('${ex.id}')"><span class="material-symbols-outlined" style="font-size:18px;">download</span></button>
            <button class="btn-icon" title="編輯" onclick="window.openExamEditor('${ex.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
            <button class="btn-icon" title="刪除" style="color:var(--danger);" onclick="window.deleteExam('${ex.id}', '${ex.exam_name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
          </div>
        </td>
      </tr>`
  })
}

// 💡 3. 全新：列印/匯出 PDF 報表功能
window.printExamReport = async (examId) => {
  try {
    const ex = currentExams.find(x => x.id === examId)
    if (!ex) return

    // 抓取成績明細
    const { data: gradesData, error } = await supabase.from('grades').select('score, note, students(name, student_number)').eq('exam_id', examId)
    if (error) throw error
    if (!gradesData || gradesData.length === 0) { alert('這場考試目前沒有成績資料可以列印。'); return }

    // 依照學號升冪排列
    gradesData.sort((a, b) => {
      const numA = a.students?.student_number || ''
      const numB = b.students?.student_number || ''
      return numA.localeCompare(numB, 'zh-TW', { numeric: true })
    })

    // 產生一個乾淨的隱藏網頁供列印使用
    const printWindow = window.open('', '_blank')
    const html = `
      <!DOCTYPE html>
      <html lang="zh-TW">
        <head>
          <meta charset="UTF-8">
          <title>${ex.exam_date}_${ex.exam_name}_成績單</title>
          <style>
            body { font-family: "Microsoft JhengHei", sans-serif; padding: 20px; color: #333; line-height: 1.5; }
            h1 { text-align: center; margin-bottom: 5px; color: #111; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
            .info-bar { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px; color: #555; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
            .stat-item { text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .notice { background: #fffbeb; padding: 12px; border-left: 4px solid #f59e0b; margin-bottom: 20px; font-size: 14px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: center; }
            th { background-color: #f3f4f6; color: #374151; font-weight: 600; }
            .student-name { font-weight: bold; color: #111; font-size: 16px; }
            .student-no { font-size: 12px; color: #6b7280; }
            .score-cell { font-size: 18px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .stats { border: 1px solid #000; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>${ex.exam_name} 成績單</h1>
          <div class="info-bar">
            <span><b>考試日期：</b>${ex.exam_date}</span>
            <span><b>測驗科目：</b>${ex.subject || '無'}</span>
          </div>
          
          ${ex.teacher_notice ? `<div class="notice"><b>老師班級通知：</b><br>${ex.teacher_notice.replace(/\n/g, '<br>')}</div>` : ''}
          
          <div class="stats">
            <div class="stat-item"><div style="color:#666; font-size:12px;">班級平均</div><div class="stat-value" style="color:#0369a1;">${ex.avg_score || 0}</div></div>
            <div class="stat-item"><div style="color:#666; font-size:12px;">最高分</div><div class="stat-value" style="color:#15803d;">${ex.high_score || 0}</div></div>
            <div class="stat-item"><div style="color:#666; font-size:12px;">最低分</div><div class="stat-value" style="color:#b91c1c;">${ex.low_score || 0}</div></div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th width="15%">學號</th>
                <th width="20%">學生姓名</th>
                <th width="15%">分數</th>
                <th width="50%">個人評語/備註</th>
              </tr>
            </thead>
            <tbody>
              ${gradesData.map(g => `
                <tr>
                  <td class="student-no">${g.students?.student_number || ''}</td>
                  <td class="student-name">${g.students?.name || '未知'}</td>
                  <td class="score-cell" style="color: ${g.score === null ? '#9ca3af' : '#111'}">${g.score !== null ? g.score : '缺考'}</td>
                  <td style="text-align: left;">${g.note || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>
            // 載入完成後自動跳出列印視窗，列印完自動關閉分頁
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                // 若不想自動關閉分頁，可將下一行註解掉
                window.close(); 
              }, 500);
            }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()

  } catch (err) {
    alert('列印報表失敗：' + err.message)
  }
}

// 既有的 CSV 下載功能保留
window.downloadExamReport = async (examId) => {
  try {
    const ex = currentExams.find(x => x.id === examId)
    if (!ex) return
    const { data: gradesData, error } = await supabase.from('grades').select('score, note, students(name, student_number)').eq('exam_id', examId)
    if (error) throw error
    if (!gradesData || gradesData.length === 0) { alert('這場考試目前沒有成績資料可以下載。'); return }
    gradesData.sort((a, b) => {
      const numA = a.students?.student_number || ''
      const numB = b.students?.student_number || ''
      return numA.localeCompare(numB, 'zh-TW', { numeric: true })
    })

    let csvContent = '\uFEFF'
    csvContent += `測驗名稱,${ex.exam_name}\n考試日期,${ex.exam_date}\n科目,${ex.subject || ''}\n`
    csvContent += `班級平均,${ex.avg_score || 0},最高分,${ex.high_score || 0},最低分,${ex.low_score || 0}\n`
    const safeNotice = ex.teacher_notice ? `"${ex.teacher_notice.replace(/"/g, '""')}"` : ''
    csvContent += `班級通知,${safeNotice}\n\n學號,學生姓名,測驗分數,個人評語/備註\n`

    gradesData.forEach(g => {
      const sName = g.students?.name || '未知'
      const sNum = g.students?.student_number || ''
      const score = g.score !== null ? g.score : '缺考'
      const note = g.note || ''
      const safeNote = note.includes(',') || note.includes('\n') ? `"${note.replace(/"/g, '""')}"` : note
      csvContent += `${sNum},${sName},${score},${safeNote}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${ex.exam_date}_${ex.exam_name}_成績單.csv`
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
  } catch (err) { alert('下載失敗：' + err.message) }
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
          <div style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</div>
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

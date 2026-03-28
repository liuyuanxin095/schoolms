import { supabase } from '../config.js'

const classSelect = document.getElementById('class-select')
const btnAddExam = document.getElementById('btn-add-exam')
const examList = document.getElementById('exam-list')

const examModal = document.getElementById('exam-modal')
const modalTitle = document.getElementById('modal-title')
const btnSaveExam = document.getElementById('btn-save-exam')
const rosterList = document.getElementById('roster-list')

let currentExams = []
let currentClassId = null

// 1. 載入所有班級供選擇
async function loadClasses() {
  const { data, error } = await supabase.from('classes').select('id, name, semester, branches(name)').order('created_at', { ascending: false })
  if (error) { alert('班級載入失敗'); return }
  
  classSelect.innerHTML = '<option value="" disabled selected>請選擇要管理的班級...</option>'
  if (data) {
    data.forEach(c => {
      const branch = c.branches ? c.branches.name : '無分校'
      const sem = c.semester ? `[${c.semester}] ` : ''
      classSelect.appendChild(new Option(`${sem}${c.name} (${branch})`, c.id))
    })
  }
}

// 2. 切換班級時，讀取該班的測驗紀錄
window.handleClassChange = async () => {
  currentClassId = classSelect.value
  btnAddExam.disabled = false
  await fetchExams()
}

async function fetchExams() {
  examList.innerHTML = '<tr><td colspan="6" style="text-align:center;">載入測驗紀錄中...</td></tr>'
  
  const { data, error } = await supabase
    .from('class_exams')
    .select('*')
    .eq('class_id', currentClassId)
    .order('exam_date', { ascending: false })

  if (error) { examList.innerHTML = `<tr><td colspan="6" style="color:red;">錯誤: ${error.message}</td></tr>`; return }
  
  currentExams = data || []
  examList.innerHTML = ''
  
  if (currentExams.length === 0) {
    examList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">該班級目前沒有測驗紀錄</td></tr>'
    return
  }

  currentExams.forEach(ex => {
    const noticeHtml = ex.teacher_notice ? `<div class="notice-box"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">campaign</span> 叮嚀：${ex.teacher_notice}</div>` : ''
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${ex.exam_date || '-'}</td>
      <td>
        <strong>${ex.exam_name}</strong> <span style="font-size:12px; color:var(--text-light);">(${ex.subject || '-'})</span>
        ${noticeHtml}
      </td>
      <td style="color:#0369a1; font-weight:bold; font-size:16px;">${ex.avg_score || 0}</td>
      <td style="color:#15803d; font-weight:bold;">${ex.high_score || 0}</td>
      <td style="color:#b91c1c; font-weight:bold;">${ex.low_score || 0}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="編輯成績" onclick="window.openExamModal('${ex.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteExam('${ex.id}', '${ex.exam_name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    examList.appendChild(row)
  })
}

// 3. 開啟測驗表單 (自動抓取名冊)
window.openExamModal = async (examId = null) => {
  rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">載入名冊中...</td></tr>'
  document.getElementById('stat-avg').textContent = '-'
  document.getElementById('stat-high').textContent = '-'
  document.getElementById('stat-low').textContent = '-'
  document.getElementById('exam-id').value = examId || ''
  
  // 初始化上方表單
  if (examId) {
    modalTitle.textContent = '編輯測驗與成績'
    const ex = currentExams.find(x => x.id === examId)
    document.getElementById('exam_name').value = ex.exam_name || ''
    document.getElementById('subject').value = ex.subject || ''
    document.getElementById('exam_date').value = ex.exam_date || ''
    document.getElementById('teacher_notice').value = ex.teacher_notice || ''
  } else {
    modalTitle.textContent = '新增班級測驗'
    document.getElementById('exam-form').reset()
    document.getElementById('exam_date').value = new Date().toISOString().split('T')[0]
  }
  
  examModal.style.display = 'flex'

  // 💡 抓取該班級所有的學生 (從 class_students 抓)
  const { data: rosterData } = await supabase
    .from('class_students')
    .select('student_id, students(name, student_number)')
    .eq('class_id', currentClassId)

  if (!rosterData || rosterData.length === 0) {
    rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:20px;">這個班級目前沒有學生，請先至班級管理加入學生。</td></tr>'
    return
  }

  // 💡 如果是編輯模式，抓取已經儲存的成績對照
  let existingGrades = []
  if (examId) {
    const { data: gData } = await supabase.from('grades').select('*').eq('exam_id', examId)
    existingGrades = gData || []
  }

  // 產生全班輸入表單
  rosterList.innerHTML = ''
  rosterData.forEach(r => {
    const s = r.students
    if (!s) return // 學生可能被刪除
    const prevGrade = existingGrades.find(g => g.student_id === r.student_id)
    const scoreVal = prevGrade && prevGrade.score !== null ? prevGrade.score : ''
    const noteVal = prevGrade && prevGrade.note ? prevGrade.note : ''

    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</span></td>
      <td>
        <input type="number" class="score-input" data-sid="${r.student_id}" step="0.1" value="${scoreVal}" placeholder="分數" oninput="window.calculateLiveStats()">
      </td>
      <td>
        <input type="text" class="note-input" data-sid="${r.student_id}" value="${noteVal}" placeholder="選填評語">
      </td>
    `
    rosterList.appendChild(tr)
  })

  // 載入完畢後算一次統計
  window.calculateLiveStats()
}

window.closeExamModal = () => examModal.style.display = 'none'

// 4. 即時計算高均低標
window.calculateLiveStats = () => {
  const inputs = document.querySelectorAll('.score-input')
  let total = 0, count = 0, max = -Infinity, min = Infinity
  
  inputs.forEach(inp => {
    if (inp.value !== '') {
      const val = parseFloat(inp.value)
      total += val; count++;
      if (val > max) max = val;
      if (val < min) min = val;
    }
  })

  document.getElementById('stat-avg').textContent = count > 0 ? (total / count).toFixed(1) : '-'
  document.getElementById('stat-high').textContent = count > 0 ? max : '-'
  document.getElementById('stat-low').textContent = count > 0 ? min : '-'
}

// 5. 批次儲存考試與全班成績
window.saveExamData = async () => {
  const examName = document.getElementById('exam_name').value
  const examDate = document.getElementById('exam_date').value
  if (!examName || !examDate) { alert('測驗名稱與日期為必填！'); return }

  btnSaveExam.disabled = true
  btnSaveExam.textContent = '儲存中...'

  try {
    let examId = document.getElementById('exam-id').value
    
    // 準備主檔資料
    const avgText = document.getElementById('stat-avg').textContent
    const highText = document.getElementById('stat-high').textContent
    const lowText = document.getElementById('stat-low').textContent

    const examPayload = {
      class_id: currentClassId,
      exam_name: examName,
      subject: document.getElementById('subject').value || null,
      exam_date: examDate,
      teacher_notice: document.getElementById('teacher_notice').value || null,
      avg_score: avgText !== '-' ? parseFloat(avgText) : 0,
      high_score: highText !== '-' ? parseFloat(highText) : 0,
      low_score: lowText !== '-' ? parseFloat(lowText) : 0
    }

    // A. 儲存/更新測驗主檔
    if (examId) {
      const { error } = await supabase.from('class_exams').update(examPayload).eq('id', examId)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('class_exams').insert([examPayload]).select().single()
      if (error) throw error
      examId = data.id
    }

    // B. 準備學生成績明細
    const inputs = document.querySelectorAll('.score-input')
    const gradePayloads = []
    
    inputs.forEach(inp => {
      const sid = inp.getAttribute('data-sid')
      const scoreStr = inp.value
      const noteStr = document.querySelector(`.note-input[data-sid="${sid}"]`).value
      
      // 有輸入分數才存
      if (scoreStr !== '') {
        gradePayloads.push({
          exam_id: examId,
          student_id: sid,
          score: parseFloat(scoreStr),
          note: noteStr || null
        })
      }
    })

    // C. 刪除舊成績，寫入新成績 (最簡單的覆蓋法)
    await supabase.from('grades').delete().eq('exam_id', examId)
    
    if (gradePayloads.length > 0) {
      const { error: gErr } = await supabase.from('grades').insert(gradePayloads)
      if (gErr) throw gErr
    }

    window.closeExamModal()
    fetchExams() // 重整列表

  } catch (err) {
    alert('儲存失敗：' + err.message)
  } finally {
    btnSaveExam.disabled = false
    btnSaveExam.textContent = '儲存班級成績'
  }
}

// 6. 刪除整筆測驗
window.deleteExam = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？這會連同全班的這筆成績一起刪除喔！`)) return
  await supabase.from('class_exams').delete().eq('id', id)
  fetchExams()
}

// 啟動
loadClasses()

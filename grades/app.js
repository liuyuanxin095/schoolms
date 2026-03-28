import { supabase } from '../config.js'

const gradeList = document.getElementById('grade-list')
const searchInput = document.getElementById('search-input')
const subjectFilter = document.getElementById('subject-filter')

const formModal = document.getElementById('form-modal')
const gradeForm = document.getElementById('grade-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')

const studentSelect = document.getElementById('student_id')
const classSelect = document.getElementById('class_id')

let allGrades = []

// 1. 初始化表單的下拉選單 (學生與班級)
async function initDropdowns() {
  try {
    const { data: students } = await supabase.from('students').select('id, name, student_number').order('name', { ascending: true })
    if (students) {
      studentSelect.innerHTML = '<option value="" disabled selected>請選擇學生</option>'
      students.forEach(s => studentSelect.appendChild(new Option(s.student_number ? `${s.name} (${s.student_number})` : s.name, s.id)))
    }

    const { data: classes } = await supabase.from('classes').select('id, name').order('created_at', { ascending: false })
    if (classes) {
      classSelect.innerHTML = '<option value="">-- 無關聯班級 (學校考試) --</option>'
      classes.forEach(c => classSelect.appendChild(new Option(c.name, c.id)))
    }
  } catch (err) {
    console.error('下拉選單載入失敗:', err)
  }
}

// 2. 讀取成績列表
async function fetchGrades() {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*, students(name, student_number), classes(name)')
      .order('exam_date', { ascending: false }) // 依考試日期新到舊排序
    
    if (error) throw error

    allGrades = data || []
    updateSubjectFilter(allGrades)
    renderTable(allGrades)
  } catch (err) {
    gradeList.innerHTML = `<tr><td colspan="7" style="color:red; text-align: center;">成績載入失敗: ${err.message}</td></tr>`
  }
}

// 動態更新科目篩選器
function updateSubjectFilter(data) {
  const subjects = [...new Set(data.map(g => g.subject))].filter(Boolean)
  const currentVal = subjectFilter.value
  subjectFilter.innerHTML = '<option value="all">所有科目</option>'
  subjects.forEach(sub => subjectFilter.appendChild(new Option(sub, sub)))
  if (subjects.includes(currentVal)) subjectFilter.value = currentVal
}

function renderTable(data) {
  gradeList.innerHTML = ''
  if (data.length === 0) {
    gradeList.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有成績紀錄</td></tr>'
    return
  }

  data.forEach(g => {
    const studentName = g.students ? `<strong>${g.students.name}</strong> <span style="font-size:12px; color:var(--text-light);">${g.students.student_number || ''}</span>` : '<span style="color:red;">未綁定學生</span>'
    const className = g.classes ? g.classes.name : '<span style="color:var(--text-light); font-size:12px;">(學校考試)</span>'
    
    // 分數樣式判斷
    let scoreClass = 'score-normal'
    if (g.score >= 80) scoreClass = 'score-excellent'
    else if (g.score < 60) scoreClass = 'score-warning'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${studentName}</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span>${g.exam_name}</span>
          ${className}
        </div>
      </td>
      <td><span style="background:#e0e7ff; color:var(--primary); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600;">${g.subject}</span></td>
      <td>${g.exam_date || '-'}</td>
      <td><span class="score-badge ${scoreClass}">${g.score}</span></td>
      <td><span class="note-text" title="${g.note || ''}">${g.note || '-'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${g.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除" onclick="window.deleteGrade('${g.id}', '${g.exam_name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    gradeList.appendChild(row)
  })
}

// 3. 搜尋與篩選邏輯
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const subjectVal = subjectFilter.value
  
  const filtered = allGrades.filter(g => {
    const sName = g.students ? g.students.name.toLowerCase() : ''
    const eName = g.exam_name.toLowerCase()
    const matchKeyword = sName.includes(keyword) || eName.includes(keyword)
    const matchSubject = subjectVal === 'all' || g.subject === subjectVal
    return matchKeyword && matchSubject
  })
  
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData)
subjectFilter.addEventListener('change', filterData)

// 4. 開啟表單 (新增/修改)
window.openFormModal = (id = null) => {
  gradeForm.reset(); document.getElementById('grade-id').value = id || ''
  
  if (id) {
    formTitle.textContent = '修改成績紀錄'
    const g = allGrades.find(x => x.id === id)
    if (g) {
      document.getElementById('student_id').value = g.student_id || ''
      document.getElementById('class_id').value = g.class_id || ''
      document.getElementById('exam_name').value = g.exam_name || ''
      document.getElementById('subject').value = g.subject || ''
      document.getElementById('score').value = g.score || ''
      document.getElementById('exam_date').value = g.exam_date || ''
      document.getElementById('note').value = g.note || ''
    }
  } else { 
    formTitle.textContent = '登錄新成績'
    // 預設帶入今天的日期
    document.getElementById('exam_date').value = new Date().toISOString().split('T')[0]
  }
  formModal.style.display = 'flex'
}

window.closeFormModal = () => formModal.style.display = 'none'

// 5. 儲存表單
gradeForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  
  try {
    const id = document.getElementById('grade-id').value
    const gradeData = {
      student_id: document.getElementById('student_id').value,
      class_id: document.getElementById('class_id').value || null,
      exam_name: document.getElementById('exam_name').value,
      subject: document.getElementById('subject').value,
      score: parseFloat(document.getElementById('score').value),
      exam_date: document.getElementById('exam_date').value || null,
      note: document.getElementById('note').value || null
    }

    const { error } = id ? await supabase.from('grades').update(gradeData).eq('id', id) : await supabase.from('grades').insert([gradeData])
    if (error) throw error

    window.closeFormModal()
    fetchGrades()
  } catch (err) {
    alert('儲存失敗：' + err.message)
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = '儲存成績'
  }
})

// 6. 刪除成績
window.deleteGrade = async (id, examName) => {
  if (!confirm(`確定要刪除這筆「${examName}」的成績嗎？`)) return
  await supabase.from('grades').delete().eq('id', id)
  fetchGrades()
}

// 啟動執行
initDropdowns().then(fetchGrades)

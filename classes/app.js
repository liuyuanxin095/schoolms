import { supabase } from '../config.js'

const classList = document.getElementById('class-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')

const formModal = document.getElementById('form-modal')
const classForm = document.getElementById('class-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')

const enrollmentModal = document.getElementById('enrollment-modal')
const addStudentForm = document.getElementById('add-student-form')
const availableGrid = document.getElementById('available-students-grid')
const enrolledList = document.getElementById('enrolled-list')

const semesterModal = document.getElementById('semester-modal')
const semesterForm = document.getElementById('semester-form')
const semesterList = document.getElementById('semester-list')

const branchSelect = document.getElementById('branch_id')
const semesterSelect = document.getElementById('semester')
const scheduleContainer = document.getElementById('schedule-container')

let allClasses = []; let allSemesters = []
let currentManageClassId = null; let currentManageBranchId = null

// 1. 初始化資料 (分校與學期)
async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) {
    branchFilter.innerHTML = '<option value="all">所有分校</option>'; branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    bData.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) })
  }
  await fetchSemesters()
}

// ================= 學期管理邏輯 =================
async function fetchSemesters() {
  const { data } = await supabase.from('semesters').select('*').order('start_date', { ascending: false })
  allSemesters = data || []
  
  // 更新表單下拉選單
  semesterSelect.innerHTML = '<option value="" disabled selected>請選擇學期</option>'
  allSemesters.forEach(s => semesterSelect.appendChild(new Option(s.name, s.name)))
  
  // 更新管理列表
  semesterList.innerHTML = ''
  allSemesters.forEach(s => {
    const item = document.createElement('div')
    item.className = 'enrolled-item'
    item.innerHTML = `<div><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">(${s.start_date} ~ ${s.end_date})</span></div>
                      <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteSemester('${s.id}')"><span class="material-symbols-outlined">delete</span></button>`
    semesterList.appendChild(item)
  })
}

window.openSemesterModal = () => semesterModal.style.display = 'flex'
window.closeSemesterModal = () => semesterModal.style.display = 'none'

semesterForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const sData = { name: document.getElementById('sem-name').value, start_date: document.getElementById('sem-start').value, end_date: document.getElementById('sem-end').value }
  await supabase.from('semesters').insert([sData])
  semesterForm.reset(); await fetchSemesters()
})

window.deleteSemester = async (id) => {
  if(!confirm('確定刪除這個學期嗎？')) return
  await supabase.from('semesters').delete().eq('id', id); await fetchSemesters()
}

// 學期連動日期
window.handleSemesterChange = () => {
  const selected = allSemesters.find(s => s.name === semesterSelect.value)
  if (selected) {
    document.getElementById('start_date').value = selected.start_date
    document.getElementById('end_date').value = selected.end_date
  }
}

// ================= 動態時段邏輯 =================
window.addScheduleRow = (day = '星期一', start = '18:30', end = '21:30') => {
  const row = document.createElement('div')
  row.className = 'schedule-row'
  row.innerHTML = `
    <select class="sch-day">
      ${['星期一','星期二','星期三','星期四','星期五','星期六','星期日'].map(d => `<option value="${d}" ${d===day?'selected':''}>${d}</option>`).join('')}
    </select>
    <input type="time" class="sch-start" value="${start}">
    <span style="color:var(--text-light);">~</span>
    <input type="time" class="sch-end" value="${end}">
    <button type="button" class="btn-icon" style="color:var(--danger);" onclick="this.parentElement.remove()"><span class="material-symbols-outlined">close</span></button>
  `
  scheduleContainer.appendChild(row)
}

function getCompiledSchedule() {
  const rows = Array.from(scheduleContainer.querySelectorAll('.schedule-row'))
  return rows.map(r => {
    const day = r.querySelector('.sch-day').value
    const start = r.querySelector('.sch-start').value
    const end = r.querySelector('.sch-end').value
    if(start && end) return `${day} ${start}~${end}`
    return null
  }).filter(Boolean).join(', ')
}

// ================= 班級主檔邏輯 =================
window.handleBranchChange = async (selTeacher = null, selTutor = null, selRoom = null) => {
  const branchId = branchSelect.value; const ts = document.getElementById('teacher_id'); const tus = document.getElementById('tutor_id'); const rs = document.getElementById('classroom_id')
  ts.innerHTML='<option value="">載入中...</option>'; tus.innerHTML='<option value="">載入中...</option>'; rs.innerHTML='<option value="">載入中...</option>'
  if (!branchId) return
  
  const { data: staff } = await supabase.from('staff').select('id, name, role').eq('branch_id', branchId)
  ts.innerHTML='<option value="">請選擇授課教師 (選填)</option>'; tus.innerHTML='<option value="">請選擇班級導師 (選填)</option>'
  if (staff) staff.forEach(s => {
    if (s.role === 'teacher') ts.appendChild(new Option(s.name, s.id, false, s.id === selTeacher))
    tus.appendChild(new Option(s.name, s.id, false, s.id === selTutor))
  })

  const { data: rooms } = await supabase.from('classrooms').select('id, name').eq('branch_id', branchId).eq('status', '可用')
  rs.innerHTML='<option value="">請選擇上課教室 (選填)</option>'
  if (rooms) rooms.forEach(r => rs.appendChild(new Option(r.name, r.id, false, r.id === selRoom)))
}

async function fetchClasses() {
  const { data, error } = await supabase.from('classes')
    .select('*, branches(name), teacher:staff!teacher_id(name), tutor:staff!tutor_id(name), classrooms(name), class_students(count)')
    .order('created_at', { ascending: false })
  if (!error) { allClasses = data; renderTable(data) }
}

function renderTable(data) {
  classList.innerHTML = ''
  if (data.length === 0) { classList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有班級</td></tr>'; return }
  data.forEach(c => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><div class="table-info-stack"><strong>${c.name}</strong><span class="sub-text">${c.semester || '-'}</span></div></td>
      <td>${c.branches ? c.branches.name : '-'}</td>
      <td><div class="table-info-stack"><span><span class="material-symbols-outlined" style="font-size:14px; color:var(--primary);">school</span> ${c.teacher?.name || '未指派'}</span><span class="sub-text"><span class="material-symbols-outlined" style="font-size:14px;">support_agent</span> 導師: ${c.tutor?.name || '未指派'}</span></div></td>
      <td><div class="table-info-stack"><span>${c.schedule || '-'}</span><span class="sub-text">${c.classrooms?.name || '未指派'}</span></div></td>
      <td style="font-weight: 600; color: ${c.class_students[0].count > 0 ? 'var(--primary)' : 'var(--text-light)'};">${c.class_students[0].count} 人</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="window.openEnrollmentModal('${c.id}', '${c.name}', '${c.branch_id}', '${c.branches?.name}')"><span class="material-symbols-outlined" style="font-size:18px;">group_add</span></button>
          <button class="btn-icon" onclick="window.openFormModal('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteClass('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>`
    classList.appendChild(row)
  })
}

searchInput.addEventListener('input', () => { const k = searchInput.value.toLowerCase(); const b = branchFilter.value; renderTable(allClasses.filter(c => c.name.toLowerCase().includes(k) && (b === 'all' || c.branch_id === b))) })
branchFilter.addEventListener('change', () => { searchInput.dispatchEvent(new Event('input')) })

window.openFormModal = async (id = null) => {
  classForm.reset(); document.getElementById('class-id').value = id || ''; scheduleContainer.innerHTML = ''
  if (id) {
    formTitle.textContent = '修改班級資料'; const c = allClasses.find(x => x.id === id)
    if (c) {
      semesterSelect.value = c.semester || ''; document.getElementById('name').value = c.name || ''; branchSelect.value = c.branch_id || ''
      document.getElementById('start_date').value = c.start_date || ''; document.getElementById('end_date').value = c.end_date || ''
      
      // 解析字串還原時段列 (例如: "星期一 18:30~21:30, 星期三 18:30~21:30")
      if (c.schedule) {
        c.schedule.split(', ').forEach(slot => {
          const [day, time] = slot.split(' '); if(time) { const [st, ed] = time.split('~'); window.addScheduleRow(day, st, ed) }
        })
      } else { window.addScheduleRow() }
      
      if (c.branch_id) await window.handleBranchChange(c.teacher_id, c.tutor_id, c.classroom_id)
    }
  } else { 
    formTitle.textContent = '開立新班級'; window.addScheduleRow() // 預設給一列
  }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

classForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  try {
    const id = document.getElementById('class-id').value
    const classData = {
      semester: semesterSelect.value, branch_id: branchSelect.value, name: document.getElementById('name').value,
      schedule: getCompiledSchedule() || null, start_date: document.getElementById('start_date').value || null, end_date: document.getElementById('end_date').value || null,
      teacher_id: document.getElementById('teacher_id').value || null, tutor_id: document.getElementById('tutor_id').value || null, classroom_id: document.getElementById('classroom_id').value || null
    }
    const { error } = id ? await supabase.from('classes').update(classData).eq('id', id) : await supabase.from('classes').insert([classData])
    if (error) throw error; window.closeFormModal(); fetchClasses()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { submitBtn.disabled = false; submitBtn.textContent = '儲存班級' }
})

window.deleteClass = async (id, name) => {
  if (!confirm(`確定刪除「${name}」？`)) return
  await supabase.from('classes').delete().eq('id', id); fetchClasses()
}

// ================= 視覺化多選入班邏輯 =================
window.openEnrollmentModal = async (classId, className, branchId, branchName) => {
  currentManageClassId = classId; currentManageBranchId = branchId
  document.getElementById('enrollment-class-name').textContent = className; document.getElementById('enrollment-branch-name').textContent = branchName
  enrollmentModal.style.display = 'flex'; await reloadEnrollmentData()
}
window.closeEnrollmentModal = () => { enrollmentModal.style.display = 'none'; fetchClasses() }

async function reloadEnrollmentData() {
  enrolledList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">讀取資料中...</div>'
  availableGrid.innerHTML = '<div style="grid-column: span 2; padding: 20px; text-align: center; color: var(--text-light);">載入可選名單中...</div>'
  try {
    const { data: enrolledRecords } = await supabase.from('class_students').select('id, student_id, students(name, student_number, photo_url)').eq('class_id', currentManageClassId)
    const enrolledIds = enrolledRecords ? enrolledRecords.map(r => r.student_id) : []
    document.getElementById('enrollment-count').textContent = enrolledIds.length

    enrolledList.innerHTML = ''
    if (enrolledRecords && enrolledRecords.length > 0) {
      enrolledRecords.forEach(r => {
        const s = r.students; const av = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
        enrolledList.innerHTML += `<div class="enrolled-item"><div class="student-info-mini"><img src="${av}"><div><strong>${s.name}</strong> ${s.student_number?`<span class="student-number-badge">${s.student_number}</span>`:''}</div></div><button class="btn-icon" style="color: var(--danger); border: none;" onclick="window.removeStudent('${r.id}')"><span class="material-symbols-outlined">person_remove</span> 移除</button></div>`
      })
    } else { enrolledList.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-light);">目前班上沒有學生</div>' }

    const { data: allStudents } = await supabase.from('students').select('id, name, student_number, photo_url').eq('branch_id', currentManageBranchId).order('name', { ascending: true })
    availableGrid.innerHTML = ''
    if (allStudents) {
      const available = allStudents.filter(s => !enrolledIds.includes(s.id))
      if (available.length === 0) availableGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--text-light);">分校所有學生皆已入班</div>'
      else available.forEach(s => {
        const av = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
        availableGrid.innerHTML += `
          <label class="student-select-card">
            <input type="checkbox" name="enroll-student" value="${s.id}">
            <img src="${av}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
            <div><div style="font-weight:600; font-size:14px; color:var(--text-main);">${s.name}</div><div style="font-size:11px; color:var(--text-light);">${s.student_number||'無學號'}</div></div>
          </label>`
      })
    }
  } catch (err) { console.error(err) }
}

addStudentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('batch-add-btn'); btn.disabled = true; btn.textContent = '加入中...'
  const selectedIds = Array.from(document.querySelectorAll('input[name="enroll-student"]:checked')).map(cb => cb.value)
  if (selectedIds.length === 0) { alert('請先勾選要加入的學生'); btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">playlist_add_check</span> 批次加入勾選的學生'; return }
  
  try {
    // 💡 批次寫入資料庫
    const inserts = selectedIds.map(sid => ({ class_id: currentManageClassId, student_id: sid }))
    const { error } = await supabase.from('class_students').insert(inserts)
    if (error) throw error; await reloadEnrollmentData()
  } catch (err) { alert('加入失敗：' + err.message) } 
  finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">playlist_add_check</span> 批次加入勾選的學生' }
})

window.removeStudent = async (recordId) => {
  if (!confirm('確定要把這位學生移出班級嗎？')) return
  await supabase.from('class_students').delete().eq('id', recordId); await reloadEnrollmentData()
}

initData().then(fetchClasses)

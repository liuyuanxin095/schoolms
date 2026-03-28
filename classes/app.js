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
const enrollStudentSelect = document.getElementById('enroll-student-select')
const enrolledList = document.getElementById('enrolled-list')

const branchSelect = document.getElementById('branch_id')
const teacherSelect = document.getElementById('teacher_id')
const tutorSelect = document.getElementById('tutor_id')
const classroomSelect = document.getElementById('classroom_id')

let allClasses = []
let currentManageClassId = null
let currentManageBranchId = null

// 1. 載入分校
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    branchFilter.innerHTML = '<option value="all">所有分校</option>'
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    data.forEach(b => {
      branchFilter.appendChild(new Option(b.name, b.id))
      branchSelect.appendChild(new Option(b.name, b.id))
    })
  }
}

// 2. 動態載入老師與教室
window.handleBranchChange = async (selectedTeacherId = null, selectedTutorId = null, selectedRoomId = null) => {
  const branchId = branchSelect.value
  teacherSelect.innerHTML = '<option value="">載入中...</option>'
  tutorSelect.innerHTML = '<option value="">載入中...</option>'
  classroomSelect.innerHTML = '<option value="">載入中...</option>'
  if (!branchId) return

  const { data: staffList } = await supabase.from('staff').select('id, name, role').eq('branch_id', branchId)
  teacherSelect.innerHTML = '<option value="">請選擇授課教師 (選填)</option>'
  tutorSelect.innerHTML = '<option value="">請選擇班級導師 (選填)</option>'
  
  if (staffList) {
    staffList.forEach(s => {
      if (s.role === 'teacher') teacherSelect.appendChild(new Option(s.name, s.id, false, s.id === selectedTeacherId))
      tutorSelect.appendChild(new Option(s.name, s.id, false, s.id === selectedTutorId))
    })
  }

  const { data: rooms } = await supabase.from('classrooms').select('id, name').eq('branch_id', branchId).eq('status', '可用')
  classroomSelect.innerHTML = '<option value="">請選擇上課教室 (選填)</option>'
  if (rooms) rooms.forEach(r => classroomSelect.appendChild(new Option(r.name, r.id, false, r.id === selectedRoomId)))
}

// 💡 3. 載入班級列表 (修正：明確告訴資料庫要用哪一個外鍵去抓人)
async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *, 
      branches(name), 
      teacher:staff!teacher_id(name), 
      tutor:staff!tutor_id(name), 
      classrooms(name), 
      class_students(count)
    `)
    .order('created_at', { ascending: false })

  if (error) { 
    console.error('讀取班級錯誤:', error)
    classList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return 
  }
  
  allClasses = data || []
  renderTable(allClasses)
}

function renderTable(data) {
  classList.innerHTML = ''
  if (data.length === 0) { classList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有班級資料</td></tr>'; return }

  data.forEach(c => {
    const branchName = c.branches ? c.branches.name : '<span style="color:red;">未綁定</span>'
    const teacherName = c.teacher ? c.teacher.name : '未安排'
    const tutorName = c.tutor ? c.tutor.name : '未安排'
    const roomName = c.classrooms ? c.classrooms.name : '未安排'
    const studentCount = c.class_students[0].count || 0

    const row = document.createElement('tr')
    row.innerHTML = `
      <td>
        <div class="table-info-stack">
          <strong>${c.name}</strong>
          <span class="sub-text">${c.semester || '未設定學期'}</span>
        </div>
      </td>
      <td>${branchName}</td>
      <td>
        <div class="table-info-stack">
          <span><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom; color:var(--primary);">school</span> ${teacherName}</span>
          <span class="sub-text"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">support_agent</span> 導師: ${tutorName}</span>
        </div>
      </td>
      <td>
        <div class="table-info-stack">
          <span>${c.schedule || '-'}</span>
          <span class="sub-text">${roomName}</span>
        </div>
      </td>
      <td style="font-weight: 600; color: ${studentCount > 0 ? 'var(--primary)' : 'var(--text-light)'};">${studentCount} 人</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="管理學生名單" onclick="window.openEnrollmentModal('${c.id}', '${c.name}', '${c.branch_id}', '${branchName}')"><span class="material-symbols-outlined" style="font-size:18px;">group_add</span></button>
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除" onclick="window.deleteClass('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    classList.appendChild(row)
  })
}

// 4. 搜尋與篩選
function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  const filtered = allClasses.filter(c => c.name.toLowerCase().includes(keyword) && (branchId === 'all' || c.branch_id === branchId))
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)

// 5. 新增/修改班級表單
window.openFormModal = async (id = null) => {
  classForm.reset(); document.getElementById('class-id').value = id || ''
  teacherSelect.innerHTML = '<option value="">請先選擇分校</option>'
  tutorSelect.innerHTML = '<option value="">請先選擇分校</option>'
  classroomSelect.innerHTML = '<option value="">請先選擇分校</option>'
  document.querySelectorAll('input[name="schedule"]').forEach(cb => cb.checked = false)
  
  if (id) {
    formTitle.textContent = '修改班級資料'
    const c = allClasses.find(x => x.id === id)
    if (c) {
      document.getElementById('semester').value = c.semester || ''
      document.getElementById('name').value = c.name || ''
      document.getElementById('branch_id').value = c.branch_id || ''
      document.getElementById('start_date').value = c.start_date || ''
      document.getElementById('end_date').value = c.end_date || ''
      
      if (c.schedule) {
        const slots = c.schedule.split(', ')
        slots.forEach(slot => {
          const cb = document.querySelector(`input[name="schedule"][value="${slot}"]`)
          if (cb) cb.checked = true
        })
      }
      if (c.branch_id) await window.handleBranchChange(c.teacher_id, c.tutor_id, c.classroom_id)
    }
  } else { formTitle.textContent = '開立新班級' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

classForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  const checkedSlots = Array.from(document.querySelectorAll('input[name="schedule"]:checked')).map(cb => cb.value).join(', ')
                            
  try {
    const id = document.getElementById('class-id').value
    const classData = {
      semester: document.getElementById('semester').value, branch_id: document.getElementById('branch_id').value, name: document.getElementById('name').value,
      schedule: checkedSlots || null, start_date: document.getElementById('start_date').value || null, end_date: document.getElementById('end_date').value || null,
      teacher_id: document.getElementById('teacher_id').value || null, tutor_id: document.getElementById('tutor_id').value || null, classroom_id: document.getElementById('classroom_id').value || null
    }
    const { error } = id ? await supabase.from('classes').update(classData).eq('id', id) : await supabase.from('classes').insert([classData])
    if (error) throw new Error(error.message)
    window.closeFormModal(); fetchClasses()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { submitBtn.disabled = false; submitBtn.textContent = '儲存班級' }
})

window.deleteClass = async (id, name) => {
  if (!confirm(`確定要刪除班級「${name}」嗎？這會連同移除學生的選課紀錄喔！`)) return
  await supabase.from('classes').delete().eq('id', id); fetchClasses()
}

// 6. 學生入班/選課管理邏輯
window.openEnrollmentModal = async (classId, className, branchId, branchName) => {
  currentManageClassId = classId; currentManageBranchId = branchId
  document.getElementById('enrollment-class-name').textContent = className; document.getElementById('enrollment-branch-name').textContent = branchName
  enrollmentModal.style.display = 'flex'; await reloadEnrollmentData()
}
window.closeEnrollmentModal = () => { enrollmentModal.style.display = 'none'; fetchClasses() }

async function reloadEnrollmentData() {
  enrolledList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">讀取資料中...</div>'
  enrollStudentSelect.innerHTML = '<option value="" disabled selected>載入學生名單中...</option>'
  try {
    const { data: enrolledRecords } = await supabase.from('class_students').select('id, student_id, students(name, student_number, photo_url)').eq('class_id', currentManageClassId)
    const enrolledStudentIds = enrolledRecords ? enrolledRecords.map(r => r.student_id) : []
    document.getElementById('enrollment-count').textContent = enrolledStudentIds.length

    enrolledList.innerHTML = ''
    if (enrolledRecords && enrolledRecords.length > 0) {
      enrolledRecords.forEach(record => {
        const s = record.students; const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
        const numberBadge = s.student_number ? `<span class="student-number-badge">${s.student_number}</span>` : ''
        const item = document.createElement('div'); item.className = 'enrolled-item'
        item.innerHTML = `<div class="student-info-mini"><img src="${avatarUrl}"><div><strong>${s.name}</strong> ${numberBadge}</div></div><button class="btn-icon" style="color: var(--danger); border: none;" onclick="window.removeStudent('${record.id}')"><span class="material-symbols-outlined">person_remove</span> 移除</button>`
        enrolledList.appendChild(item)
      })
    } else { enrolledList.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-light);">目前班上沒有學生</div>' }

    const { data: allBranchStudents } = await supabase.from('students').select('id, name, student_number').eq('branch_id', currentManageBranchId).order('name', { ascending: true })
    enrollStudentSelect.innerHTML = '<option value="" disabled selected>請選擇要加入的學生...</option>'
    if (allBranchStudents) {
      const availableStudents = allBranchStudents.filter(s => !enrolledStudentIds.includes(s.id))
      if (availableStudents.length === 0) enrollStudentSelect.innerHTML = '<option value="" disabled selected>該分校所有學生皆已入班</option>'
      else availableStudents.forEach(s => enrollStudentSelect.appendChild(new Option(s.student_number ? `${s.name} (${s.student_number})` : s.name, s.id)))
    }
  } catch (err) { console.error('讀取名單失敗:', err) }
}

addStudentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const studentId = enrollStudentSelect.value; if (!studentId) return
  try { await supabase.from('class_students').insert([{ class_id: currentManageClassId, student_id: studentId }]); await reloadEnrollmentData() } 
  catch (err) { alert('加入學生失敗：' + err.message) }
})

window.removeStudent = async (recordId) => {
  if (!confirm('確定要把這位學生移出班級嗎？')) return
  try { await supabase.from('class_students').delete().eq('id', recordId); await reloadEnrollmentData() } 
  catch (err) { alert('移除失敗：' + err.message) }
}

loadBranches().then(fetchClasses)

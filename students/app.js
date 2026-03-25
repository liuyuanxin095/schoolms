import { supabase } from '../config.js'

// 綁定 UI 元素
const studentList = document.getElementById('student-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')
const detailModal = document.getElementById('detail-modal')
const formModal = document.getElementById('form-modal')
const attendanceModal = document.getElementById('attendance-modal')
const studentForm = document.getElementById('student-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

let allStudents = []
let existingPhotoUrl = null
let currentCalDate = new Date()
let attUserId = null

// 載入分校
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

// 載入學生
async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*, branches(name)').order('created_at', { ascending: false })
  if (error) return
  allStudents = data || []
  renderTable(allStudents)
}

function renderTable(data) {
  studentList.innerHTML = ''
  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有資料</td></tr>'
    return
  }
  data.forEach(s => {
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
    const branchName = s.branches ? s.branches.name : '<span style="color:#dc2626;">未指定</span>'
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><div style="display:flex; align-items:center; gap:10px;"><img src="${avatarUrl}" class="avatar"><strong>${s.name}</strong></div></td>
      <td>${s.student_number || '-'}</td>
      <td>${branchName}</td>
      <td>${s.school || '-'}</td>
      <td>${s.grade || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="查看考勤" onclick="window.openAttendanceModal('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">calendar_month</span></button>
          <button class="btn-icon" title="詳細資料" onclick="window.viewStudent('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button>
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteStudent('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    studentList.appendChild(row)
  })
}

// 篩選邏輯
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const branchId = branchFilter.value
  const filtered = allStudents.filter(s => {
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData)
branchFilter.addEventListener('change', filterData)

// 【視窗一】詳細資料
window.viewStudent = (id) => {
  const s = allStudents.find(x => x.id === id)
  if (!s) return
  document.getElementById('modal-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
  document.getElementById('modal-name').textContent = s.name
  document.getElementById('modal-branch').textContent = s.branches ? s.branches.name : '未指定'
  document.getElementById('modal-student-no').textContent = s.student_number || '-'
  document.getElementById('modal-id-no').textContent = s.id_number || '-'
  document.getElementById('modal-birthday').textContent = s.birthday || '-'
  document.getElementById('modal-school').textContent = s.school || '-'
  document.getElementById('modal-grade').textContent = s.grade || '-'
  document.getElementById('modal-parent-name').textContent = s.parent_name || '-'
  document.getElementById('modal-phone').textContent = s.parent_phone || '-'
  detailModal.style.display = 'flex'
}
window.closeDetailModal = () => detailModal.style.display = 'none'

// 【視窗二】新增/修改
window.openFormModal = (id = null) => {
  studentForm.reset(); document.getElementById('student-id').value = id || ''; existingPhotoUrl = null; document.getElementById('current-photo-container').style.display = 'none'
  if (id) {
    formTitle.textContent = '修改學生資料'
    const s = allStudents.find(x => x.id === id)
    if (s) {
      document.getElementById('name').value = s.name || ''
      document.getElementById('branch_id').value = s.branch_id || ''
      document.getElementById('student_number').value = s.student_number || ''
      document.getElementById('id_number').value = s.id_number || ''
      document.getElementById('birthday').value = s.birthday || ''
      document.getElementById('school').value = s.school || ''
      document.getElementById('grade').value = s.grade || ''
      document.getElementById('parent_name').value = s.parent_name || ''
      document.getElementById('parent_phone').value = s.parent_phone || ''
      if (s.photo_url) { existingPhotoUrl = s.photo_url; document.getElementById('current-photo-container').style.display = 'flex'; document.getElementById('current-photo-img').src = existingPhotoUrl }
    }
  } else { formTitle.textContent = '新增學生資料' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  try {
    const id = document.getElementById('student-id').value
    let finalPhotoUrl = existingPhotoUrl
    const photoInput = document.getElementById('photo_file')
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileName = `student_${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗')
      finalPhotoUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
    }
    const studentData = {
      branch_id: document.getElementById('branch_id').value, name: document.getElementById('name').value,
      student_number: document.getElementById('student_number').value || null, id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null, school: document.getElementById('school').value || null,
      grade: document.getElementById('grade').value || null, parent_name: document.getElementById('parent_name').value || null,
      parent_phone: document.getElementById('parent_phone').value || null, photo_url: finalPhotoUrl
    }
    const { error } = id ? await supabase.from('students').update(studentData).eq('id', id) : await supabase.from('students').insert([studentData])
    if (error) throw new Error(error.message)
    window.closeFormModal(); fetchStudents()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { submitBtn.disabled = false; submitBtn.textContent = '儲存資料' }
})

window.deleteStudent = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  await supabase.from('students').delete().eq('id', id); fetchStudents()
}

// 💡 【視窗三】考勤日曆邏輯
window.openAttendanceModal = async (id, name) => {
  attUserId = id
  document.getElementById('att-modal-name').textContent = `${name} 的考勤紀錄`
  currentCalDate = new Date()
  await renderCalendar()
  attendanceModal.style.display = 'flex'
}

window.closeAttendanceModal = () => attendanceModal.style.display = 'none'

window.changeMonth = async (offset) => {
  currentCalDate.setMonth(currentCalDate.getMonth() + offset)
  await renderCalendar()
}

async function renderCalendar() {
  const year = currentCalDate.getFullYear()
  const month = currentCalDate.getMonth()
  document.getElementById('cal-month-year').textContent = `${year} 年 ${month + 1} 月`
  
  const pad = (n) => String(n).padStart(2, '0')
  const startOfMonth = `${year}-${pad(month+1)}-01`
  const endOfMonth = `${year}-${pad(month+1)}-${pad(new Date(year, month + 1, 0).getDate())}`
  
  // 抓取該月考勤
  const { data } = await supabase.from('attendance')
    .select('*')
    .eq('student_id', attUserId)
    .gte('record_date', startOfMonth)
    .lte('record_date', endOfMonth)
    
  const recordMap = {}
  if (data) data.forEach(r => recordMap[r.record_date] = r)
  
  const grid = document.getElementById('cal-grid')
  grid.innerHTML = ''
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // 填補月初空白
  for(let i=0; i<firstDay; i++) grid.innerHTML += `<div class="calendar-day empty"></div>`
  
  for(let i=1; i<=daysInMonth; i++) {
    const dateStr = `${year}-${pad(month+1)}-${pad(i)}`
    const hasRecord = recordMap[dateStr] ? 'has-record' : ''
    
    const dayEl = document.createElement('div')
    dayEl.className = `calendar-day ${hasRecord}`
    dayEl.textContent = i
    dayEl.onclick = (e) => {
      document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active'))
      e.target.classList.add('active')
      showAttDetail(dateStr, recordMap[dateStr])
    }
    grid.appendChild(dayEl)
  }
  document.getElementById('att-detail-box').innerHTML = '<div style="color:var(--text-light); text-align:center;">請點選上方日期查看</div>'
}

function showAttDetail(dateStr, record) {
  const box = document.getElementById('att-detail-box')
  if (!record) {
    box.innerHTML = `<div style="text-align:center; color:var(--text-light);">📅 ${dateStr}<br>當日無打卡紀錄</div>`
    return
  }
  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '<span style="color:#9ca3af;">未打卡</span>'
  
  box.innerHTML = `
    <div style="font-weight:bold; margin-bottom:12px; color:var(--primary);">📅 ${dateStr}</div>
    <div class="att-row"><span>進班時間：</span> <strong>${formatTime(record.check_in)}</strong></div>
    <div class="att-row"><span>離班時間：</span> <strong>${formatTime(record.check_out)}</strong></div>
  `
}

// 初始化
loadBranches().then(fetchStudents)

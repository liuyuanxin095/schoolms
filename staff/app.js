import { supabase } from '../config.js'

const staffList = document.getElementById('staff-list')
const searchInput = document.getElementById('search-input')
const roleFilter = document.getElementById('role-filter')
const branchFilter = document.getElementById('branch-filter')

const detailModal = document.getElementById('detail-modal')
const formModal = document.getElementById('form-modal')
const attendanceModal = document.getElementById('attendance-modal')
const staffForm = document.getElementById('staff-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

let allStaff = []
let existingPhotoUrl = null
let currentCalDate = new Date()
let attUserId = null

const roleConfig = { admin: { name: '管理員', class: 'role-admin' }, manager: { name: '主任', class: 'role-manager' }, teacher: { name: '教師', class: 'role-teacher' } }

async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    branchFilter.innerHTML = '<option value="all">所有分校</option>'
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    data.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) })
  }
}

async function fetchStaff() {
  const { data, error } = await supabase.from('staff').select('*, branches(name)').order('created_at', { ascending: false })
  if (error) return
  allStaff = data || []
  renderTable(allStaff)
}

function renderTable(data) {
  staffList.innerHTML = ''
  if (data.length === 0) { staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有資料</td></tr>'; return }
  data.forEach(s => {
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
    const branchName = s.branches ? s.branches.name : '<span style="color:#dc2626;">未指定</span>'
    const roleInfo = roleConfig[s.role] || { name: '未知', class: '' }
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><div style="display:flex; align-items:center; gap:10px;"><img src="${avatarUrl}" class="avatar"><strong>${s.name}</strong></div></td>
      <td>${s.staff_number || '-'}</td>
      <td><span class="role-badge ${roleInfo.class}">${roleInfo.name}</span></td>
      <td>${branchName}</td>
      <td>${s.phone || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="查看考勤" onclick="window.openAttendanceModal('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">calendar_month</span></button>
          <button class="btn-icon" title="人事資料" onclick="window.viewStaff('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button>
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteStaff('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    staffList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const roleId = roleFilter.value; const branchId = branchFilter.value
  const filtered = allStaff.filter(s => {
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.staff_number && s.staff_number.toLowerCase().includes(keyword)) || (s.phone && s.phone.includes(keyword))
    const matchRole = roleId === 'all' || s.role === roleId; const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchRole && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); roleFilter.addEventListener('change', filterData); branchFilter.addEventListener('change', filterData)

// 【視窗一】HR 詳細資料卡
window.viewStaff = (id) => {
  const s = allStaff.find(x => x.id === id); if (!s) return
  const roleInfo = roleConfig[s.role] || { name: '未知', class: '' }
  document.getElementById('modal-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
  document.getElementById('modal-name').textContent = s.name; document.getElementById('modal-role').textContent = roleInfo.name; document.getElementById('modal-role').className = `role-badge ${roleInfo.class}`
  document.getElementById('modal-branch').textContent = s.branches ? s.branches.name : '未指定'; document.getElementById('modal-staff-no').textContent = s.staff_number || '-'
  document.getElementById('modal-id-no').textContent = s.id_number || '-'; document.getElementById('modal-birthday').textContent = s.birthday || '-'; document.getElementById('modal-phone').textContent = s.phone || '-'
  document.getElementById('modal-base-salary').textContent = s.base_salary ? `NT$ ${s.base_salary.toLocaleString()}` : '-'; document.getElementById('modal-hourly-rate').textContent = s.hourly_rate ? `NT$ ${s.hourly_rate.toLocaleString()}` : '-'
  document.getElementById('modal-labor-date').textContent = s.labor_insurance_date || '-'; document.getElementById('modal-labor-amount').textContent = s.labor_insurance_amount ? `- NT$ ${s.labor_insurance_amount}` : '-'
  document.getElementById('modal-health-date').textContent = s.health_insurance_date || '-'; document.getElementById('modal-health-amount').textContent = s.health_insurance_amount ? `- NT$ ${s.health_insurance_amount}` : '-'
  document.getElementById('modal-group-date').textContent = s.group_insurance_date || '-'; detailModal.style.display = 'flex'
}
window.closeDetailModal = () => detailModal.style.display = 'none'

// 【視窗二】新增/修改表單
window.openFormModal = (id = null) => {
  staffForm.reset(); document.getElementById('staff-id').value = id || ''; existingPhotoUrl = null; document.getElementById('current-photo-container').style.display = 'none'
  if (id) {
    formTitle.textContent = '修改教職員 (HR 資料更新)'; const s = allStaff.find(x => x.id === id)
    if (s) {
      document.getElementById('name').value = s.name || ''; document.getElementById('phone').value = s.phone || ''; document.getElementById('staff_number').value = s.staff_number || ''
      document.getElementById('id_number').value = s.id_number || ''; document.getElementById('birthday').value = s.birthday || ''; document.getElementById('branch_id').value = s.branch_id || ''
      document.getElementById('role').value = s.role || 'teacher'; document.getElementById('base_salary').value = s.base_salary || 0; document.getElementById('hourly_rate').value = s.hourly_rate || 0
      document.getElementById('labor_insurance_date').value = s.labor_insurance_date || ''; document.getElementById('labor_insurance_amount').value = s.labor_insurance_amount || 0
      document.getElementById('health_insurance_date').value = s.health_insurance_date || ''; document.getElementById('health_insurance_amount').value = s.health_insurance_amount || 0
      document.getElementById('group_insurance_date').value = s.group_insurance_date || ''
      if (s.photo_url) { existingPhotoUrl = s.photo_url; document.getElementById('current-photo-container').style.display = 'flex'; document.getElementById('current-photo-img').src = existingPhotoUrl }
    }
  } else { formTitle.textContent = '新增教職員 (HR 建檔)' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  try {
    const id = document.getElementById('staff-id').value; let finalPhotoUrl = existingPhotoUrl; const photoInput = document.getElementById('photo_file')
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]; const fileName = `staff_${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗'); finalPhotoUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
    }
    const staffData = {
      photo_url: finalPhotoUrl, name: document.getElementById('name').value, phone: document.getElementById('phone').value || null, staff_number: document.getElementById('staff_number').value || null,
      id_number: document.getElementById('id_number').value || null, birthday: document.getElementById('birthday').value || null, branch_id: document.getElementById('branch_id').value,
      role: document.getElementById('role').value, base_salary: parseInt(document.getElementById('base_salary').value) || 0, hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      labor_insurance_date: document.getElementById('labor_insurance_date').value || null, labor_insurance_amount: parseInt(document.getElementById('labor_insurance_amount').value) || 0,
      health_insurance_date: document.getElementById('health_insurance_date').value || null, health_insurance_amount: parseInt(document.getElementById('health_insurance_amount').value) || 0,
      group_insurance_date: document.getElementById('group_insurance_date').value || null
    }
    const { error } = id ? await supabase.from('staff').update(staffData).eq('id', id) : await supabase.from('staff').insert([staffData])
    if (error) throw new Error(error.message)
    window.closeFormModal(); fetchStaff()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { submitBtn.disabled = false; submitBtn.textContent = '儲存 HR 資料' }
})

window.deleteStaff = async (id, name) => {
  if (!confirm(`確定要解職/刪除「${name}」嗎？`)) return
  await supabase.from('staff').delete().eq('id', id); fetchStaff()
}

// 💡 【視窗三】考勤日曆邏輯 (包含加班時間)
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
  
  const { data } = await supabase.from('attendance').select('*').eq('staff_id', attUserId).gte('record_date', startOfMonth).lte('record_date', endOfMonth)
  const recordMap = {}
  if (data) data.forEach(r => recordMap[r.record_date] = r)
  
  const grid = document.getElementById('cal-grid')
  grid.innerHTML = ''
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
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
  if (!record) { box.innerHTML = `<div style="text-align:center; color:var(--text-light);">📅 ${dateStr}<br>當日無打卡紀錄</div>`; return }
  
  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '<span style="color:#9ca3af;">未打卡</span>'
  
  box.innerHTML = `
    <div style="font-weight:bold; margin-bottom:12px; color:var(--primary);">📅 ${dateStr}</div>
    <div class="att-row"><span>上班時間：</span> <strong>${formatTime(record.check_in)}</strong></div>
    <div class="att-row"><span>下班時間：</span> <strong>${formatTime(record.check_out)}</strong></div>
    <div class="att-row"><span>加班上班：</span> <strong>${formatTime(record.overtime_in)}</strong></div>
    <div class="att-row"><span>加班下班：</span> <strong>${formatTime(record.overtime_out)}</strong></div>
  `
}

loadBranches().then(fetchStaff)

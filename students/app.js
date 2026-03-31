import { supabase } from '../config.js'

const studentList = document.getElementById('student-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')

const formModal = document.getElementById('form-modal')
const studentForm = document.getElementById('student-form')
const branchSelect = document.getElementById('branch_id')

const viewModal = document.getElementById('view-modal')
const attModal = document.getElementById('attendance-modal')
const attHistoryList = document.getElementById('att-history-list')
const leaveModal = document.getElementById('leave-modal')
const leaveForm = document.getElementById('leave-form')

let allStudents = []
let currentViewStudentId = null
let currentPhotoUrl = null // 紀錄目前大頭貼

// 💡 0. 全域客製化視窗系統
window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-dialog')
    document.getElementById('dialog-title').textContent = title
    document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>')
    const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6')
    document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`
    const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm')
    btnCancel.style.display = type === 'confirm' ? 'block' : 'none'
    const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }
    btnConfirm.onclick = () => { cleanup(); resolve(true) }
    btnCancel.onclick = () => { cleanup(); resolve(false) }
    dialog.style.display = 'flex'
  })
}

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) {
    bData.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) })
  }
  await fetchStudents()
}

async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*, branches(name)').order('name', { ascending: true })
  if (error) { studentList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allStudents = data || []; renderTable(allStudents)
}

function renderTable(data) {
  studentList.innerHTML = ''
  if (data.length === 0) { studentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }
  data.forEach(s => {
    const branchName = s.branches ? s.branches.name : '-'
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=eff6ff&color=2563eb`
    
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><img src="${avatarUrl}" class="avatar-sm"></td>
      <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</span></td>
      <td>${branchName}</td>
      <td>${s.parent_name || '-'}</td>
      <td>${s.parent_phone || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="檢視詳細資料" onclick="window.openViewModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button>
          <button class="btn-icon" title="查看考勤與請假" onclick="window.openAttendanceModal('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px; color:var(--primary);">calendar_month</span></button>
          <button class="btn-icon" title="修改資料" onclick="window.openFormModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除學生" onclick="window.deleteStudent('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>`
    studentList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  const filtered = allStudents.filter(s => {
    const matchKey = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKey && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)

// ==========================================
// 💡 檢視學生詳細資料
// ==========================================
window.openViewModal = (id) => {
  const s = allStudents.find(x => x.id === id)
  if (!s) return
  
  document.getElementById('view-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=eff6ff&color=2563eb`
  document.getElementById('view-name').textContent = s.name
  document.getElementById('view-branch').textContent = s.branches ? s.branches.name : '未綁定'
  document.getElementById('view-student-number').textContent = s.student_number || '-'
  document.getElementById('view-school').textContent = s.school || '-'
  document.getElementById('view-phone').textContent = s.phone || '-'
  document.getElementById('view-parent-name').textContent = s.parent_name || '-'
  document.getElementById('view-parent-phone').textContent = s.parent_phone || '-'
  document.getElementById('view-address').textContent = s.address || '-'
  
  viewModal.style.display = 'flex'
}
window.closeViewModal = () => viewModal.style.display = 'none'

// ==========================================
// 💡 新增/編輯學生 (大頭貼上傳)
// ==========================================
window.previewPhoto = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => { document.getElementById('avatar-preview').src = e.target.result }
    reader.readAsDataURL(file)
  }
}

window.openFormModal = (id = null) => {
  studentForm.reset(); document.getElementById('student-id').value = id || ''
  currentPhotoUrl = null
  
  if (id) {
    document.getElementById('form-title').textContent = '修改學生資料'
    const s = allStudents.find(x => x.id === id)
    if (s) {
      currentPhotoUrl = s.photo_url
      document.getElementById('avatar-preview').src = currentPhotoUrl || 'https://via.placeholder.com/60'
      document.getElementById('name').value = s.name || ''; document.getElementById('student_number').value = s.student_number || ''
      document.getElementById('branch_id').value = s.branch_id || ''; document.getElementById('school').value = s.school || ''
      document.getElementById('phone').value = s.phone || ''; document.getElementById('parent_name').value = s.parent_name || ''
      document.getElementById('parent_phone').value = s.parent_phone || ''; document.getElementById('address').value = s.address || ''
    }
  } else { 
    document.getElementById('form-title').textContent = '新增學生'
    document.getElementById('avatar-preview').src = 'https://via.placeholder.com/60'
  }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('student-id').value
    const photoInput = document.getElementById('photo')
    let finalPhotoUrl = currentPhotoUrl

    // 若有上傳新照片，上傳至 supabase storage (avatars bucket)
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    const payload = {
      branch_id: document.getElementById('branch_id').value, name: document.getElementById('name').value,
      student_number: document.getElementById('student_number').value || null, school: document.getElementById('school').value || null,
      phone: document.getElementById('phone').value || null, parent_name: document.getElementById('parent_name').value || null,
      parent_phone: document.getElementById('parent_phone').value || null, address: document.getElementById('address').value || null,
      photo_url: finalPhotoUrl
    }
    
    const { error } = id ? await supabase.from('students').update(payload).eq('id', id) : await supabase.from('students').insert([payload])
    if (error) throw error
    window.closeFormModal(); await fetchStudents()
  } catch (err) { await window.showCustomDialog('錯誤', '儲存失敗：' + err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '儲存' }
})

window.deleteStudent = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定要刪除學生「${name}」嗎？這會移除他所有的考勤、成績與選課紀錄！`, 'confirm', 'help')
  if (!confirmDel) return
  await supabase.from('students').delete().eq('id', id); fetchStudents()
}

// ==========================================
// 💡 個人考勤紀錄邏輯
// ==========================================
window.openAttendanceModal = async (studentId, studentName) => {
  currentViewStudentId = studentId; document.getElementById('att-student-name').textContent = studentName
  attHistoryList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">載入中...</td></tr>'
  attModal.style.display = 'flex'; await loadStudentAttendance()
}
window.closeAttendanceModal = () => attModal.style.display = 'none'

async function loadStudentAttendance() {
  try {
    const { data, error } = await supabase.from('attendance').select('*').eq('student_id', currentViewStudentId).order('record_date', { ascending: false })
    if (error) throw error

    attHistoryList.innerHTML = ''
    if (!data || data.length === 0) { attHistoryList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-light); padding: 20px;">尚無任何考勤或請假紀錄</td></tr>'; return }

    data.forEach(a => {
      const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'
      const inTime = a.check_in ? formatTime(a.check_in) : '-'
      const outTime = a.check_out ? formatTime(a.check_out) : '-'
      
      let statusHtml = '<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-size:12px;">已出席</span>'
      let noteHtml = outTime
      if (a.status === '請假') {
        statusHtml = '<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-size:12px;">已請假</span>'
        noteHtml = `<span style="color:#b45309; font-size:13px;">${a.leave_reason || '無填寫事由'}</span>`
      }

      attHistoryList.innerHTML += `
        <tr>
          <td style="color:var(--text-main); font-weight:600; font-size:14px;">${a.record_date}</td>
          <td>${statusHtml}</td>
          <td style="font-family:monospace; color:var(--text-light);">${a.status === '請假' ? '-' : inTime}</td>
          <td style="font-family:monospace; color:var(--text-light);">${noteHtml}</td>
        </tr>`
    })
  } catch (err) { attHistoryList.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">載入失敗</td></tr>` }
}

// ==========================================
// 💡 登記請假邏輯
// ==========================================
window.openLeaveModal = () => {
  leaveForm.reset(); document.getElementById('leave-date').value = new Date().toISOString().split('T')[0]
  leaveModal.style.display = 'flex'
}
window.closeLeaveModal = () => leaveModal.style.display = 'none'

leaveForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.querySelector('#leave-form button[type="submit"]'); btn.disabled = true; btn.textContent = '登記中...'
  try {
    const leaveDate = document.getElementById('leave-date').value
    const reason = document.getElementById('leave-reason').value

    const payload = { user_type: 'student', student_id: currentViewStudentId, record_date: leaveDate, status: '請假', leave_reason: reason, check_in: null, check_out: null }
    const { error } = await supabase.from('attendance').upsert([payload], { onConflict: 'student_id, record_date' })
    if (error) throw error

    await window.showCustomDialog('登記成功', `已將該生 ${leaveDate} 的狀態設為請假。`, 'alert', 'check_circle')
    window.closeLeaveModal(); await loadStudentAttendance()
  } catch (err) { await window.showCustomDialog('錯誤', '請假登記失敗：' + err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '確認登記' }
})

initData()

import { supabase } from '../config.js'

const staffList = document.getElementById('staff-list')
const searchInput = document.getElementById('search-input')
const statusFilter = document.getElementById('status-filter')
const formModal = document.getElementById('form-modal')
const staffForm = document.getElementById('staff-form')
const branchSelect = document.getElementById('branch_id')
const branchIdsSelect = document.getElementById('branch_ids')

let allStaff = []; let currentPhotoUrl = null

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

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) {
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    branchIdsSelect.innerHTML = ''
    bData.forEach(b => { branchSelect.appendChild(new Option(b.name, b.id)); branchIdsSelect.appendChild(new Option(b.name, b.id)) })
  }
  await fetchStaff()
}

async function fetchStaff() {
  let query = supabase.from('staff').select('*, branches(name)').order('name', { ascending: true })
  const user = window.currentUser
  if (user && (user.role === 'admin' || user.role === 'manager')) query = query.eq('branch_id', user.branch_id)

  const { data, error } = await query
  if (error) { staffList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allStaff = data || []; renderTable(allStaff)
}

function renderTable(data) {
  staffList.innerHTML = ''
  if (data.length === 0) { staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }

  data.forEach(s => {
    const branchName = s.branches ? s.branches.name : '-'
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f1f5f9&color=64748b`
    const isWorking = s.status === '在職' || !s.status;
    const statusIcon = isWorking ? 'check_circle' : 'cancel';
    const statusColor = isWorking ? '#15803d' : '#b91c1c';
    const statusBg = isWorking ? '#dcfce7' : '#fee2e2';
    
    const statusDisplay = `<span style="background:${statusBg}; color:${statusColor}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">${statusIcon}</span>${s.status || '在職'}</span>`

    const row = document.createElement('tr')
    row.innerHTML = `
      <td style="display:flex; align-items:center; gap:10px; padding: 12px 15px;">
        <img src="${avatarUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;">
        <div><strong>${s.name}</strong><div style="font-size:12px; color:var(--text-light);">${s.id_number || ''}</div></div>
      </td>
      <td>${statusDisplay}</td>
      <td>${s.phone || '-'}</td>
      <td>${s.hire_date || '-'}</td>
      <td>${branchName}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="修改資料" onclick="window.openFormModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除" onclick="window.deleteStaff('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    staffList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const statusVal = statusFilter.value
  const filtered = allStaff.filter(s => {
    const matchKey = s.name.toLowerCase().includes(keyword) || (s.phone && s.phone.includes(keyword))
    const matchStatus = statusVal === 'all' || (s.status || '在職') === statusVal
    return matchKey && matchStatus
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); statusFilter.addEventListener('change', filterData)

window.previewPhoto = (event) => {
  const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { document.getElementById('avatar-preview').src = e.target.result }; reader.readAsDataURL(file) }
}

window.openFormModal = (id = null) => {
  staffForm.reset(); document.getElementById('staff-id').value = id || ''; currentPhotoUrl = null
  Array.from(branchIdsSelect.options).forEach(opt => opt.selected = false)

  if (id) {
    document.getElementById('form-title').textContent = '修改人事資料'; const s = allStaff.find(x => x.id === id)
    if (s) {
      currentPhotoUrl = s.photo_url; document.getElementById('avatar-preview').src = currentPhotoUrl || 'https://via.placeholder.com/60'
      document.getElementById('name').value = s.name || ''; document.getElementById('id_number').value = s.id_number || ''
      document.getElementById('branch_id').value = s.branch_id || ''; document.getElementById('hire_date').value = s.hire_date || ''
      document.getElementById('phone').value = s.phone || ''; document.getElementById('status').value = s.status || '在職'
      document.getElementById('base_salary').value = s.base_salary || 0; document.getElementById('hourly_rate').value = s.hourly_rate || 0
      document.getElementById('emergency_contact').value = s.emergency_contact || ''; document.getElementById('emergency_phone').value = s.emergency_phone || ''; document.getElementById('address').value = s.address || ''
      if (s.branch_ids && Array.isArray(s.branch_ids)) Array.from(branchIdsSelect.options).forEach(opt => { if (s.branch_ids.includes(opt.value)) opt.selected = true })
    }
  } else { document.getElementById('form-title').textContent = '新增教職員人事檔案'; document.getElementById('avatar-preview').src = 'https://via.placeholder.com/60' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('staff-id').value; const photoInput = document.getElementById('photo'); let finalPhotoUrl = currentPhotoUrl
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]; const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName); finalPhotoUrl = publicUrlData.publicUrl
    }

    const selectedSecondaryBranches = Array.from(branchIdsSelect.selectedOptions).map(opt => opt.value)
    const payload = {
      branch_id: document.getElementById('branch_id').value, branch_ids: selectedSecondaryBranches, name: document.getElementById('name').value,
      id_number: document.getElementById('id_number').value || null, hire_date: document.getElementById('hire_date').value || null,
      phone: document.getElementById('phone').value || null, status: document.getElementById('status').value,
      base_salary: parseInt(document.getElementById('base_salary').value) || 0, hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      emergency_contact: document.getElementById('emergency_contact').value || null, emergency_phone: document.getElementById('emergency_phone').value || null,
      address: document.getElementById('address').value || null, photo_url: finalPhotoUrl
    }
    const { error } = id ? await supabase.from('staff').update(payload).eq('id', id) : await supabase.from('staff').insert([payload])
    if (error) throw error; window.closeFormModal(); await fetchStaff()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.textContent = '儲存資料' }
})

window.deleteStaff = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定要刪除「${name}」的人事資料嗎？這將會同步撤銷他的系統權限！`, 'confirm', 'warning')
  if (!confirmDel) return; await supabase.from('staff').delete().eq('id', id); fetchStaff()
}

initData()

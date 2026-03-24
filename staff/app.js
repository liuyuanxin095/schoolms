import { supabase } from '../config.js'

// 綁定 UI 元素
const staffList = document.getElementById('staff-list')
const searchInput = document.getElementById('search-input')
const roleFilter = document.getElementById('role-filter')
const branchFilter = document.getElementById('branch-filter')

const detailModal = document.getElementById('detail-modal')
const formModal = document.getElementById('form-modal')
const staffForm = document.getElementById('staff-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

let allStaff = []
let existingPhotoUrl = null

const roleConfig = {
  admin: { name: '管理員', class: 'role-admin' },
  manager: { name: '主任', class: 'role-manager' },
  teacher: { name: '教師', class: 'role-teacher' }
}

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

// 2. 載入教職員
async function fetchStaff() {
  const { data, error } = await supabase.from('staff').select('*, branches(name)').order('created_at', { ascending: false })
  if (error) {
    staffList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }
  allStaff = data || []
  renderTable(allStaff)
}

function renderTable(data) {
  staffList.innerHTML = ''
  if (data.length === 0) {
    staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有教職員資料</td></tr>'
    return
  }

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
          <button class="btn-icon" onclick="window.viewStaff('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button>
          <button class="btn-icon" onclick="window.openFormModal('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteStaff('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    staffList.appendChild(row)
  })
}

// 3. 搜尋篩選
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const roleId = roleFilter.value
  const branchId = branchFilter.value
  const filtered = allStaff.filter(s => {
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.staff_number && s.staff_number.toLowerCase().includes(keyword)) || (s.phone && s.phone.includes(keyword))
    const matchRole = roleId === 'all' || s.role === roleId
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchRole && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData)
roleFilter.addEventListener('change', filterData)
branchFilter.addEventListener('change', filterData)

// 4. 【視窗一】查看 HR 詳細資料卡
window.viewStaff = (id) => {
  const s = allStaff.find(x => x.id === id)
  if (!s) return
  const roleInfo = roleConfig[s.role] || { name: '未知', class: '' }
  
  document.getElementById('modal-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
  document.getElementById('modal-name').textContent = s.name
  document.getElementById('modal-role').textContent = roleInfo.name
  document.getElementById('modal-role').className = `role-badge ${roleInfo.class}`
  document.getElementById('modal-branch').textContent = s.branches ? s.branches.name : '未指定'
  
  document.getElementById('modal-staff-no').textContent = s.staff_number || '-'
  document.getElementById('modal-id-no').textContent = s.id_number || '-'
  document.getElementById('modal-birthday').textContent = s.birthday || '-'
  document.getElementById('modal-phone').textContent = s.phone || '-'
  
  document.getElementById('modal-base-salary').textContent = s.base_salary ? `NT$ ${s.base_salary.toLocaleString()}` : '-'
  document.getElementById('modal-hourly-rate').textContent = s.hourly_rate ? `NT$ ${s.hourly_rate.toLocaleString()}` : '-'

  document.getElementById('modal-labor-date').textContent = s.labor_insurance_date || '-'
  document.getElementById('modal-labor-amount').textContent = s.labor_insurance_amount ? `- NT$ ${s.labor_insurance_amount}` : '-'
  document.getElementById('modal-health-date').textContent = s.health_insurance_date || '-'
  document.getElementById('modal-health-amount').textContent = s.health_insurance_amount ? `- NT$ ${s.health_insurance_amount}` : '-'
  document.getElementById('modal-group-date').textContent = s.group_insurance_date || '-'

  detailModal.style.display = 'flex'
}
window.closeDetailModal = () => detailModal.style.display = 'none'

// 5. 【視窗二】開啟新增/修改表單
window.openFormModal = (id = null) => {
  staffForm.reset()
  document.getElementById('staff-id').value = id || ''
  existingPhotoUrl = null
  document.getElementById('current-photo-container').style.display = 'none'
  
  if (id) {
    formTitle.textContent = '修改教職員 (HR 資料更新)'
    const s = allStaff.find(x => x.id === id)
    if (s) {
      document.getElementById('name').value = s.name || ''
      document.getElementById('phone').value = s.phone || ''
      document.getElementById('staff_number').value = s.staff_number || ''
      document.getElementById('id_number').value = s.id_number || ''
      document.getElementById('birthday').value = s.birthday || ''
      document.getElementById('branch_id').value = s.branch_id || ''
      document.getElementById('role').value = s.role || 'teacher'
      document.getElementById('base_salary').value = s.base_salary || 0
      document.getElementById('hourly_rate').value = s.hourly_rate || 0
      document.getElementById('labor_insurance_date').value = s.labor_insurance_date || ''
      document.getElementById('labor_insurance_amount').value = s.labor_insurance_amount || 0
      document.getElementById('health_insurance_date').value = s.health_insurance_date || ''
      document.getElementById('health_insurance_amount').value = s.health_insurance_amount || 0
      document.getElementById('group_insurance_date').value = s.group_insurance_date || ''
      
      existingPhotoUrl = s.photo_url
      if (existingPhotoUrl) {
        document.getElementById('current-photo-container').style.display = 'flex'
        document.getElementById('current-photo-img').src = existingPhotoUrl
      }
    }
  } else {
    formTitle.textContent = '新增教職員 (HR 建檔)'
  }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

// 6. 表單送出
staffForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.disabled = true; submitBtn.textContent = '處理中...'

  try {
    const id = document.getElementById('staff-id').value
    let finalPhotoUrl = existingPhotoUrl
    const photoInput = document.getElementById('photo_file')
    
    // 圖片上傳
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `staff_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    const staffData = {
      photo_url: finalPhotoUrl,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value || null,
      staff_number: document.getElementById('staff_number').value || null,
      id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null,
      branch_id: document.getElementById('branch_id').value,
      role: document.getElementById('role').value,
      base_salary: parseInt(document.getElementById('base_salary').value) || 0,
      hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      labor_insurance_date: document.getElementById('labor_insurance_date').value || null,
      labor_insurance_amount: parseInt(document.getElementById('labor_insurance_amount').value) || 0,
      health_insurance_date: document.getElementById('health_insurance_date').value || null,
      health_insurance_amount: parseInt(document.getElementById('health_insurance_amount').value) || 0,
      group_insurance_date: document.getElementById('group_insurance_date').value || null
    }

    const { error } = id 
      ? await supabase.from('staff').update(staffData).eq('id', id)
      : await supabase.from('staff').insert([staffData])

    if (error) {
      if (error.code === '23505') throw new Error('身分證字號或人事編號與其他員工重複！')
      throw new Error(error.message)
    }
    
    window.closeFormModal()
    fetchStaff() 

  } catch (err) {
    alert('儲存失敗：' + err.message)
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = '儲存 HR 資料'
  }
})

// 7. 刪除
window.deleteStaff = async (id, name) => {
  if (!confirm(`確定要解職/刪除「${name}」嗎？`)) return
  await supabase.from('staff').delete().eq('id', id)
  fetchStaff()
}

loadBranches().then(fetchStaff)

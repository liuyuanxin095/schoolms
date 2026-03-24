import { supabase } from '../config.js'

const staffList = document.getElementById('staff-list')
const searchInput = document.getElementById('search-input')
const roleFilter = document.getElementById('role-filter')
const branchFilter = document.getElementById('branch-filter')
let allStaff = []

// 角色名稱與樣式對應表
const roleConfig = {
  admin: { name: '管理員', class: 'role-admin' },
  manager: { name: '主任', class: 'role-manager' },
  teacher: { name: '教師', class: 'role-teacher' }
}

// 讀取分校清單 (供篩選器使用)
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    data.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchFilter.appendChild(option)
    })
  }
}

// 讀取教職員名單
async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*, branches(name)')
    .order('created_at', { ascending: false })

  if (error) {
    staffList.innerHTML = `<tr><td colspan="6" style="color: #dc2626; text-align: center;">讀取失敗：${error.message}</td></tr>`
    return
  }

  allStaff = data || []
  renderTable(allStaff)
}

// 渲染表格
function renderTable(data) {
  staffList.innerHTML = ''
  
  if (data.length === 0) {
    staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有符合的教職員資料</td></tr>'
    return
  }

  data.forEach(staff => {
    const avatarUrl = staff.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random&color=fff`
    const branchName = staff.branches ? staff.branches.name : '<span style="color:#dc2626;">未指定</span>'
    const roleInfo = roleConfig[staff.role] || { name: '未知', class: '' }
    
    const row = document.createElement('tr')
    // 表格為了保持清爽，只顯示姓名、員編、職務、分校、電話
    row.innerHTML = `
      <td>
        <div class="staff-info">
          <img src="${avatarUrl}" class="avatar">
          <strong>${staff.name}</strong>
        </div>
      </td>
      <td>${staff.staff_number || '-'}</td>
      <td><span class="role-badge ${roleInfo.class}">${roleInfo.name}</span></td>
      <td>${branchName}</td>
      <td>${staff.phone || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="查看人事資料" onclick="window.viewStaff('${staff.id}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
          </button>
          <a href="./edit.html?id=${staff.id}" class="btn-icon" title="修改資料">
            <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          </a>
          <button class="btn-icon" style="color: var(--danger);" title="刪除" onclick="window.deleteStaff('${staff.id}', '${staff.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    staffList.appendChild(row)
  })
}

// 搜尋與篩選功能
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const roleId = roleFilter.value
  const branchId = branchFilter.value
  
  const filtered = allStaff.filter(s => {
    // 姓名、員編 或 電話
    const matchKeyword = s.name.toLowerCase().includes(keyword) || 
                         (s.staff_number && s.staff_number.toLowerCase().includes(keyword)) ||
                         (s.phone && s.phone.includes(keyword))
    const matchRole = roleId === 'all' || s.role === roleId
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchRole && matchBranch
  })
  
  renderTable(filtered)
}

searchInput.addEventListener('input', filterData)
roleFilter.addEventListener('change', filterData)
branchFilter.addEventListener('change', filterData)

// --- 浮動詳細視窗控制 (HR 資料卡) ---
window.viewStaff = (id) => {
  const s = allStaff.find(x => x.id === id)
  if (!s) return
  
  const roleInfo = roleConfig[s.role] || { name: '未知', class: '' }
  
  // 1. 填寫頭部資訊
  document.getElementById('modal-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
  document.getElementById('modal-name').textContent = s.name
  document.getElementById('modal-role').textContent = roleInfo.name
  document.getElementById('modal-role').className = `role-badge ${roleInfo.class}`
  document.getElementById('modal-branch').textContent = s.branches ? s.branches.name : '未指定分校'
  
  // 2. 填寫基本身分
  document.getElementById('modal-staff-no').textContent = s.staff_number || '未填寫'
  document.getElementById('modal-id-no').textContent = s.id_number || '未填寫'
  document.getElementById('modal-birthday').textContent = s.birthday || '未填寫'
  document.getElementById('modal-phone').textContent = s.phone || '未填寫'
  
  // 3. 填寫薪資設定 (加上 NT$ 符號)
  document.getElementById('modal-base-salary').textContent = s.base_salary ? `NT$ ${s.base_salary.toLocaleString()}` : '未設定'
  document.getElementById('modal-hourly-rate').textContent = s.hourly_rate ? `NT$ ${s.hourly_rate.toLocaleString()}` : '未設定'

  // 4. 填寫保險紀錄 (扣款加上 - 號以示扣除)
  document.getElementById('modal-labor-date').textContent = s.labor_insurance_date || '未加保'
  document.getElementById('modal-labor-amount').textContent = s.labor_insurance_amount ? `- NT$ ${s.labor_insurance_amount}` : '0'
  
  document.getElementById('modal-health-date').textContent = s.health_insurance_date || '未加保'
  document.getElementById('modal-health-amount').textContent = s.health_insurance_amount ? `- NT$ ${s.health_insurance_amount}` : '0'
  
  document.getElementById('modal-group-date').textContent = s.group_insurance_date || '未加保'

  // 顯示視窗
  document.getElementById('detail-modal').style.display = 'flex'
}

window.closeModal = () => {
  document.getElementById('detail-modal').style.display = 'none'
}

// --- 刪除功能 ---
window.deleteStaff = async (id, name) => {
  if (!confirm(`確定要解職/刪除「${name}」的資料嗎？`)) return

  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) alert('刪除失敗：' + error.message)
  else fetchStaff()
}

loadBranches()
fetchStaff()

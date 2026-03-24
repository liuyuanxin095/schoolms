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

// 讀取分校清單
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
    
    // 薪資格式化 (如果有設定才顯示)
    let salaryText = []
    if (staff.base_salary > 0) salaryText.push(`底薪 $${staff.base_salary.toLocaleString()}`)
    if (staff.hourly_rate > 0) salaryText.push(`時薪 $${staff.hourly_rate}`)
    const salaryDisplay = salaryText.length > 0 ? salaryText.join(' / ') : '<span style="color:#9ca3af;">未設定</span>'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td>
        <div class="staff-info">
          <img src="${avatarUrl}" class="avatar">
          <strong>${staff.name}</strong>
        </div>
      </td>
      <td><span class="role-badge ${roleInfo.class}">${roleInfo.name}</span></td>
      <td>${branchName}</td>
      <td>${staff.phone || '-'}</td>
      <td style="font-size: 13px;">${salaryDisplay}</td>
      <td>
        <div class="action-btns">
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

// 篩選功能
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const roleId = roleFilter.value
  const branchId = branchFilter.value
  
  const filtered = allStaff.filter(s => {
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.phone && s.phone.includes(keyword))
    const matchRole = roleId === 'all' || s.role === roleId
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchRole && matchBranch
  })
  
  renderTable(filtered)
}

searchInput.addEventListener('input', filterData)
roleFilter.addEventListener('change', filterData)
branchFilter.addEventListener('change', filterData)

// 刪除功能
window.deleteStaff = async (id, name) => {
  if (!confirm(`確定要解職/刪除「${name}」的資料嗎？`)) return

  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) alert('刪除失敗：' + error.message)
  else fetchStaff()
}

loadBranches()
fetchStaff()

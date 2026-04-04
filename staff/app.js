import { supabase, adminAuthClient } from '../config.js'

const staffList = document.getElementById('staff-list')
const searchInput = document.getElementById('search-input')
const roleFilter = document.getElementById('role-filter')

const formModal = document.getElementById('form-modal')
const staffForm = document.getElementById('staff-form')
const branchSelect = document.getElementById('branch_id')

let allStaff = []
let isEditing = false

// 💡 0. 全域客製化視窗
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

// 1. 初始化資料
async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) {
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    bData.forEach(b => branchSelect.appendChild(new Option(b.name, b.id)))
  }
  await fetchStaff()
}

// 2. 獲取教職員清單
async function fetchStaff() {
  const { data, error } = await supabase.from('staff').select('*, branches(name)').order('name', { ascending: true })
  if (error) { staffList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allStaff = data || []
  renderTable(allStaff)
}

function renderTable(data) {
  staffList.innerHTML = ''
  if (data.length === 0) { staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }

  const roleMap = { 'teacher': '教師', 'admin': '行政/櫃檯', 'manager': '主任/主管' }
  const roleColor = { 'teacher': '#3b82f6', 'admin': '#8b5cf6', 'manager': '#f59e0b' }

  data.forEach(s => {
    const branchName = s.branches ? s.branches.name : '-'
    const roleDisplay = `<span style="background:${roleColor[s.role]}20; color:${roleColor[s.role]}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold;">${roleMap[s.role] || s.role}</span>`
    const emailDisplay = s.email ? `<span style="color:#15803d; font-weight:600;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">check_circle</span> ${s.email}</span>` : '<span style="color:#9ca3af;">尚未建立帳號</span>'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${s.name}</strong></td>
      <td>${emailDisplay}</td>
      <td>${roleDisplay}</td>
      <td>${branchName}</td>
      <td>${s.phone || '-'}</td>
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
  const keyword = searchInput.value.toLowerCase(); const roleVal = roleFilter.value
  const filtered = allStaff.filter(s => {
    const matchKey = s.name.toLowerCase().includes(keyword) || (s.email && s.email.toLowerCase().includes(keyword))
    const matchRole = roleVal === 'all' || s.role === roleVal
    return matchKey && matchRole
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); roleFilter.addEventListener('change', filterData)

// ==========================================
// 💡 3. 新增/編輯教職員 (綁定帳號創建邏輯)
// ==========================================
window.openFormModal = (id = null) => {
  staffForm.reset(); document.getElementById('staff-id').value = id || ''
  isEditing = !!id
  
  if (isEditing) {
    document.getElementById('form-title').textContent = '修改教職員資料'
    const s = allStaff.find(x => x.id === id)
    if (s) {
      document.getElementById('name').value = s.name || ''; document.getElementById('role').value = s.role || 'teacher'
      document.getElementById('branch_id').value = s.branch_id || ''; document.getElementById('phone').value = s.phone || ''
      document.getElementById('email').value = s.email || ''; document.getElementById('id_number').value = s.id_number || ''
      // 編輯模式下，把信箱跟身分證鎖定 (因為 Supabase 無法從前端隨意更改他人密碼，要改只能當事人自己改)
      document.getElementById('email').disabled = true; document.getElementById('id_number').disabled = true;
      document.getElementById('email').title = '帳號已建立，無法更改'; document.getElementById('id_number').title = '密碼請由老師登入後自行更改'
    }
  } else { 
    document.getElementById('form-title').textContent = '新增人員與開通帳號' 
    document.getElementById('email').disabled = false; document.getElementById('id_number').disabled = false;
  }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '帳號開通中...'
  try {
    const id = document.getElementById('staff-id').value
    const email = document.getElementById('email').value.trim()
    const idNumber = document.getElementById('id_number').value.trim()
    let finalAuthId = null

    // 💡 如果是「新增人員」，呼叫 adminAuthClient 建立 Supabase 帳號
    if (!isEditing) {
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: email,
        password: idNumber // 使用身分證字號當作初始密碼
      })
      if (authError) throw new Error('系統帳號建立失敗：' + authError.message)
      finalAuthId = authData.user?.id
    }

    // 準備寫入資料庫的 profile
    const payload = {
      branch_id: document.getElementById('branch_id').value, name: document.getElementById('name').value,
      role: document.getElementById('role').value, phone: document.getElementById('phone').value || null
    }

    if (!isEditing) {
      payload.email = email; payload.id_number = idNumber; payload.auth_id = finalAuthId
    }

    const { error } = isEditing ? await supabase.from('staff').update(payload).eq('id', id) : await supabase.from('staff').insert([payload])
    if (error) throw error

    await window.showCustomDialog('成功', isEditing ? '資料修改成功！' : `成功開通帳號！\n請通知老師使用 ${email} 登入，\n密碼為身分證字號。`, 'alert', 'check_circle')
    window.closeFormModal(); fetchStaff()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = isEditing ? '儲存資料' : '建立帳號並儲存' }
})

window.deleteStaff = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定要刪除「${name}」嗎？這將會導致他無法登入系統！`, 'confirm', 'help')
  if (!confirmDel) return
  await supabase.from('staff').delete().eq('id', id); fetchStaff()
}

// 啟動
initData()

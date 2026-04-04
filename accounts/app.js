import { supabase, adminAuthClient } from '../config.js'

const accountList = document.getElementById('account-list')
const accountModal = document.getElementById('account-modal')
const accountForm = document.getElementById('account-form')
const branchSelect = document.getElementById('branch_id')

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
    bData.forEach(b => branchSelect.appendChild(new Option(b.name, b.id)))
  }
  renderTable()
}

async function renderTable() {
  accountList.innerHTML = '<tr><td colspan="6" style="text-align: center;">載入中...</td></tr>'
  
  // 只抓出有 auth_id 的教職員 (代表有系統帳號)
  const { data: accountStaff, error } = await supabase.from('staff').select('*, branches(name)').not('auth_id', 'is', null).order('name')
  
  if (error || !accountStaff || accountStaff.length === 0) { accountList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">目前尚無已開通的帳號</td></tr>'; return }

  accountList.innerHTML = ''
  const roleMap = { 'teacher': '教師', 'admin': '分校櫃檯', 'manager': '分校主任', 'superadmin': '總管理員' }
  const roleColor = { 'teacher': '#3b82f6', 'admin': '#8b5cf6', 'manager': '#f59e0b', 'superadmin': '#dc2626' }

  accountStaff.forEach(s => {
    const branchName = s.branches ? s.branches.name : '全域'
    const roleDisplay = `<span style="background:${roleColor[s.role] || '#000'}20; color:${roleColor[s.role] || '#000'}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold;">${roleMap[s.role] || s.role}</span>`

    accountList.innerHTML += `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span style="font-weight:600;">${s.email}</span></td>
        <td>${roleDisplay}</td>
        <td>${branchName}</td>
        <td><span style="color:#15803d; font-weight:bold; font-size:12px; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span>正常啟用</span></td>
        <td>
          <button class="btn-icon" style="color:var(--danger);" title="撤銷帳號" onclick="window.revokeAccount('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">no_accounts</span></button>
        </td>
      </tr>`
  })
}

window.openAccountModal = () => { accountForm.reset(); accountModal.style.display = 'flex' }
window.closeAccountModal = () => accountModal.style.display = 'none'

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '開通中...'
  try {
    const name = document.getElementById('acc_name').value.trim()
    const email = document.getElementById('email').value.trim()
    const idNumber = document.getElementById('id_number').value.trim()
    const branchId = document.getElementById('branch_id').value
    const role = document.getElementById('role').value
    
    // 1. 使用 Admin Client 建立登入帳號
    const { data: authData, error: authError } = await adminAuthClient.auth.signUp({ email: email, password: idNumber })
    if (authError) throw new Error('系統帳號建立失敗：' + authError.message)
    
    // 2. 同步建立/更新 Staff 人事資料
    const payload = { auth_id: authData.user.id, email: email, name: name, role: role, branch_id: branchId, id_number: idNumber }
    const { error: insertError } = await supabase.from('staff').upsert([payload], { onConflict: 'email' })
    if (insertError) throw insertError

    await window.showCustomDialog('開通成功', `已成功為 ${name} 開通系統帳號。\n登入信箱：${email}\n預設密碼：${idNumber}`, 'alert', 'check_circle')
    window.closeAccountModal(); await renderTable()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '確認建立帳號' }
})

window.revokeAccount = async (id, name) => {
  const confirm = await window.showCustomDialog('撤銷帳號', `確定要撤銷 ${name} 的系統登入權限嗎？\n(他的人事基本資料仍會保留於 HR 系統中)`, 'confirm', 'warning')
  if (!confirm) return
  await supabase.from('staff').update({ auth_id: null, email: null, role: null }).eq('id', id)
  await renderTable()
}

initData()

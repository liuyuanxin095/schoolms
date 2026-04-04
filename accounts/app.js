import { supabase, adminAuthClient } from '../config.js'

const accountList = document.getElementById('account-list')
const accountModal = document.getElementById('account-modal')
const accountForm = document.getElementById('account-form')
const staffSelect = document.getElementById('staff_id')

let allStaff = []

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>')
    const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`
    const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm')
    btnCancel.style.display = type === 'confirm' ? 'block' : 'none'
    const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }
    btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }
    dialog.style.display = 'flex'
  })
}

async function initData() {
  const { data } = await supabase.from('staff').select('*, branches(name)').order('name', { ascending: true })
  allStaff = data || []
  
  staffSelect.innerHTML = '<option value="" disabled selected>選擇要開通帳號的人員</option>'
  allStaff.filter(s => !s.auth_id).forEach(s => {
    staffSelect.appendChild(new Option(`${s.name} (${s.branches ? s.branches.name : '無分校'})`, s.id))
  })
  
  renderTable()
}

function renderTable() {
  accountList.innerHTML = ''
  const accountStaff = allStaff.filter(s => s.auth_id)
  if (accountStaff.length === 0) { accountList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">目前尚無已開通的帳號</td></tr>'; return }

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
        <td><span style="color:#15803d; font-weight:bold; font-size:12px;">✅ 正常啟用</span></td>
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
    const staffId = document.getElementById('staff_id').value
    const email = document.getElementById('email').value.trim()
    const role = document.getElementById('role').value
    
    const targetStaff = allStaff.find(s => s.id === staffId)
    const initialPassword = targetStaff.id_number || '123456'

    // 1. 使用 Admin Client 偷偷建立帳號
    const { data: authData, error: authError } = await adminAuthClient.auth.signUp({ email: email, password: initialPassword })
    if (authError) throw new Error('系統帳號建立失敗：' + authError.message)
    
    // 2. 將建立的 auth_id 綁定回教職員檔案，並更新他的角色與信箱
    const { error: updateError } = await supabase.from('staff').update({ auth_id: authData.user.id, email: email, role: role }).eq('id', staffId)
    if (updateError) throw updateError

    await window.showCustomDialog('開通成功', `已成功為 ${targetStaff.name} 開通系統帳號。\n登入信箱：${email}\n初始密碼：${initialPassword}`, 'alert', 'check_circle')
    window.closeAccountModal(); await initData()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '確認開通帳號' }
})

// 撤銷帳號 (我們在前端只移除連結，實務上可用 Edge Function 刪除 Auth)
window.revokeAccount = async (id, name) => {
  const confirm = await window.showCustomDialog('撤銷帳號', `確定要撤銷 ${name} 的系統登入權限嗎？`, 'confirm', 'warning')
  if (!confirm) return
  await supabase.from('staff').update({ auth_id: null, email: null, role: null }).eq('id', id)
  await initData()
}

initData()

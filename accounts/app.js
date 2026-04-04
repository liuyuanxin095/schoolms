import { supabase, adminAuthClient } from '../config.js'
const accountList = document.getElementById('account-list'); const accountModal = document.getElementById('account-modal'); const accountForm = document.getElementById('account-form'); const branchSelect = document.getElementById('branch_id');

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => { return new Promise((resolve) => { const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${type==='confirm'?'#f59e0b':type==='error'?'#dc2626':'#3b82f6'};">${icon}</span>`; const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm'); btnCancel.style.display = type === 'confirm' ? 'block' : 'none'; const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }; btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex' }) }

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name'); if (bData) bData.forEach(b => branchSelect.appendChild(new Option(b.name, b.id)))
  renderTable()
}

async function renderTable() {
  const { data: staff, error } = await supabase.from('staff').select('*, branches(name)').not('auth_id', 'is', null).order('name')
  accountList.innerHTML = ''; if (!staff || staff.length === 0) return accountList.innerHTML = '<tr><td colspan="5" style="text-align:center;">尚無帳號</td></tr>'
  const roleMap = { 'teacher':'教師', 'admin':'櫃檯', 'manager':'主任', 'superadmin':'管理員' };
  staff.forEach(s => {
    accountList.innerHTML += `<tr>
      <td><strong>${s.name}</strong> ${s.staff_number ? `<span style="font-size:12px; color:#64748b;">(${s.staff_number})</span>`:''}</td>
      <td>${s.email}</td><td><span style="background:#eff6ff; color:#2563eb; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">${roleMap[s.role]||s.role}</span></td>
      <td>${s.branches?.name||'全域'}</td>
      <td style="display:flex; gap:5px;">
        <button class="btn-icon" style="color:var(--warning);" title="還原密碼" onclick="window.resetPassword('${s.id}', '${s.id_number||''}', '${s.name}')"><span class="material-symbols-outlined">lock_reset</span></button>
        <button class="btn-icon" style="color:var(--danger);" title="刪除帳號" onclick="window.revokeAccount('${s.id}', '${s.name}')"><span class="material-symbols-outlined">delete</span></button>
      </td></tr>`
  })
}

window.openAccountModal = () => { accountForm.reset(); accountModal.style.display = 'flex' }
window.closeAccountModal = () => { accountModal.style.display = 'none' }

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '建立中...'
  try {
    const email = document.getElementById('email').value; const name = document.getElementById('acc_name').value; const branchId = document.getElementById('branch_id').value; const role = document.getElementById('role').value;
    let pwd = document.getElementById('password').value; if(!pwd) pwd = Math.random().toString(36).slice(-8);
    const { data: auth, error: authErr } = await adminAuthClient.auth.signUp({ email, password: pwd }); if (authErr) throw authErr;
    await supabase.from('staff').insert([{ auth_id: auth.user.id, email, name, role, branch_id: branchId }]);
    await window.showCustomDialog('建立成功', `帳號：${email}\n預設密碼：${pwd}\n請妥善保存。`, 'alert', 'check_circle'); window.closeAccountModal(); renderTable();
  } catch(err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.textContent = '建立帳號' }
})

window.revokeAccount = async (id, name) => {
  if (await window.showCustomDialog('確認撤銷', `確定撤銷 ${name} 的系統帳號？`, 'confirm', 'warning')) {
    await supabase.from('staff').update({ auth_id: null, email: null, role: null }).eq('id', id); renderTable()
  }
}

// 💡 密碼還原功能 (需配合後端 Service Role，此處為前端模擬提示)
window.resetPassword = async (staffId, idNumber, name) => {
  let newPwd = idNumber ? idNumber : Math.random().toString(36).slice(-8);
  const msg = idNumber ? `該人員有人事資料，將還原為身分證：\n${newPwd}` : `無人事資料，將產生隨機密碼：\n${newPwd}`;
  if(await window.showCustomDialog('還原密碼', `確定要還原 ${name} 的密碼？\n\n${msg}\n\n(注意：前端無法直接修改他人密碼，需在後端串接 auth.admin 啟用此功能)`, 'confirm', 'lock_reset')){
     /* 實務上在此呼叫 supabase.auth.admin.updateUserById() */
  }
}
initData()

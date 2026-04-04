import { supabase } from '../config.js'

const branchList = document.getElementById('branch-list')
const formModal = document.getElementById('form-modal')
const branchForm = document.getElementById('branch-form')

let allBranches = []

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => { return new Promise((resolve) => { const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>'); const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`; const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm'); btnCancel.style.display = type === 'confirm' ? 'block' : 'none'; const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }; btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex' }) }

async function fetchBranches() {
  const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true })
  if (error) { branchList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allBranches = data || []; renderTable()
}

function renderTable() {
  branchList.innerHTML = ''
  if (allBranches.length === 0) { branchList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }
  allBranches.forEach(b => {
    branchList.innerHTML += `
      <tr>
        <td><strong>${b.name}</strong></td>
        <td>${b.receipt_header || '-'}</td>
        <td>${b.phone || '-'}</td>
        <td>${b.address || '-'}</td>
        <td>
          <button class="btn-icon" onclick="window.openFormModal('${b.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteBranch('${b.id}', '${b.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </td>
      </tr>`
  })
}

window.openFormModal = (id = null) => {
  branchForm.reset(); document.getElementById('branch-id').value = id || ''
  if (id) {
    document.getElementById('form-title').textContent = '修改分校資料'; const b = allBranches.find(x => x.id === id)
    if (b) {
      document.getElementById('name').value = b.name || ''; document.getElementById('receipt_header').value = b.receipt_header || ''
      document.getElementById('phone').value = b.phone || ''; document.getElementById('address').value = b.address || ''
      document.getElementById('receipt_footer').value = b.receipt_footer || ''
    }
  } else { document.getElementById('form-title').textContent = '新增分校' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

branchForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('branch-id').value
    const payload = { name: document.getElementById('name').value, receipt_header: document.getElementById('receipt_header').value || null, phone: document.getElementById('phone').value || null, address: document.getElementById('address').value || null, receipt_footer: document.getElementById('receipt_footer').value || null }
    const { error } = id ? await supabase.from('branches').update(payload).eq('id', id) : await supabase.from('branches').insert([payload])
    if (error) throw error; window.closeFormModal(); await fetchBranches()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.textContent = '儲存' }
})

window.deleteBranch = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定刪除分校「${name}」？此動作將影響該分校所有綁定資料！`, 'confirm', 'warning')
  if (!confirmDel) return; await supabase.from('branches').delete().eq('id', id); fetchBranches()
}

fetchBranches()

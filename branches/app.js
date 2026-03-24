import { supabase } from '../config.js'

const branchList = document.getElementById('branch-list')
const formModal = document.getElementById('form-modal')
const branchForm = document.getElementById('branch-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')

// 讀取分校列表
async function fetchBranches() {
  const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true })
  if (error) {
    branchList.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">${error.message}</td></tr>`
    return
  }
  
  branchList.innerHTML = ''
  if (data.length === 0) {
    branchList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6b7280; padding:30px;">目前沒有資料</td></tr>'
    return
  }

  data.forEach(branch => {
    const createdDate = new Date(branch.created_at).toLocaleDateString('zh-TW')
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${branch.name}</strong></td>
      <td>${branch.address || '-'}</td>
      <td>${branch.phone || '-'}</td>
      <td style="color: var(--text-light);">${createdDate}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="window.openFormModal('${branch.id}')"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
          <button class="btn-icon" style="color: var(--danger);" onclick="window.deleteBranch('${branch.id}', '${branch.name}')"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
        </div>
      </td>
    `
    branchList.appendChild(row)
  })
}

// 開啟表單視窗 (如果有 id 就是修改，沒有就是新增)
window.openFormModal = async (id = null) => {
  branchForm.reset()
  document.getElementById('branch-id').value = id || ''
  
  if (id) {
    formTitle.textContent = '修改分校資料'
    const { data } = await supabase.from('branches').select('*').eq('id', id).single()
    if (data) {
      document.getElementById('name').value = data.name || ''
      document.getElementById('address').value = data.address || ''
      document.getElementById('phone').value = data.phone || ''
    }
  } else {
    formTitle.textContent = '新增分校'
  }
  formModal.style.display = 'flex'
}

window.closeFormModal = () => {
  formModal.style.display = 'none'
}

// 送出表單 (智慧判斷 Insert 或 Update)
branchForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.disabled = true
  submitBtn.textContent = '處理中...'

  const id = document.getElementById('branch-id').value
  const branchData = {
    name: document.getElementById('name').value,
    address: document.getElementById('address').value || null,
    phone: document.getElementById('phone').value || null
  }

  let resultError;
  if (id) {
    // 修改
    const { error } = await supabase.from('branches').update(branchData).eq('id', id)
    resultError = error
  } else {
    // 新增
    const { error } = await supabase.from('branches').insert([branchData])
    resultError = error
  }

  submitBtn.disabled = false
  submitBtn.textContent = '儲存資料'

  if (resultError) {
    alert('儲存失敗：' + resultError.message)
  } else {
    window.closeFormModal()
    fetchBranches()
  }
})

// 刪除
window.deleteBranch = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  await supabase.from('branches').delete().eq('id', id)
  fetchBranches()
}

fetchBranches()

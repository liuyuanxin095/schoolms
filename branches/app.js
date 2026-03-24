import { supabase } from '../config.js'

const branchList = document.getElementById('branch-list')

async function fetchBranches() {
  const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true })

  if (error) {
    branchList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }
  
  branchList.innerHTML = ''

  if (data.length === 0) {
    branchList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">目前沒有分校資料，請先新增分校</td></tr>'
    return
  }

  data.forEach(branch => {
    const createdDate = new Date(branch.created_at).toLocaleDateString('zh-TW')
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${branch.name}</strong></td>
      <td>${branch.address || '<span style="color:#9ca3af;">未填寫</span>'}</td>
      <td>${branch.phone || '<span style="color:#9ca3af;">未填寫</span>'}</td>
      <td style="color: var(--text-light); font-size: 13px;">${createdDate}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-delete" title="刪除分校" onclick="window.deleteBranch('${branch.id}', '${branch.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    branchList.appendChild(row)
  })
}

window.deleteBranch = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？\n⚠️ 警告：這可能會連帶刪除屬於該分校的學生與班級資料！`)) {
    return
  }
  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) alert('刪除失敗：' + error.message)
  else fetchBranches()
}

fetchBranches()

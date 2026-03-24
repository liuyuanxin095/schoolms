import { supabase } from '../config.js'

const classroomList = document.getElementById('classroom-list')
const branchFilter = document.getElementById('branch-filter')
let allClassrooms = []

// 讀取分校供篩選
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

// 讀取教室資料 (關聯分校名稱)
async function fetchClassrooms() {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, branches(name)')
    .order('created_at', { ascending: true })

  if (error) {
    classroomList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }

  allClassrooms = data || []
  renderTable(allClassrooms)
}

function renderTable(data) {
  classroomList.innerHTML = ''
  if (data.length === 0) {
    classroomList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有教室資料</td></tr>'
    return
  }

  data.forEach(room => {
    const branchName = room.branches ? room.branches.name : '<span style="color:red;">未綁定</span>'
    const statusClass = room.status === '可用' ? 'status-active' : 'status-maintenance'
    
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${room.name}</strong></td>
      <td>${branchName}</td>
      <td>${room.capacity} 人</td>
      <td style="color: #6b7280; font-size: 13px;">${room.facilities || '-'}</td>
      <td><span class="status-badge ${statusClass}">${room.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" style="color: var(--danger);" title="刪除教室" onclick="window.deleteClassroom('${room.id}', '${room.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    classroomList.appendChild(row)
  })
}

// 篩選邏輯
branchFilter.addEventListener('change', () => {
  const branchId = branchFilter.value
  const filtered = branchId === 'all' ? allClassrooms : allClassrooms.filter(r => r.branch_id === branchId)
  renderTable(filtered)
})

// 刪除邏輯
window.deleteClassroom = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  const { error } = await supabase.from('classrooms').delete().eq('id', id)
  if (error) alert('刪除失敗：' + error.message)
  else fetchClassrooms()
}

loadBranches()
fetchClassrooms()

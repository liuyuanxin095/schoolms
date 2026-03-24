import { supabase } from '../config.js'

const classroomList = document.getElementById('classroom-list')
const branchFilter = document.getElementById('branch-filter')
const formModal = document.getElementById('form-modal')
const classroomForm = document.getElementById('classroom-form')
const formTitle = document.getElementById('form-title')
const branchSelect = document.getElementById('branch_id')
const submitBtn = document.getElementById('submit-btn')

let allClassrooms = []
let allBranches = []

// 載入分校
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    allBranches = data
    branchFilter.innerHTML = '<option value="all">所有分校</option>'
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    data.forEach(b => {
      branchFilter.appendChild(new Option(b.name, b.id))
      branchSelect.appendChild(new Option(b.name, b.id))
    })
  }
}

// 載入教室
async function fetchClassrooms() {
  const { data, error } = await supabase.from('classrooms').select('*, branches(name)').order('created_at', { ascending: true })
  if (error) return console.error(error)
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
      <td>${room.capacity || 0} 人</td>
      <td style="color: #6b7280; font-size: 13px;">${room.facilities || '-'}</td>
      <td><span class="status-badge ${statusClass}">${room.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="window.openFormModal('${room.id}')"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
          <button class="btn-icon" style="color: var(--danger);" onclick="window.deleteClassroom('${room.id}', '${room.name}')"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
        </div>
      </td>
    `
    classroomList.appendChild(row)
  })
}

// 篩選
branchFilter.addEventListener('change', () => {
  const filtered = branchFilter.value === 'all' ? allClassrooms : allClassrooms.filter(r => r.branch_id === branchFilter.value)
  renderTable(filtered)
})

// 開啟表單
window.openFormModal = async (id = null) => {
  classroomForm.reset()
  document.getElementById('classroom-id').value = id || ''
  
  if (id) {
    formTitle.textContent = '修改教室空間'
    const room = allClassrooms.find(r => r.id === id)
    if (room) {
      document.getElementById('branch_id').value = room.branch_id || ''
      document.getElementById('name').value = room.name || ''
      document.getElementById('capacity').value = room.capacity || 0
      document.getElementById('facilities').value = room.facilities || ''
      document.getElementById('status').value = room.status || '可用'
    }
  } else {
    formTitle.textContent = '新增教室空間'
  }
  formModal.style.display = 'flex'
}

window.closeFormModal = () => formModal.style.display = 'none'

// 表單送出
classroomForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.disabled = true; submitBtn.textContent = '處理中...'

  const id = document.getElementById('classroom-id').value
  const roomData = {
    branch_id: document.getElementById('branch_id').value,
    name: document.getElementById('name').value,
    capacity: parseInt(document.getElementById('capacity').value) || 0,
    facilities: document.getElementById('facilities').value || null,
    status: document.getElementById('status').value
  }

  const { error } = id ? await supabase.from('classrooms').update(roomData).eq('id', id) : await supabase.from('classrooms').insert([roomData])

  submitBtn.disabled = false; submitBtn.textContent = '儲存資料'
  if (error) alert('儲存失敗：' + error.message)
  else { window.closeFormModal(); fetchClassrooms() }
})

// 刪除
window.deleteClassroom = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  await supabase.from('classrooms').delete().eq('id', id)
  fetchClassrooms()
}

loadBranches().then(fetchClassrooms)

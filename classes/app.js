import { supabase } from '../config.js'

const classList = document.getElementById('class-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')

const formModal = document.getElementById('form-modal')
const classForm = document.getElementById('class-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')

const branchSelect = document.getElementById('branch_id')
const teacherSelect = document.getElementById('teacher_id')
const classroomSelect = document.getElementById('classroom_id')

let allClasses = []

// 1. 載入分校
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    branchFilter.innerHTML = '<option value="all">所有分校</option>'
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    data.forEach(b => {
      branchFilter.appendChild(new Option(b.name, b.id))
      branchSelect.appendChild(new Option(b.name, b.id))
    })
  }
}

// 2. 根據分校，動態載入該分校的「老師」與「教室」
window.handleBranchChange = async (selectedTeacherId = null, selectedRoomId = null) => {
  const branchId = branchSelect.value
  teacherSelect.innerHTML = '<option value="">載入中...</option>'
  classroomSelect.innerHTML = '<option value="">載入中...</option>'

  if (!branchId) return

  // 抓老師 (過濾條件: 該分校 + 角色是 teacher)
  const { data: teachers } = await supabase.from('staff').select('id, name').eq('branch_id', branchId).eq('role', 'teacher')
  teacherSelect.innerHTML = '<option value="">請選擇授課教師 (選填)</option>'
  if (teachers) {
    teachers.forEach(t => {
      const opt = new Option(t.name, t.id)
      if (t.id === selectedTeacherId) opt.selected = true
      teacherSelect.appendChild(opt)
    })
  }

  // 抓教室 (過濾條件: 該分校 + 可用狀態)
  const { data: rooms } = await supabase.from('classrooms').select('id, name').eq('branch_id', branchId).eq('status', '可用')
  classroomSelect.innerHTML = '<option value="">請選擇上課教室 (選填)</option>'
  if (rooms) {
    rooms.forEach(r => {
      const opt = new Option(r.name, r.id)
      if (r.id === selectedRoomId) opt.selected = true
      classroomSelect.appendChild(opt)
    })
  }
}

// 3. 載入班級列表 (利用強大的關聯查詢，把分校、老師、教室名字一次抓回來)
async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      branches(name),
      staff(name),
      classrooms(name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    classList.innerHTML = `<tr><td colspan="7" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }
  allClasses = data || []
  renderTable(allClasses)
}

function renderTable(data) {
  classList.innerHTML = ''
  if (data.length === 0) {
    classList.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有班級資料</td></tr>'
    return
  }

  data.forEach(c => {
    const branchName = c.branches ? c.branches.name : '<span style="color:red;">未綁定</span>'
    const teacherName = c.staff ? c.staff.name : '<span style="color:#9ca3af;">尚未安排</span>'
    const roomName = c.classrooms ? c.classrooms.name : '<span style="color:#9ca3af;">尚未安排</span>'
    
    // 組合開課期間
    const period = (c.start_date || c.end_date) 
      ? `${c.start_date || '?'} ~ ${c.end_date || '?'}` 
      : '<span style="color:#9ca3af;">未定</span>'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${branchName}</td>
      <td style="color: #059669; font-weight: 500;">${teacherName}</td>
      <td>${roomName}</td>
      <td style="font-size: 13px;">${c.schedule || '-'}</td>
      <td style="font-size: 13px;">${period}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除" onclick="window.deleteClass('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    classList.appendChild(row)
  })
}

// 4. 搜尋與篩選
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const branchId = branchFilter.value
  const filtered = allClasses.filter(c => {
    const matchKeyword = c.name.toLowerCase().includes(keyword)
    const matchBranch = branchId === 'all' || c.branch_id === branchId
    return matchKeyword && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData)
branchFilter.addEventListener('change', filterData)

// 5. 【視窗】開啟新增/修改表單
window.openFormModal = async (id = null) => {
  classForm.reset()
  document.getElementById('class-id').value = id || ''
  
  // 初始化下拉選單
  teacherSelect.innerHTML = '<option value="">請先選擇分校</option>'
  classroomSelect.innerHTML = '<option value="">請先選擇分校</option>'
  
  if (id) {
    formTitle.textContent = '修改班級資料'
    const c = allClasses.find(x => x.id === id)
    if (c) {
      document.getElementById('name').value = c.name || ''
      document.getElementById('branch_id').value = c.branch_id || ''
      document.getElementById('schedule').value = c.schedule || ''
      document.getElementById('start_date').value = c.start_date || ''
      document.getElementById('end_date').value = c.end_date || ''
      
      // 觸發連動載入，並帶入原本儲存的老師跟教室 ID
      if (c.branch_id) {
        await window.handleBranchChange(c.teacher_id, c.classroom_id)
      }
    }
  } else {
    formTitle.textContent = '開立新班級'
  }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

// 6. 表單送出
classForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.disabled = true; submitBtn.textContent = '處理中...'

  try {
    const id = document.getElementById('class-id').value
    const classData = {
      branch_id: document.getElementById('branch_id').value,
      name: document.getElementById('name').value,
      schedule: document.getElementById('schedule').value || null,
      start_date: document.getElementById('start_date').value || null,
      end_date: document.getElementById('end_date').value || null,
      teacher_id: document.getElementById('teacher_id').value || null,
      classroom_id: document.getElementById('classroom_id').value || null
    }

    const { error } = id 
      ? await supabase.from('classes').update(classData).eq('id', id)
      : await supabase.from('classes').insert([classData])

    if (error) throw new Error(error.message)
    
    window.closeFormModal()
    fetchClasses()

  } catch (err) {
    alert('儲存失敗：' + err.message)
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = '儲存班級'
  }
})

// 7. 刪除
window.deleteClass = async (id, name) => {
  if (!confirm(`確定要刪除班級「${name}」嗎？`)) return
  await supabase.from('classes').delete().eq('id', id)
  fetchClasses()
}

// 初始化
loadBranches().then(fetchClasses)

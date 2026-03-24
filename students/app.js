import { supabase } from '../config.js'

const studentList = document.getElementById('student-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')
let allStudents = [] // 儲存所有資料供篩選使用

// 讀取分校清單供篩選器使用
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

// 讀取學生名單 (包含關聯的分校名稱)
async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*, branches(name)') // 關鍵：把分校名稱關聯進來
    .order('created_at', { ascending: false })

  if (error) return console.error(error)
  allStudents = data || []
  renderTable(allStudents)
}

// 渲染表格 (並處理篩選邏輯)
function renderTable(data) {
  studentList.innerHTML = ''
  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280;">沒有符合的學生資料</td></tr>'
    return
  }

  data.forEach(student => {
    const avatarUrl = student.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff`
    const branchName = student.branches ? student.branches.name : '未指定'
    
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>
        <div class="student-info">
          <img src="${avatarUrl}" class="avatar">
          <strong>${student.name}</strong>
        </div>
      </td>
      <td>${student.student_number || '-'}</td>
      <td>${branchName}</td>
      <td>${student.school || '-'}</td>
      <td>${student.grade || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="查看詳細" onclick="window.viewStudent('${student.id}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
          </button>
          <a href="./edit.html?id=${student.id}" class="btn-icon" title="修改資料">
            <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          </a>
        </div>
      </td>
    `
    studentList.appendChild(row)
  })
}

// 篩選功能綁定
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const branchId = branchFilter.value
  
  const filtered = allStudents.filter(s => {
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    return matchKeyword && matchBranch
  })
  renderTable(filtered)
}

searchInput.addEventListener('input', filterData)
branchFilter.addEventListener('change', filterData)

// 浮動視窗控制 (掛載到 window 供 HTML 呼叫)
window.viewStudent = (id) => {
  const s = allStudents.find(x => x.id === id)
  if (!s) return
  
  document.getElementById('modal-avatar').src = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`
  document.getElementById('modal-name').textContent = s.name
  document.getElementById('modal-branch').textContent = s.branches ? s.branches.name : '未指定分校'
  document.getElementById('modal-student-no').textContent = s.student_number || '未填寫'
  document.getElementById('modal-id-no').textContent = s.id_number || '未填寫'
  document.getElementById('modal-birthday').textContent = s.birthday || '未填寫'
  document.getElementById('modal-school').textContent = s.school || '未填寫'
  document.getElementById('modal-grade').textContent = s.grade || '未填寫'
  document.getElementById('modal-parent').textContent = s.parent_name || '未填寫'
  document.getElementById('modal-phone').textContent = s.parent_phone || '未填寫'
  
  document.getElementById('detail-modal').style.display = 'flex'
}

window.closeModal = () => {
  document.getElementById('detail-modal').style.display = 'none'
}

loadBranches()
fetchStudents()

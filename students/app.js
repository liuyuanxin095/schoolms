import { supabase } from '../config.js'

// 綁定 UI 元素
const loadBtn = document.getElementById('load-btn')
const studentList = document.getElementById('student-list')
const addForm = document.getElementById('add-student-form')
const submitBtn = document.getElementById('submit-btn')

// --- 功能 1：讀取學生名單 ---
async function fetchStudents() {
  studentList.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; color: #6b7280; padding: 30px 0;">
        <span class="material-symbols-outlined" style="font-size: 32px; display: block; margin-bottom: 10px; opacity: 0.5;">hourglass_empty</span>
        資料載入中...
      </td>
    </tr>`

  // 加上 .order() 讓最新的資料排在最上面
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false })

  if (error) {
    studentList.innerHTML = `<tr><td colspan="4" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }

  studentList.innerHTML = ''

  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6b7280;">目前沒有學生資料</td></tr>'
    return
  }

  data.forEach(student => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${student.name}</strong></td>
      <td>${student.school_grade || '<span style="color:#9ca3af;">-</span>'}</td>
      <td>${student.parent_name || '<span style="color:#9ca3af;">-</span>'}</td>
      <td>${student.parent_phone || '<span style="color:#9ca3af;">-</span>'}</td>
    `
    studentList.appendChild(row)
  })
}

// --- 功能 2：新增學生資料 ---
async function addStudent(event) {
  // 防止表單預設的重整頁面行為
  event.preventDefault()
  
  // 讓按鈕變為讀取狀態，避免重複點擊
  const originalBtnText = submitBtn.innerHTML
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  // 取得使用者輸入的值
  const name = document.getElementById('name').value
  const school_grade = document.getElementById('school_grade').value
  const parent_name = document.getElementById('parent_name').value
  const parent_phone = document.getElementById('parent_phone').value
  
  // 寫入資料庫
  const { error } = await supabase.from('students').insert([
    {
      name: name,
      school_grade: school_grade,
      parent_name: parent_name,
      parent_phone: parent_phone,
      // 這裡填入我們測試資料中「台北站前總校」的 UUID
      branch_id: '11111111-1111-1111-1111-111111111111' 
    }
  ])

  // 恢復按鈕狀態
  submitBtn.innerHTML = originalBtnText
  submitBtn.disabled = false

  if (error) {
    alert('新增失敗：' + error.message)
    return
  }

  // 新增成功後：清空表單，並重新載入列表
  addForm.reset()
  fetchStudents()
}

// --- 初始化與事件綁定 ---
loadBtn.addEventListener('click', fetchStudents)
addForm.addEventListener('submit', addStudent)

// 網頁載入時自動執行一次撈取資料
fetchStudents()

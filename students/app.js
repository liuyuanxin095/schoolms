// 注意這裡的路徑：使用 '../' 回到上一層目錄，讀取共用的 config.js
import { supabase } from '../config.js'

const loadBtn = document.getElementById('load-btn')
const studentList = document.getElementById('student-list')

async function fetchStudents() {
  studentList.innerHTML = '<tr><td colspan="4" style="text-align: center;">資料載入中...</td></tr>'

  const { data, error } = await supabase.from('students').select('*')

  if (error) {
    studentList.innerHTML = `<tr><td colspan="4" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }

  studentList.innerHTML = ''

  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="4" style="text-align: center;">目前沒有學生資料</td></tr>'
    return
  }

  data.forEach(student => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${student.name}</td>
      <td>${student.school_grade || '未填寫'}</td>
      <td>${student.parent_name || '未填寫'}</td>
      <td>${student.parent_phone || '未填寫'}</td>
    `
    studentList.appendChild(row)
  })
}

// 綁定按鈕，並在畫面第一次載入時就自動去抓取資料
loadBtn.addEventListener('click', fetchStudents)
fetchStudents()

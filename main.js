// 引入剛剛寫好的資料庫連線
import { supabase } from './supabaseClient.js'

// 抓取畫面上的按鈕與表格主體
const loadBtn = document.getElementById('load-btn')
const studentList = document.getElementById('student-list')

// 建立一個非同步函數來撈取資料
async function fetchStudents() {
  // 1. 點擊後先顯示載入中
  studentList.innerHTML = '<tr><td colspan="4" style="text-align: center;">資料載入中...</td></tr>'

  // 2. 向 Supabase 發出請求，撈取 students 資料表的所有欄位
  const { data, error } = await supabase
    .from('students')
    .select('*')

  // 3. 錯誤處理
  if (error) {
    console.error('讀取錯誤:', error)
    studentList.innerHTML = '<tr><td colspan="4" style="color:red; text-align: center;">載入失敗，請檢查 Console 錯誤訊息</td></tr>'
    return
  }

  // 4. 清空表格
  studentList.innerHTML = ''

  // 5. 如果沒有資料
  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="4" style="text-align: center;">目前沒有學生資料</td></tr>'
    return
  }

  // 6. 將抓到的資料一筆一筆轉換成表格列 (tr)
  data.forEach(student => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${student.name}</td>
      <td>${student.school_grade || '未填寫'}</td>
      <td>${student.parent_name || '未填寫'}</td>
      <td>${student.parent_phone || '未填寫'}</td>
    `
    // 把這一列塞進表格裡
    studentList.appendChild(row)
  })
}

// 將按鈕綁定點擊事件，點擊時執行 fetchStudents 函數
loadBtn.addEventListener('click', fetchStudents)

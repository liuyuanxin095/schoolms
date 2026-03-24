import { supabase } from '../config.js'

const studentList = document.getElementById('student-list')

// 讀取名單
async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false })

  if (error) {
    studentList.innerHTML = `<tr><td colspan="7" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`
    return
  }
  studentList.innerHTML = ''

  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6b7280;">目前沒有學生資料</td></tr>'
    return
  }

  data.forEach(student => {
    // 若沒有照片，用 ui-avatars 產生姓名縮寫圖示
    const avatarUrl = student.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff`
    
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>
        <div class="student-info">
          <img src="${avatarUrl}" alt="照片" class="avatar">
          <strong>${student.name}</strong>
        </div>
      </td>
      <td>${student.id_number || '-'}</td>
      <td>${student.birthday || '-'}</td>
      <td>${student.school || '-'}</td>
      <td>${student.grade || '-'}</td>
      <td>
        ${student.parent_name || '未填寫'}<br>
        <span style="font-size: 12px; color: #6b7280;">${student.parent_phone || ''}</span>
      </td>
      <td>
        <div class="action-btns">
          <a href="./edit.html?id=${student.id}" class="btn-icon" title="修改資料">
            <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          </a>
          <button class="btn-icon btn-delete" title="刪除學生" onclick="window.deleteStudent('${student.id}', '${student.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    studentList.appendChild(row)
  })
}

// 刪除學生功能 (掛載到 window 以便 HTML onClick 呼叫)
window.deleteStudent = async (id, name) => {
  // 跳出系統確認視窗
  if (!confirm(`確定要刪除學生「${name}」的資料嗎？這項操作無法復原。`)) {
    return
  }

  const { error } = await supabase.from('students').delete().eq('id', id)
  
  if (error) {
    alert('刪除失敗：' + error.message)
  } else {
    // 刪除成功後重新整理列表
    fetchStudents()
  }
}

fetchStudents()

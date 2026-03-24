import { supabase } from '../config.js'

const studentList = document.getElementById('student-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')
let allStudents = [] // 儲存所有資料供篩選使用

// 1. 讀取分校清單 (供篩選器下拉選單使用)
async function loadBranches() {
  const { data, error } = await supabase.from('branches').select('id, name')
  if (error) {
    console.error('載入分校篩選器失敗:', error)
    return
  }
  if (data) {
    data.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchFilter.appendChild(option)
    })
  }
}

// 2. 讀取學生名單 (包含關聯的分校名稱)
async function fetchStudents() {
  // 嘗試撈取資料與關聯的分校名稱
  const { data, error } = await supabase
    .from('students')
    .select('*, branches(name)') 
    .order('created_at', { ascending: false })

  // 【除錯神器】如果有錯誤，直接把紅字印在表格畫面上！
  if (error) {
    console.error('Supabase 讀取錯誤詳細資訊:', error)
    studentList.innerHTML = `
      <tr>
        <td colspan="6" style="color: #dc2626; text-align: center; padding: 30px; line-height: 1.6;">
          <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 10px;">error</span><br>
          <strong>資料庫讀取失敗！</strong><br>
          錯誤訊息：${error.message}<br>
          <span style="font-size: 13px; color: #6b7280;">(如果是 Could not find a relation，代表資料庫的外鍵關聯遺失了)</span>
        </td>
      </tr>`
    return
  }

  // 成功撈到資料，交給渲染函數處理
  allStudents = data || []
  renderTable(allStudents)
}

// 3. 渲染表格畫面
function renderTable(data) {
  studentList.innerHTML = ''
  
  // 如果資料是空的
  if (data.length === 0) {
    studentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有符合的學生資料</td></tr>'
    return
  }

  // 將資料一筆一筆產生成 tr 列
  data.forEach(student => {
    // 處理照片與分校名稱的預設值 (避免舊資料沒有分校導致畫面壞掉)
    const avatarUrl = student.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff`
    const branchName = student.branches ? student.branches.name : '<span style="color:#dc2626;">未指定</span>'
    
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
          <button class="btn-icon btn-delete" title="刪除學生" onclick="window.deleteStudent('${student.id}', '${student.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    studentList.appendChild(row)
  })
}

// 4. 搜尋與篩選邏輯
function filterData() {
  const keyword = searchInput.value.toLowerCase()
  const branchId = branchFilter.value
  
  const filtered = allStudents.filter(s => {
    // 檢查姓名或學號是否包含關鍵字
    const matchKeyword = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    // 檢查分校是否符合 (all 代表不限制)
    const matchBranch = branchId === 'all' || s.branch_id === branchId
    
    return matchKeyword && matchBranch
  })
  
  renderTable(filtered)
}

// 綁定輸入框與下拉選單的變動事件
searchInput.addEventListener('input', filterData)
branchFilter.addEventListener('change', filterData)

// 5. 浮動詳細視窗控制 (掛載到 window 供 HTML 裡的 onclick 呼叫)
window.viewStudent = (id) => {
  const s = allStudents.find(x => x.id === id)
  if (!s) return
  
  // 填入詳細資料
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
  
  // 顯示視窗
  document.getElementById('detail-modal').style.display = 'flex'
}

// 關閉視窗
window.closeModal = () => {
  document.getElementById('detail-modal').style.display = 'none'
}

// 6. 刪除學生功能 (掛載到 window)
window.deleteStudent = async (id, name) => {
  if (!confirm(`確定要刪除學生「${name}」的資料嗎？這項操作無法復原。`)) return

  const { error } = await supabase.from('students').delete().eq('id', id)
  
  if (error) {
    alert('刪除失敗：' + error.message)
  } else {
    fetchStudents() // 刪除成功後重新整理列表
  }
}

// --- 程式啟動點 ---
loadBranches()
fetchStudents()

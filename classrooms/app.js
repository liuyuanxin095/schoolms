import { supabase } from '../config.js'

const classroomList = document.getElementById('classroom-list')
const branchFilter = document.getElementById('branch-filter')
let allClassrooms = []

// 1. 讀取分校供篩選下拉選單使用
async function loadBranches() {
  try {
    const { data, error } = await supabase.from('branches').select('id, name')
    if (error) throw error

    if (data) {
      data.forEach(b => {
        const option = document.createElement('option')
        option.value = b.id
        option.textContent = b.name
        branchFilter.appendChild(option)
      })
    }
  } catch (err) {
    console.error('載入分校篩選器失敗:', err)
  }
}

// 2. 讀取教室資料 (關聯分校名稱) - 加入錯誤顯示機制
async function fetchClassrooms() {
  try {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*, branches(name)')
      .order('created_at', { ascending: true })

    if (error) {
      // 如果資料庫回傳錯誤，把紅字印在畫面上
      classroomList.innerHTML = `
        <tr>
          <td colspan="6" style="color: #dc2626; text-align: center; padding: 30px; line-height: 1.6;">
            <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 10px;">error</span><br>
            <strong>資料讀取失敗！</strong><br>
            錯誤訊息：${error.message}<br>
            <span style="font-size: 13px; color: #6b7280;">(請確認你是否已經在 Supabase 建立 classrooms 資料表並開啟 RLS)</span>
          </td>
        </tr>`
      return
    }

    allClassrooms = data || []
    renderTable(allClassrooms)

  } catch (err) {
    classroomList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">系統發生預期外的錯誤: ${err.message}</td></tr>`
  }
}

// 3. 渲染表格
function renderTable(data) {
  classroomList.innerHTML = ''
  
  if (data.length === 0) {
    classroomList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有教室資料，請點擊右上方新增</td></tr>'
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
          <a href="./edit.html?id=${room.id}" class="btn-icon" title="修改教室">
            <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          </a>
          <button class="btn-icon" style="color: var(--danger);" title="刪除教室" onclick="window.deleteClassroom('${room.id}', '${room.name}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      </td>
    `
    classroomList.appendChild(row)
  })
}

// 4. 篩選邏輯
branchFilter.addEventListener('change', () => {
  const branchId = branchFilter.value
  const filtered = branchId === 'all' ? allClassrooms : allClassrooms.filter(r => r.branch_id === branchId)
  renderTable(filtered)
})

// 5. 刪除邏輯 (掛載到 window 上讓 HTML 呼叫)
window.deleteClassroom = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  
  const { error } = await supabase.from('classrooms').delete().eq('id', id)
  if (error) {
    alert('刪除失敗：' + error.message)
  } else {
    fetchClassrooms() // 刪除成功後重新整理列表
  }
}

// --- 程式啟動點 ---
loadBranches()
fetchClassrooms()

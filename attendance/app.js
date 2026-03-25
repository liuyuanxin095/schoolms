import { supabase } from '../config.js'

// --- 時鐘功能 ---
function updateClock() {
  const now = new Date()
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-TW', { hour12: false })
}
setInterval(updateClock, 1000)
updateClock()

const todayStr = new Date().toISOString().split('T')[0]
document.getElementById('today-date').textContent = todayStr

// --- 介面元素 ---
const searchForm = document.getElementById('search-form')
const idInput = document.getElementById('id-input')
const attendanceList = document.getElementById('attendance-list')
const toastContainer = document.getElementById('toast-container')

let todayAttendanceData = [] // 儲存今日資料供匯出報表使用

// 💡 1. 浮動提示框 (Toast) 控制函數
function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  
  // 根據類型決定圖示
  let icon = 'check_circle'
  if (type === 'error') icon = 'error'
  if (type === 'warning') icon = 'warning'

  toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> <span>${message}</span>`
  toastContainer.appendChild(toast)

  // 觸發動畫
  setTimeout(() => toast.classList.add('show'), 10)

  // 3秒後自動消失並移除
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// 💡 2. 智慧打卡核心邏輯
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const queryId = idInput.value.trim()
  if (!queryId) return

  // 鎖定輸入框避免重複送出
  idInput.disabled = true

  try {
    // 步驟 A：尋找人員身分
    const [staffRes, studentRes] = await Promise.all([
      supabase.from('staff').select('id, name, type:role').eq('staff_number', queryId).maybeSingle(),
      supabase.from('students').select('id, name').eq('student_number', queryId).maybeSingle()
    ])

    let user = null
    let userType = ''
    
    if (staffRes.data) {
      user = staffRes.data
      userType = 'staff'
    } else if (studentRes.data) {
      user = studentRes.data
      userType = 'student'
    } else {
      showToast(`查無此編號：${queryId}，請確認後再試`, 'error')
      return
    }

    // 步驟 B：尋找今日紀錄，決定打卡行為
    const matchQuery = userType === 'staff' ? { staff_id: user.id, record_date: todayStr } : { student_id: user.id, record_date: todayStr }
    const { data: record, error: fetchErr } = await supabase.from('attendance').select('*').match(matchQuery).maybeSingle()
    if (fetchErr) throw fetchErr

    const nowIso = new Date().toISOString()
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    let actionText = ''

    if (!record) {
      // 情況一：今天還沒打過卡 -> 執行 [進班/上班]
      actionText = userType === 'staff' ? '上班' : '進班'
      const insertData = { user_type: userType, record_date: todayStr, check_in: nowIso }
      if (userType === 'staff') insertData.staff_id = user.id
      else insertData.student_id = user.id
      
      await supabase.from('attendance').insert([insertData])
      showToast(`✅ ${user.name} ${actionText}打卡成功 (${timeStr})`, 'success')

    } else {
      // 情況二：今天已經有紀錄 -> 自動尋找下一個空格
      if (!record.check_out) {
        actionText = userType === 'staff' ? '下班' : '離班'
        await supabase.from('attendance').update({ check_out: nowIso }).eq('id', record.id)
        showToast(`✅ ${user.name} ${actionText}打卡成功 (${timeStr})`, 'success')
      } 
      else {
        // 如果基本進退班已經完成
        if (userType === 'student') {
          showToast(`⚠️ ${user.name} 今日已完成進離班，無法重複打卡`, 'warning')
        } 
        else if (userType === 'staff') {
          // 教職員進入加班判斷邏輯
          if (!record.overtime_in) {
            await supabase.from('attendance').update({ overtime_in: nowIso }).eq('id', record.id)
            showToast(`🌙 ${user.name} 加班上班打卡成功 (${timeStr})`, 'success')
          } else if (!record.overtime_out) {
            await supabase.from('attendance').update({ overtime_out: nowIso }).eq('id', record.id)
            showToast(`🌙 ${user.name} 加班下班打卡成功 (${timeStr})`, 'success')
          } else {
            showToast(`⚠️ ${user.name} 今日所有打卡欄位已滿`, 'warning')
          }
        }
      }
    }

    // 更新畫面列表
    fetchTodayAttendance()

  } catch (err) {
    showToast('系統發生錯誤：' + err.message, 'error')
  } finally {
    // 恢復輸入框狀態並清空，準備迎接下一個人
    idInput.disabled = false
    idInput.value = ''
    idInput.focus()
  }
})

// 💡 3. 讀取今日紀錄
window.fetchTodayAttendance = async () => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, students(name), staff(name)')
      .eq('record_date', todayStr)
      .order('updated_at', { ascending: false }) // 改用更新時間排序，剛打卡的會在最上面

    if (error) throw error

    todayAttendanceData = data || []
    attendanceList.innerHTML = ''
    
    if (todayAttendanceData.length === 0) {
      attendanceList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">今日尚無考勤紀錄</td></tr>'
      return
    }

    todayAttendanceData.forEach(record => {
      const isStudent = record.user_type === 'student'
      const name = isStudent ? (record.students ? record.students.name : '未知學生') : (record.staff ? record.staff.name : '未知教職員')
      const badgeHtml = isStudent ? '<span class="role-badge" style="background:#dbeafe; color:#1e40af; padding:4px 8px; border-radius:4px; font-size:12px;">學生</span>' : '<span class="role-badge" style="background:#d1fae5; color:#065f46; padding:4px 8px; border-radius:4px; font-size:12px;">教職員</span>'

      const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '<span style="color:#9ca3af;">-</span>'

      const row = document.createElement('tr')
      row.innerHTML = `
        <td><strong>${name}</strong></td>
        <td>${badgeHtml}</td>
        <td>${formatTime(record.check_in)}</td>
        <td>${formatTime(record.check_out)}</td>
        <td>${formatTime(record.overtime_in)}</td>
        <td>${formatTime(record.overtime_out)}</td>
      `
      attendanceList.appendChild(row)
    })
  } catch (err) {
    attendanceList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">無法載入紀錄：${err.message}</td></tr>`
  }
}

// 💡 4. 匯出 CSV 報表邏輯
window.exportCSV = () => {
  if (todayAttendanceData.length === 0) {
    showToast('目前沒有考勤資料可以匯出！', 'warning')
    return
  }

  // 加上 \uFEFF 讓 Excel 識別為 UTF-8，防止中文亂碼
  let csvContent = '\uFEFF'
  csvContent += '人員名稱,身分,進班/上班時間,離班/下班時間,加班上班時間,加班下班時間\n'

  const formatCSVTime = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '未打卡'

  todayAttendanceData.forEach(record => {
    const isStudent = record.user_type === 'student'
    const name = isStudent ? (record.students ? record.students.name : '未知') : (record.staff ? record.staff.name : '未知')
    const role = isStudent ? '學生' : '教職員'
    
    // 組裝一列資料
    const row = [
      name,
      role,
      formatCSVTime(record.check_in),
      formatCSVTime(record.check_out),
      formatCSVTime(record.overtime_in),
      formatCSVTime(record.overtime_out)
    ].join(',')
    
    csvContent += row + '\n'
  })

  // 產生下載連結並觸發
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `考勤報表_${todayStr}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  showToast('報表匯出成功！', 'success')
}

// 初始化執行
fetchTodayAttendance()

import { supabase } from '../config.js'

// --- 時鐘功能 ---
function updateClock() {
  const now = new Date()
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-TW', { hour12: false })
}
setInterval(updateClock, 1000)
updateClock()

// 設定今日日期顯示
const todayStr = new Date().toISOString().split('T')[0]
document.getElementById('today-date').textContent = todayStr

// --- UI 元素 ---
const searchForm = document.getElementById('search-form')
const idInput = document.getElementById('id-input')
const userCard = document.getElementById('user-card')
const punchActions = document.getElementById('punch-actions')
const attendanceList = document.getElementById('attendance-list')

let currentUser = null // 暫存查找到的人員資訊

// --- 1. 尋找人員邏輯 ---
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const queryId = idInput.value.trim()
  if (!queryId) return

  userCard.style.display = 'none'
  punchActions.innerHTML = ''
  currentUser = null

  try {
    // 同時在兩個表中搜尋該編號
    const [staffRes, studentRes] = await Promise.all([
      supabase.from('staff').select('id, name, photo_url, staff_number, role').eq('staff_number', queryId).maybeSingle(),
      supabase.from('students').select('id, name, photo_url, student_number').eq('student_number', queryId).maybeSingle()
    ])

    if (staffRes.data) {
      currentUser = { ...staffRes.data, type: 'staff' }
    } else if (studentRes.data) {
      currentUser = { ...studentRes.data, type: 'student' }
    } else {
      alert('找不到符合的學號或人事編號！')
      return
    }

    renderUserCard()
  } catch (err) {
    alert('查詢發生錯誤：' + err.message)
  }
})

// --- 2. 渲染打卡介面 ---
function renderUserCard() {
  // 設定大頭照與姓名
  document.getElementById('user-avatar').src = currentUser.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random&color=fff`
  document.getElementById('user-name').textContent = currentUser.name
  
  // 設定身分標籤與按鈕
  const roleBadge = document.getElementById('user-role')
  punchActions.innerHTML = ''

  if (currentUser.type === 'student') {
    roleBadge.textContent = '學生'
    roleBadge.style.backgroundColor = '#2563eb'
    
    punchActions.innerHTML = `
      <button class="btn btn-punch in" onclick="punchTime('check_in')"><span class="material-symbols-outlined">login</span>進班打卡</button>
      <button class="btn btn-punch out" onclick="punchTime('check_out')"><span class="material-symbols-outlined">logout</span>離班打卡</button>
    `
  } else {
    roleBadge.textContent = '教職員'
    roleBadge.style.backgroundColor = '#059669'
    
    punchActions.innerHTML = `
      <button class="btn btn-punch in" onclick="punchTime('check_in')"><span class="material-symbols-outlined">login</span>上班打卡</button>
      <button class="btn btn-punch out" onclick="punchTime('check_out')"><span class="material-symbols-outlined">logout</span>下班打卡</button>
      <button class="btn btn-punch overtime" onclick="punchTime('overtime_in')"><span class="material-symbols-outlined">more_time</span>加班上班</button>
      <button class="btn btn-punch overtime" style="background-color: #b45309;" onclick="punchTime('overtime_out')"><span class="material-symbols-outlined">history_toggle_off</span>加班下班</button>
    `
  }

  userCard.style.display = 'flex'
}

// --- 3. 寫入打卡時間邏輯 (掛載到 window 供按鈕呼叫) ---
window.punchTime = async (columnName) => {
  if (!currentUser) return

  const nowIso = new Date().toISOString()
  
  // 準備查詢條件：找看看今天這個人是不是已經有紀錄了
  const matchQuery = currentUser.type === 'staff' ? { staff_id: currentUser.id, record_date: todayStr } : { student_id: currentUser.id, record_date: todayStr }

  try {
    const { data: existingRecord } = await supabase.from('attendance').select('id').match(matchQuery).maybeSingle()

    let error;
    if (existingRecord) {
      // 已經有今天的紀錄，就「更新」對應的欄位
      const updateData = {}
      updateData[columnName] = nowIso
      const res = await supabase.from('attendance').update(updateData).eq('id', existingRecord.id)
      error = res.error
    } else {
      // 今天第一次打卡，建立一筆新紀錄
      const insertData = {
        user_type: currentUser.type,
        record_date: todayStr,
        [columnName]: nowIso
      }
      if (currentUser.type === 'staff') insertData.staff_id = currentUser.id
      else insertData.student_id = currentUser.id
      
      const res = await supabase.from('attendance').insert([insertData])
      error = res.error
    }

    if (error) throw error

    alert('打卡成功！')
    idInput.value = ''
    userCard.style.display = 'none'
    fetchTodayAttendance() // 更新下方的表格

  } catch (err) {
    alert('打卡失敗：' + err.message)
  }
}

// --- 4. 讀取今日考勤紀錄 ---
window.fetchTodayAttendance = async () => {
  try {
    // 這裡運用 Supabase 的關聯查詢，把學生跟教職員的名字一起撈回來
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        students(name),
        staff(name)
      `)
      .eq('record_date', todayStr)
      .order('created_at', { ascending: false })

    if (error) throw error

    attendanceList.innerHTML = ''
    if (!data || data.length === 0) {
      attendanceList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">今日尚無考勤紀錄</td></tr>'
      return
    }

    data.forEach(record => {
      // 判斷是學生還是員工
      const isStudent = record.user_type === 'student'
      const name = isStudent ? (record.students ? record.students.name : '未知學生') : (record.staff ? record.staff.name : '未知教職員')
      const badgeHtml = isStudent ? '<span class="role-badge" style="background:#dbeafe; color:#1e40af;">學生</span>' : '<span class="role-badge" style="background:#d1fae5; color:#065f46;">教職員</span>'

      // 格式化時間 (如果為 null 顯示未打卡)
      const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '<span style="color:#9ca3af;">-</span>'

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

// 初始化執行
fetchTodayAttendance()

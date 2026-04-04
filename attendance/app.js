import { supabase } from '../config.js'

const punchForm = document.getElementById('punch-form')
const userNumberInput = document.getElementById('user_number')
const statusMsg = document.getElementById('status-message')

// 處理打卡邏輯
punchForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const val = userNumberInput.value.trim()
  if (!val) return

  userNumberInput.disabled = true
  statusMsg.className = 'status-alert'
  statusMsg.style.display = 'block'
  statusMsg.textContent = '讀取中...'

  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const nowIso = new Date().toISOString()

    // 1. 尋找學生
    const { data: student } = await supabase.from('students').select('id, name').eq('student_number', val).maybeSingle()
    
    if (student) {
      // 檢查今日是否已打卡
      const { data: existing } = await supabase.from('attendance').select('*').match({ student_id: student.id, record_date: todayStr }).maybeSingle()
      
      if (!existing || existing.status === '請假') {
        // 進班打卡 (若原本是請假，直接覆蓋成出席)
        const payload = { user_type: 'student', student_id: student.id, record_date: todayStr, check_in: nowIso, status: '正常', leave_reason: null }
        await supabase.from('attendance').upsert([payload], { onConflict: 'student_id, record_date' })
        showStatus(`${student.name} 同學，進班打卡成功！`, 'success')
      } else if (!existing.check_out) {
        // 離班打卡
        await supabase.from('attendance').update({ check_out: nowIso }).eq('id', existing.id)
        showStatus(`${student.name} 同學，離班打卡成功！再見！`, 'warning')
      } else {
        showStatus(`${student.name} 今日已完成進離班打卡。`, 'error')
      }
    } else {
      showStatus(`找不到學號/編號：${val}`, 'error')
    }
  } catch (err) {
    showStatus(`系統錯誤：${err.message}`, 'error')
  } finally {
    userNumberInput.value = ''
    userNumberInput.disabled = false
    userNumberInput.focus()
  }
})

function showStatus(text, type) {
  statusMsg.textContent = text
  statusMsg.className = `status-alert status-${type}`
  // 3秒後自動消失
  setTimeout(() => { statusMsg.style.display = 'none' }, 3000)
}

// 保持焦點在輸入框，方便條碼槍連續刷卡
document.addEventListener('click', () => { userNumberInput.focus() })

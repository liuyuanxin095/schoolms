import { supabase } from '../config.js'

const punchForm = document.getElementById('punch-form')
const userNumberInput = document.getElementById('user_number')
const statusMsg = document.getElementById('status-message')
const userProfile = document.getElementById('user-profile')
const userPhoto = document.getElementById('user-photo')
const userName = document.getElementById('user-name')

punchForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const val = userNumberInput.value.trim(); if (!val) return
  userNumberInput.disabled = true; statusMsg.className = 'status-alert'; statusMsg.style.display = 'block'; statusMsg.textContent = '讀取中...'; userProfile.style.display = 'none'

  try {
    const todayStr = new Date().toISOString().split('T')[0]; const nowIso = new Date().toISOString()
    
    // 先找學生
    let user = null; let userType = 'student'
    let { data: student } = await supabase.from('students').select('id, name, photo_url').eq('student_number', val).maybeSingle()
    if (student) { user = student; } 
    else {
      // 找不到學生就找教職員 (依人事編號或身分證)
      let { data: staff } = await supabase.from('staff').select('id, name, photo_url').eq('staff_number', val).maybeSingle()
      if (!staff) { let { data: staffById } = await supabase.from('staff').select('id, name, photo_url').eq('id_number', val).maybeSingle(); staff = staffById }
      if (staff) { user = staff; userType = 'staff' }
    }
    
    if (user) {
      // 顯示照片
      userPhoto.src = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff&size=128`
      userName.textContent = user.name
      userProfile.style.display = 'block'

      const matchCondition = userType === 'student' ? { student_id: user.id, record_date: todayStr } : { staff_id: user.id, record_date: todayStr }
      const { data: existing } = await supabase.from('attendance').select('*').match(matchCondition).maybeSingle()
      
      if (!existing || existing.status === '請假') {
        const payload = { user_type: userType, record_date: todayStr, check_in: nowIso, status: '正常', leave_reason: null }
        if(userType === 'student') payload.student_id = user.id; else payload.staff_id = user.id;
        await supabase.from('attendance').upsert([payload], { onConflict: userType==='student'?'student_id, record_date':'staff_id, record_date' })
        showStatus(`${user.name}，進班打卡成功！`, 'success')
      } else if (!existing.check_out) {
        await supabase.from('attendance').update({ check_out: nowIso }).eq('id', existing.id)
        showStatus(`${user.name}，離班打卡成功！再見！`, 'warning')
      } else { showStatus(`${user.name} 今日已完成進離班打卡。`, 'error') }
    } else { showStatus(`找不到學號或員工編號：${val}`, 'error') }
  } catch (err) { showStatus(`系統錯誤：${err.message}`, 'error') } 
  finally { userNumberInput.value = ''; userNumberInput.disabled = false; userNumberInput.focus() }
})

function showStatus(text, type) {
  statusMsg.textContent = text; statusMsg.className = `status-alert status-${type}`
  setTimeout(() => { statusMsg.style.display = 'none'; userProfile.style.display = 'none'; }, 4000)
}
document.addEventListener('click', () => { userNumberInput.focus() })

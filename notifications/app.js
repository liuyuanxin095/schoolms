import { supabase } from '../config.js'

const viewList = document.getElementById('view-list')
const viewEditor = document.getElementById('view-editor')
const notificationList = document.getElementById('notification-list')
const studentList = document.getElementById('student-list')
const filterBranch = document.getElementById('filter-branch')
const filterClass = document.getElementById('filter-class')

let allStudents = []; let allClasses = []; let currentPhotoUrl = null;

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>')
    const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`
    const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm')
    btnCancel.style.display = type === 'confirm' ? 'block' : 'none'
    const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }
    btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex'
  })
}

window.switchView = (view) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  if (view === 'list') { viewList.classList.add('active'); fetchNotifications() }
  if (view === 'editor') { viewEditor.classList.add('active'); document.getElementById('notify-form').reset(); resetImagePreview(); handleFilterChange() }
}

function resetImagePreview() {
  currentPhotoUrl = null; document.getElementById('image-preview').style.display = 'none'; document.getElementById('image-preview').src = ''; document.getElementById('upload-hint').style.display = 'block'
}

window.previewImage = (event) => {
  const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { document.getElementById('image-preview').src = e.target.result; document.getElementById('image-preview').style.display = 'block'; document.getElementById('upload-hint').style.display = 'none' }; reader.readAsDataURL(file) }
}

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) bData.forEach(b => filterBranch.appendChild(new Option(b.name, b.id)))

  const { data: cData } = await supabase.from('classes').select('id, name')
  if (cData) { allClasses = cData; cData.forEach(c => filterClass.appendChild(new Option(c.name, c.id))) }

  const { data: sData } = await supabase.from('students').select('id, name, student_number, branch_id').order('name')
  if (sData) allStudents = sData

  fetchNotifications()
}

async function fetchNotifications() {
  let query = supabase.from('notifications').select('*, sender:staff!sender_id(name)').order('created_at', { ascending: false })
  
  const { data, error } = await query
  notificationList.innerHTML = ''
  if (error || !data || data.length === 0) { notificationList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">尚無通知發送紀錄</td></tr>'; return }
  
  data.forEach(n => {
    const dateStr = new Date(n.created_at).toLocaleString('zh-TW', {hour12: false})
    const imgHtml = n.image_url ? `<a href="${n.image_url}" target="_blank" style="color:#8b5cf6;"><span class="material-symbols-outlined" style="font-size:24px;">image</span></a>` : '-'
    const senderName = n.sender ? n.sender.name : '系統'
    
    // 安全將陣列轉為 JSON 字串給按鈕使用
    const studentsJson = encodeURIComponent(JSON.stringify(n.target_students || []))

    notificationList.innerHTML += `
      <tr>
        <td>${dateStr}</td>
        <td><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom; color:var(--text-light);">person</span> ${senderName}</td>
        <td><div style="font-weight:bold;">${n.title}</div><div style="font-size:12px; color:var(--text-light); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.content}</div></td>
        <td>${imgHtml}</td>
        <td><button class="btn-icon" title="查看名單" onclick="window.showRecipients('${studentsJson}')" style="background:#f1f5f9; color:#334155; padding:4px 10px; border-radius:12px; font-weight:bold; font-size:12px;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">group</span> ${n.target_count || 0} 人</button></td>
        <td><button class="btn-icon" style="color:var(--danger);" onclick="window.deleteNotification('${n.id}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td>
      </tr>`
  })
}

window.showRecipients = (jsonStr) => {
  const students = JSON.parse(decodeURIComponent(jsonStr));
  const list = document.getElementById('recipients-list');
  if (students.length === 0) {
    list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-light);">無名單資料</div>';
  } else {
    list.innerHTML = students.map((s, idx) => `<div style="padding:12px 15px; border-bottom:1px solid var(--border); font-size:14px;">${idx+1}. <strong style="color:var(--text-main);">${s.name}</strong></div>`).join('');
  }
  document.getElementById('recipients-modal').style.display = 'flex';
}

window.handleFilterChange = async () => {
  const bId = filterBranch.value; const cId = filterClass.value
  let targetStudents = allStudents

  if (cId !== 'all') {
    const { data: roster } = await supabase.from('class_students').select('student_id').eq('class_id', cId)
    const classStudentIds = roster ? roster.map(r => r.student_id) : []
    targetStudents = allStudents.filter(s => classStudentIds.includes(s.id))
  } else if (bId !== 'all') {
    targetStudents = allStudents.filter(s => s.branch_id === bId)
  }

  studentList.innerHTML = ''
  if (targetStudents.length === 0) { studentList.innerHTML = '<div style="padding: 20px; text-align: center;">此條件下無學生</div>'; document.getElementById('selected-count').textContent = '0'; return }

  targetStudents.forEach(s => {
    studentList.innerHTML += `
      <label class="roster-item">
        <input type="checkbox" class="student-cb" value="${s.id}" onchange="window.updateCount()">
        <span class="student-name-label" style="font-weight:600;">${s.name}</span> <span style="font-size:12px; color:var(--text-light); font-weight:normal;">(${s.student_number || '無'})</span>
      </label>`
  })
  window.updateCount()
}

window.toggleSelectAll = () => {
  const isChecked = document.getElementById('select-all').checked
  document.querySelectorAll('.student-cb').forEach(cb => cb.checked = isChecked)
  window.updateCount()
}

window.updateCount = () => {
  const count = document.querySelectorAll('.student-cb:checked').length
  document.getElementById('selected-count').textContent = count
  document.getElementById('select-all').checked = count > 0 && count === document.querySelectorAll('.student-cb').length
}

window.sendNotification = async () => {
  const title = document.getElementById('noti_title').value; const content = document.getElementById('noti_content').value
  const selectedCbs = Array.from(document.querySelectorAll('.student-cb:checked'))
  const selectedIds = selectedCbs.map(cb => cb.value)
  const selectedNames = selectedCbs.map(cb => cb.nextElementSibling.textContent)
  
  if (!title || !content) return window.showCustomDialog('提示', '請填寫通知主旨與內文！', 'alert', 'info')
  if (selectedIds.length === 0) return window.showCustomDialog('提示', '請至少選擇一位發送對象！', 'alert', 'info')

  const btn = document.getElementById('btn-send'); btn.disabled = true; btn.textContent = '發送中...'
  try {
    const photoInput = document.getElementById('noti_image'); let finalPhotoUrl = null
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]; const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName); finalPhotoUrl = publicUrlData.publicUrl
    }

    const senderId = window.currentUser ? window.currentUser.id : null
    const targetStudents = selectedIds.map((id, index) => ({ id: id, name: selectedNames[index] }))

    const payload = { title: title, content: content, image_url: finalPhotoUrl, target_count: selectedIds.length, target_students: targetStudents, sender_id: senderId }
    const { error } = await supabase.from('notifications').insert([payload])
    if (error) throw error

    await window.showCustomDialog('發送成功', `通知已成功發送給 ${selectedIds.length} 位學生！`, 'alert', 'check_circle')
    window.switchView('list')
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">send</span> 確認發送' }
}

window.deleteNotification = async (id) => {
  const confirmDel = await window.showCustomDialog('確認刪除', '確定要刪除這筆通知紀錄嗎？', 'confirm', 'warning')
  if (!confirmDel) return; await supabase.from('notifications').delete().eq('id', id); fetchNotifications()
}

initData()

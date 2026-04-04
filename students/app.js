import { supabase } from '../config.js'

const viewList = document.getElementById('view-list'); const viewEditor = document.getElementById('view-editor')
const studentList = document.getElementById('student-list'); const searchInput = document.getElementById('search-input'); const branchFilter = document.getElementById('branch-filter')
const studentForm = document.getElementById('student-form'); const branchSelect = document.getElementById('branch_id')

let allStudents = []; let currentStudentId = null; let calendar = null; let attendanceMap = {}; let currentPhotoUrl = null;

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => { return new Promise((resolve) => { const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>'); const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`; const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm'); btnCancel.style.display = type === 'confirm' ? 'block' : 'none'; const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }; btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex' }) }
window.switchView = (view) => { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); if(view === 'list') viewList.classList.add('active'); if(view === 'editor') { viewEditor.classList.add('active'); if(calendar) setTimeout(()=>calendar.render(), 100); } }
window.switchFormTab = (tabName) => { document.querySelectorAll('.form-tab').forEach(el => el.classList.remove('active')); document.querySelectorAll('.form-tab-content').forEach(el => el.classList.remove('active')); document.getElementById('tab-btn-' + tabName).classList.add('active'); document.getElementById('tab-' + tabName).classList.add('active'); if(tabName === 'att' && calendar) setTimeout(()=>calendar.render(), 100); }

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) bData.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) })
  await fetchStudents()
}

async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*, branches(name)')
  if (error) return studentList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗</td></tr>`
  allStudents = data || []; renderTable(allStudents)
}

function renderTable(data) {
  studentList.innerHTML = ''; if (data.length === 0) return studentList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'
  
  // 💡 學號升冪排序 (A -> Z, 1 -> 9)
  data.sort((a, b) => (a.student_number || '').localeCompare(b.student_number || '', 'zh-TW', { numeric: true }))

  data.forEach(s => {
    // 💡 頭像與人事介面一致
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f8fafc&color=64748b`
    const row = document.createElement('tr')
    row.innerHTML = `
      <td style="display:flex; align-items:center; gap:12px; padding: 12px 15px;">
        <img src="${avatarUrl}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid var(--border);">
        <div><strong style="font-size:15px;">${s.name}</strong><div style="font-size:12px; color:var(--text-light); margin-top:2px;">${s.student_number || '無學號'}</div></div>
      </td>
      <td>${s.branches ? s.branches.name : '-'}</td>
      <td>${s.parent_name || '-'}</td>
      <td>${s.phone || '-'}</td>
      <td><button class="btn btn-primary" onclick="window.openEditor('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span> 編輯</button></td>`
    studentList.appendChild(row)
  })
}

searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)
function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  renderTable(allStudents.filter(s => (s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))) && (branchId === 'all' || s.branch_id === branchId)))
}

window.previewPhoto = (event) => { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { document.getElementById('avatar-preview').src = e.target.result }; reader.readAsDataURL(file) } }

window.openEditor = async (id = null) => {
  studentForm.reset(); document.getElementById('student-id').value = id || ''; currentPhotoUrl = null; currentStudentId = id;
  window.switchFormTab('basic'); window.switchView('editor');

  if (id) {
    document.getElementById('editor-title').textContent = '編輯學生資料'
    document.getElementById('att-overlay').style.display = 'none'; document.getElementById('att-content').style.display = 'block'
    const s = allStudents.find(x => x.id === id)
    if (s) {
      currentPhotoUrl = s.photo_url; document.getElementById('avatar-preview').src = currentPhotoUrl || 'https://via.placeholder.com/60'
      document.getElementById('name').value = s.name || ''; document.getElementById('student_number').value = s.student_number || ''
      document.getElementById('branch_id').value = s.branch_id || ''; document.getElementById('school').value = s.school || ''
      document.getElementById('phone').value = s.phone || ''; document.getElementById('parent_name').value = s.parent_name || ''
      document.getElementById('parent_phone').value = s.parent_phone || ''; document.getElementById('address').value = s.address || ''
      await loadAttendance()
    }
  } else { 
    document.getElementById('editor-title').textContent = '新增學生'
    document.getElementById('avatar-preview').src = 'https://via.placeholder.com/60'
    document.getElementById('att-overlay').style.display = 'block'; document.getElementById('att-content').style.display = 'none'
  }
}

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    const id = document.getElementById('student-id').value; const photoInput = document.getElementById('photo'); let finalPhotoUrl = currentPhotoUrl
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]; const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError; const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName); finalPhotoUrl = publicUrlData.publicUrl
    }

    const payload = {
      branch_id: document.getElementById('branch_id').value, name: document.getElementById('name').value,
      student_number: document.getElementById('student_number').value || null, school: document.getElementById('school').value || null,
      phone: document.getElementById('phone').value || null, parent_name: document.getElementById('parent_name').value || null,
      parent_phone: document.getElementById('parent_phone').value || null, address: document.getElementById('address').value || null, photo_url: finalPhotoUrl
    }
    const { data, error } = id ? await supabase.from('students').update(payload).eq('id', id).select() : await supabase.from('students').insert([payload]).select()
    if (error) throw error
    if (!id && data) { currentStudentId = data[0].id; document.getElementById('student-id').value = currentStudentId; document.getElementById('att-overlay').style.display = 'none'; document.getElementById('att-content').style.display = 'block'; await loadAttendance() }
    await window.showCustomDialog('成功', '學生資料儲存成功！', 'alert', 'check_circle'); await fetchStudents()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存學生檔案' }
})

// 💡 考勤行事曆與暗黑明細卡片連動
async function loadAttendance() {
  const { data } = await supabase.from('attendance').select('*').eq('student_id', currentStudentId)
  const events = []; attendanceMap = {}; document.getElementById('daily-detail-container').style.display = 'none'

  if (data) {
    data.forEach(a => {
      attendanceMap[a.record_date] = a
      const c = a.status === '請假' ? '#f59e0b' : '#10b981'
      events.push({ title: a.status, start: a.record_date, color: c, allDay: true })
    })
  }

  if (!calendar) {
    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
      initialView: 'dayGridMonth', height: 'auto', events: events,
      dateClick: function(info) { window.showDailyDetail(info.dateStr) },
      eventClick: function(info) { window.showDailyDetail(info.event.startStr.split('T')[0]) }
    });
    calendar.render()
  } else { calendar.removeAllEvents(); calendar.addEventSource(events) }
}

window.showDailyDetail = (dateStr) => {
  const detailContainer = document.getElementById('daily-detail-container')
  const att = attendanceMap[dateStr]; const days = ['日','一','二','三','四','五','六']; const d = new Date(dateStr)
  document.getElementById('detail-date').textContent = `${d.getMonth()+1}月${d.getDate()}日 (${days[d.getDay()]})`

  if (att) {
    document.getElementById('detail-in').textContent = att.check_in ? new Date(att.check_in).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}) : '尚未紀錄'
    document.getElementById('detail-out').textContent = att.check_out ? new Date(att.check_out).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}) : '尚未紀錄'
    document.getElementById('detail-status').textContent = att.status; document.getElementById('detail-status').style.color = att.status === '請假' ? '#f59e0b' : '#10b981'
    if (att.status === '請假') { document.getElementById('detail-reason-row').style.display = 'flex'; document.getElementById('detail-reason').textContent = att.leave_reason || '無事由'; document.getElementById('detail-in').textContent = '-'; document.getElementById('detail-out').textContent = '-'; } 
    else { document.getElementById('detail-reason-row').style.display = 'none' }
  } else {
    document.getElementById('detail-in').textContent = '-'; document.getElementById('detail-out').textContent = '-'; document.getElementById('detail-status').textContent = '無紀錄'; document.getElementById('detail-status').style.color = '#94a3b8'; document.getElementById('detail-reason-row').style.display = 'none'
  }
  detailContainer.style.display = 'block'; detailContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

window.markLeave = async () => {
  const dateStr = prompt('請輸入要請假的日期 (例如: 2026-04-05)', new Date().toISOString().split('T')[0]); if(!dateStr) return;
  const reason = prompt('請輸入請假事由 (例如: 病假, 學校補課)'); if(!reason) return;
  try {
    await supabase.from('attendance').upsert([{ user_type: 'student', student_id: currentStudentId, record_date: dateStr, status: '請假', leave_reason: reason, check_in: null, check_out: null }], { onConflict: 'student_id, record_date' })
    await window.showCustomDialog('成功', '請假登記完成！', 'alert', 'check_circle'); loadAttendance()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') }
}

initData()

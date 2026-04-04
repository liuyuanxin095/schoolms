import { supabase } from '../config.js'

const viewList = document.getElementById('view-list'); const viewEditor = document.getElementById('view-editor')
const classList = document.getElementById('class-list'); const searchInput = document.getElementById('search-input'); const branchFilter = document.getElementById('branch-filter')
const classForm = document.getElementById('class-form'); const branchSelect = document.getElementById('branch_id'); const teacherSelect = document.getElementById('teacher_id'); const tutorSelect = document.getElementById('tutor_id'); const classroomSelect = document.getElementById('classroom_id')
const rosterList = document.getElementById('roster-list'); const rosterStudentSelect = document.getElementById('roster-student-select')

let allClasses = []; let allClassrooms = []; let currentManageClassId = null; let scheduleSlots = []

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => { return new Promise((resolve) => { const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>'); const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`; const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm'); btnCancel.style.display = type === 'confirm' ? 'block' : 'none'; const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }; btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex' }) }

window.switchView = (view) => { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); if(view === 'list') viewList.classList.add('active'); if(view === 'editor') viewEditor.classList.add('active') }
window.switchFormTab = (tabName) => { document.querySelectorAll('.form-tab').forEach(el => el.classList.remove('active')); document.querySelectorAll('.form-tab-content').forEach(el => el.classList.remove('active')); document.getElementById('tab-btn-' + tabName).classList.add('active'); document.getElementById('tab-' + tabName).classList.add('active') }

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name'); if (bData) bData.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) })
  const { data: tData } = await supabase.from('staff').select('id, name').order('name'); if (tData) tData.forEach(t => { teacherSelect.appendChild(new Option(t.name, t.id)); tutorSelect.appendChild(new Option(t.name, t.id)) })
  const { data: cData } = await supabase.from('classrooms').select('id, name, branch_id'); if (cData) allClassrooms = cData
  await fetchClasses()
}

async function fetchClasses() {
  let query = supabase.from('classes').select('*, branches(name), staff!classes_teacher_id_fkey(name), tutor:staff!classes_tutor_id_fkey(name), classrooms(name)')
  const user = window.currentUser
  if (user && user.role === 'teacher') query = query.or(`teacher_id.eq.${user.id},tutor_id.eq.${user.id}`)
  else if (user && (user.role === 'admin' || user.role === 'manager')) query = query.eq('branch_id', user.branch_id)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return classList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`
  allClasses = data || []; renderTable(allClasses)
}

function renderTable(data) {
  classList.innerHTML = ''; if (data.length === 0) return classList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無班級資料</td></tr>'
  const dayOrder = { '星期一':1, '週一':1, '星期二':2, '週二':2, '星期三':3, '週三':3, '星期四':4, '週四':4, '星期五':5, '週五':5, '星期六':6, '週六':6, '星期日':7, '週日':7 };

  data.forEach(c => {
    let scheduleHtml = '-'
    if (c.schedule) {
      let slots = c.schedule.split(',').map(s => s.trim()); slots.sort((a, b) => (dayOrder[a.substring(0, 2)]||99) - (dayOrder[b.substring(0, 2)]||99))
      scheduleHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap;">` + slots.map(s => `<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; white-space:nowrap;">${s}</span>`).join('') + `</div>`
    }
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${c.name}</strong></td><td>${c.semester || '-'}</td><td>${c.branches ? c.branches.name : '-'}</td>
      <td><div style="margin-bottom:4px;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom; color:var(--primary);">history_edu</span> 師: ${c.staff ? c.staff.name : '-'}</div>
          <div style="font-size:13px; color:var(--text-light);"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">assignment_ind</span> 導: ${c.tutor ? c.tutor.name : '-'}</div></td>
      <td style="max-width: 250px;">${scheduleHtml}<div style="font-size:12px; color:var(--text-light); margin-top:6px;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">meeting_room</span> ${c.classrooms ? c.classrooms.name : '未安排教室'}</div></td>
      <td><button class="btn btn-primary" onclick="window.openEditor('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span> 編輯管理</button></td>`
    classList.appendChild(row)
  })
}

searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)
function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  renderTable(allClasses.filter(c => (c.name.toLowerCase().includes(keyword) || (c.staff && c.staff.name.toLowerCase().includes(keyword)) || (c.tutor && c.tutor.name.toLowerCase().includes(keyword))) && (branchId === 'all' || c.branch_id === branchId)))
}

window.handleBranchChange = () => {
  const bId = branchSelect.value; classroomSelect.innerHTML = '<option value="">-- 尚未安排 --</option>'
  allClassrooms.filter(c => c.branch_id === bId).forEach(c => classroomSelect.appendChild(new Option(c.name, c.id)))
}

// 💡 排課視覺化編輯器
window.addScheduleSlot = () => {
  const day = document.getElementById('sched-day').value; const start = document.getElementById('sched-start').value; const end = document.getElementById('sched-end').value
  const slotStr = `${day} ${start}~${end}`; if(!scheduleSlots.includes(slotStr)) { scheduleSlots.push(slotStr); renderScheduleBadges() }
}
window.removeScheduleSlot = (idx) => { scheduleSlots.splice(idx, 1); renderScheduleBadges() }
function renderScheduleBadges() {
  const container = document.getElementById('schedule-container'); document.getElementById('schedule').value = scheduleSlots.join(', ')
  if (scheduleSlots.length === 0) return container.innerHTML = '<span style="color: var(--text-light); font-size: 13px;">尚未加入任何時段</span>'
  const dayOrder = { '週一':1, '週二':2, '週三':3, '週四':4, '週五':5, '週六':6, '週日':7 }; scheduleSlots.sort((a, b) => (dayOrder[a.substring(0, 2)]||99) - (dayOrder[b.substring(0, 2)]||99))
  container.innerHTML = scheduleSlots.map((s, idx) => `<span class="schedule-badge">${s} <span class="material-symbols-outlined" onclick="window.removeScheduleSlot(${idx})">cancel</span></span>`).join('')
}

window.openEditor = async (id = null) => {
  classForm.reset(); document.getElementById('class-id').value = id || ''; scheduleSlots = []; renderScheduleBadges(); window.switchFormTab('basic'); window.switchView('editor')
  
  if (id) {
    document.getElementById('editor-title').textContent = '編輯班級'; document.getElementById('roster-overlay').style.display = 'none'; document.getElementById('roster-content').style.display = 'block'
    const c = allClasses.find(x => x.id === id)
    if (c) {
      document.getElementById('name').value = c.name || ''; document.getElementById('branch_id').value = c.branch_id || ''; window.handleBranchChange()
      document.getElementById('semester').value = c.semester || ''; document.getElementById('teacher_id').value = c.teacher_id || ''; document.getElementById('tutor_id').value = c.tutor_id || ''; document.getElementById('classroom_id').value = c.classroom_id || ''
      if(c.schedule) { scheduleSlots = c.schedule.split(',').map(s=>s.trim()); renderScheduleBadges() }
      document.getElementById('start_date').value = c.start_date || ''; document.getElementById('end_date').value = c.end_date || ''
      currentManageClassId = id; await loadRosterList()
    }
  } else { document.getElementById('editor-title').textContent = '新增班級'; document.getElementById('roster-overlay').style.display = 'block'; document.getElementById('roster-content').style.display = 'none' }
}

classForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    const id = document.getElementById('class-id').value
    const payload = { name: document.getElementById('name').value, branch_id: document.getElementById('branch_id').value, semester: document.getElementById('semester').value || null, teacher_id: document.getElementById('teacher_id').value || null, tutor_id: document.getElementById('tutor_id').value || null, classroom_id: document.getElementById('classroom_id').value || null, schedule: document.getElementById('schedule').value || null, start_date: document.getElementById('start_date').value || null, end_date: document.getElementById('end_date').value || null }
    const { data, error } = id ? await supabase.from('classes').update(payload).eq('id', id).select() : await supabase.from('classes').insert([payload]).select()
    if (error) throw error
    if (!id && data) { currentManageClassId = data[0].id; document.getElementById('class-id').value = currentManageClassId; document.getElementById('roster-overlay').style.display = 'none'; document.getElementById('roster-content').style.display = 'block'; await loadRosterList() }
    await window.showCustomDialog('成功', '班級資料儲存成功！', 'alert', 'check_circle'); await fetchClasses()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存班級資料' }
})

// 管理學生名單
async function loadRosterList() {
  let q = supabase.from('students').select('id, name, student_number').order('name'); const user = window.currentUser
  if (user && (user.role === 'admin' || user.role === 'manager')) q = q.eq('branch_id', user.branch_id)
  const { data: students } = await q; rosterStudentSelect.innerHTML = '<option value="" disabled selected>請選擇要加入的學生...</option>'
  if (students) students.forEach(s => rosterStudentSelect.appendChild(new Option(`${s.name} (${s.student_number||'無學號'})`, s.id)))
  
  const { data, error } = await supabase.from('class_students').select('student_id, students(name, student_number)').eq('class_id', currentManageClassId)
  rosterList.innerHTML = ''; if (error || !data || data.length === 0) return rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-light); padding:20px;">目前班上沒有學生</td></tr>'
  data.forEach(r => { if(r.students) rosterList.innerHTML += `<tr><td><strong>${r.students.name}</strong></td><td>${r.students.student_number || '-'}</td><td><button class="btn-icon" style="color:var(--danger);" onclick="window.removeStudentFromClass('${r.student_id}')"><span class="material-symbols-outlined" style="font-size:18px;">person_remove</span></button></td></tr>` })
}

window.addStudentToClass = async () => {
  const sId = rosterStudentSelect.value; if (!sId) return window.showCustomDialog('提示', '請先選擇學生！', 'alert', 'info')
  try { const { error } = await supabase.from('class_students').insert([{ class_id: currentManageClassId, student_id: sId }]); if (error) { if(error.code === '23505') await window.showCustomDialog('提示', '此學生已在班級中！', 'alert', 'info'); else throw error; return; } await loadRosterList() } catch (err) { await window.showCustomDialog('錯誤', '加入失敗：' + err.message, 'alert', 'error') }
}
window.removeStudentFromClass = async (studentId) => { const confirm = await window.showCustomDialog('確認', '確定將此學生移出班級嗎？', 'confirm', 'warning'); if (!confirm) return; await supabase.from('class_students').delete().match({ class_id: currentManageClassId, student_id: studentId }); await loadRosterList() }

initData()

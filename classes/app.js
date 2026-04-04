import { supabase } from '../config.js'

const classList = document.getElementById('class-list'); const searchInput = document.getElementById('search-input'); const branchFilter = document.getElementById('branch-filter')
const formModal = document.getElementById('form-modal'); const classForm = document.getElementById('class-form')
const branchSelect = document.getElementById('branch_id'); const teacherSelect = document.getElementById('teacher_id'); const tutorSelect = document.getElementById('tutor_id'); const classroomSelect = document.getElementById('classroom_id')
const rosterModal = document.getElementById('roster-modal'); const rosterList = document.getElementById('roster-list'); const rosterStudentSelect = document.getElementById('roster-student-select')

let allClasses = []; let currentManageClassId = null

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

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) { bData.forEach(b => { branchFilter.appendChild(new Option(b.name, b.id)); branchSelect.appendChild(new Option(b.name, b.id)) }) }
  const { data: tData } = await supabase.from('staff').select('id, name').order('name')
  if (tData) { tData.forEach(t => { teacherSelect.appendChild(new Option(t.name, t.id)); tutorSelect.appendChild(new Option(t.name, t.id)) }) }
  const { data: cData } = await supabase.from('classrooms').select('id, name')
  if (cData) cData.forEach(c => classroomSelect.appendChild(new Option(c.name, c.id)))

  await fetchClasses()
}

async function fetchClasses() {
  let query = supabase.from('classes').select('*, branches(name), staff!classes_teacher_id_fkey(name), tutor:staff!classes_tutor_id_fkey(name), classrooms(name)')
  const user = window.currentUser
  if (user) {
    if (user.role === 'teacher') query = query.or(`teacher_id.eq.${user.id},tutor_id.eq.${user.id}`)
    else if (user.role === 'admin' || user.role === 'manager') query = query.eq('branch_id', user.branch_id)
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { classList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allClasses = data || []; renderTable(allClasses)
}

function renderTable(data) {
  classList.innerHTML = ''
  if (data.length === 0) { classList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無班級資料</td></tr>'; return }

  const dayOrder = { '星期一':1, '週一':1, '星期二':2, '週二':2, '星期三':3, '週三':3, '星期四':4, '週四':4, '星期五':5, '週五':5, '星期六':6, '週六':6, '星期日':7, '週日':7 };

  data.forEach(c => {
    const branchName = c.branches ? c.branches.name : '-'
    const teacherName = c.staff ? c.staff.name : '<span style="color:#9ca3af;">未指派</span>'
    const tutorName = c.tutor ? c.tutor.name : '-'
    const classroomName = c.classrooms ? c.classrooms.name : '<span style="color:#9ca3af;">未安排教室</span>'

    let scheduleHtml = '-'
    if (c.schedule) {
      let slots = c.schedule.split(',').map(s => s.trim())
      slots.sort((a, b) => { const dayA = dayOrder[a.substring(0, 2)] || 99; const dayB = dayOrder[b.substring(0, 2)] || 99; return dayA - dayB; })
      scheduleHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap;">` + slots.map(s => `<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; white-space:nowrap;">${s}</span>`).join('') + `</div>`
    }

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${c.semester || '-'}</td>
      <td>${branchName}</td>
      <td>
        <div style="margin-bottom:4px;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom; color:var(--primary);">history_edu</span> 師: ${teacherName}</div>
        <div style="font-size:13px; color:var(--text-light);"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">assignment_ind</span> 導: ${tutorName}</div>
      </td>
      <td style="max-width: 250px;">${scheduleHtml}<div style="font-size:12px; color:var(--text-light); margin-top:6px;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">meeting_room</span> ${classroomName}</div></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="管理學生名單" onclick="window.openRosterModal('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px; color:#10b981;">group_add</span></button>
          <button class="btn-icon" title="修改班級" onclick="window.openFormModal('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除班級" onclick="window.deleteClass('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    classList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  const filtered = allClasses.filter(c => {
    const matchKey = c.name.toLowerCase().includes(keyword) || (c.staff && c.staff.name.toLowerCase().includes(keyword)) || (c.tutor && c.tutor.name.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || c.branch_id === branchId
    return matchKey && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)

window.openFormModal = (id = null) => {
  classForm.reset(); document.getElementById('class-id').value = id || ''
  if (id) {
    document.getElementById('form-title').textContent = '修改班級'
    const c = allClasses.find(x => x.id === id)
    if (c) {
      document.getElementById('name').value = c.name || ''; document.getElementById('branch_id').value = c.branch_id || ''
      document.getElementById('semester').value = c.semester || ''; document.getElementById('teacher_id').value = c.teacher_id || ''
      document.getElementById('tutor_id').value = c.tutor_id || ''; document.getElementById('classroom_id').value = c.classroom_id || ''
      document.getElementById('schedule').value = c.schedule || ''; document.getElementById('start_date').value = c.start_date || ''; document.getElementById('end_date').value = c.end_date || ''
    }
  } else { document.getElementById('form-title').textContent = '新增班級' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

classForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('class-id').value
    const payload = {
      name: document.getElementById('name').value, branch_id: document.getElementById('branch_id').value,
      semester: document.getElementById('semester').value || null, teacher_id: document.getElementById('teacher_id').value || null,
      tutor_id: document.getElementById('tutor_id').value || null, classroom_id: document.getElementById('classroom_id').value || null, 
      schedule: document.getElementById('schedule').value || null, start_date: document.getElementById('start_date').value || null, end_date: document.getElementById('end_date').value || null
    }
    const { error } = id ? await supabase.from('classes').update(payload).eq('id', id) : await supabase.from('classes').insert([payload])
    if (error) throw error; window.closeFormModal(); await fetchClasses()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.textContent = '儲存班級' }
})

window.deleteClass = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定要刪除「${name}」嗎？`, 'confirm', 'warning')
  if (!confirmDel) return; await supabase.from('classes').delete().eq('id', id); fetchClasses()
}

window.openRosterModal = async (classId, className) => {
  currentManageClassId = classId; document.getElementById('roster-class-name').textContent = className
  rosterList.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">載入中...</td></tr>'
  rosterModal.style.display = 'flex'
  
  let q = supabase.from('students').select('id, name, student_number').order('name')
  const user = window.currentUser
  if (user && (user.role === 'admin' || user.role === 'manager')) q = q.eq('branch_id', user.branch_id)
  
  const { data: students } = await q
  rosterStudentSelect.innerHTML = '<option value="" disabled selected>請選擇要加入的學生...</option>'
  if (students) students.forEach(s => rosterStudentSelect.appendChild(new Option(`${s.name} (${s.student_number||'無學號'})`, s.id)))
  await loadRosterList()
}
window.closeRosterModal = () => rosterModal.style.display = 'none'

async function loadRosterList() {
  const { data, error } = await supabase.from('class_students').select('student_id, students(name, student_number)').eq('class_id', currentManageClassId)
  if (error) { rosterList.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">載入失敗</td></tr>'; return }
  rosterList.innerHTML = ''
  if (!data || data.length === 0) { rosterList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-light); padding:20px;">目前班上沒有學生</td></tr>'; return }
  data.forEach(r => {
    if(!r.students) return;
    rosterList.innerHTML += `<tr><td><strong>${r.students.name}</strong></td><td>${r.students.student_number || '-'}</td><td><button class="btn-icon" style="color:var(--danger);" onclick="window.removeStudentFromClass('${r.student_id}')"><span class="material-symbols-outlined" style="font-size:18px;">person_remove</span></button></td></tr>`
  })
}

window.addStudentToClass = async () => {
  const sId = rosterStudentSelect.value; if (!sId) return window.showCustomDialog('提示', '請先選擇學生！', 'alert', 'info')
  try {
    const { error } = await supabase.from('class_students').insert([{ class_id: currentManageClassId, student_id: sId }])
    if (error) { if(error.code === '23505') await window.showCustomDialog('提示', '此學生已在班級中！', 'alert', 'info'); else throw error; return; }
    await loadRosterList()
  } catch (err) { await window.showCustomDialog('錯誤', '加入失敗：' + err.message, 'alert', 'error') }
}

window.removeStudentFromClass = async (studentId) => {
  const confirm = await window.showCustomDialog('確認', '確定將此學生移出班級嗎？', 'confirm', 'warning')
  if (!confirm) return
  await supabase.from('class_students').delete().match({ class_id: currentManageClassId, student_id: studentId }); await loadRosterList()
}

initData()

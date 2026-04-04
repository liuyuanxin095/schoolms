import { supabase } from '../config.js'
const viewList = document.getElementById('view-list'); const viewEditor = document.getElementById('view-editor'); const studentList = document.getElementById('student-list'); const branchSelect = document.getElementById('branch_id');
let calendar = null; let currentStudentId = null;

// (保留 showCustomDialog)
window.showCustomDialog = (title, message, type='alert', icon='info') => { return new Promise((r) => { const d=document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent=title; document.getElementById('dialog-message').innerHTML=message; document.getElementById('dialog-icon').innerHTML=`<span class="material-symbols-outlined" style="font-size:48px; color:${type==='error'?'#dc2626':'#3b82f6'};">${icon}</span>`; const bc=document.getElementById('dialog-btn-cancel'); const bf=document.getElementById('dialog-btn-confirm'); bc.style.display=type==='confirm'?'block':'none'; const cl=()=>{d.style.display='none'; bf.onclick=null; bc.onclick=null}; bf.onclick=()=>{cl(); r(true)}; bc.onclick=()=>{cl(); r(false)}; d.style.display='flex' }) }
window.switchView = (v) => { document.querySelectorAll('.view-section').forEach(e=>e.classList.remove('active')); document.getElementById('view-'+v).classList.add('active'); if(v==='editor' && calendar) setTimeout(()=>calendar.render(), 100); }
window.switchFormTab = (t) => { document.querySelectorAll('.form-tab, .form-tab-content').forEach(e=>e.classList.remove('active')); document.getElementById('tab-btn-'+t).classList.add('active'); document.getElementById('tab-'+t).classList.add('active'); if(t==='att' && calendar) setTimeout(()=>calendar.render(), 100); }

async function initData() { const {data: b} = await supabase.from('branches').select('id,name'); b?.forEach(x => branchSelect.appendChild(new Option(x.name, x.id))); loadStudents(); }
async function loadStudents() {
  const {data} = await supabase.from('students').select('*, branches(name)');
  studentList.innerHTML=''; if(!data) return;
  // 💡 學號降冪排序
  data.sort((a,b) => (b.student_number||'').localeCompare(a.student_number||'', 'zh-TW', {numeric:true})).forEach(s => {
    studentList.innerHTML += `<tr><td><strong>${s.name}</strong> <span style="color:#64748b;font-size:12px;">(${s.student_number||'無'})</span></td><td>${s.branches?.name||'-'}</td><td>${s.parent_name||'-'}</td><td>${s.phone||'-'}</td><td><button class="btn-icon" onclick="window.openEditor('${s.id}')"><span class="material-symbols-outlined">edit</span></button></td></tr>`
  })
}

window.openEditor = async (id=null) => {
  document.getElementById('student-form').reset(); document.getElementById('student-id').value = id||''; currentStudentId = id; window.switchFormTab('basic'); window.switchView('editor');
  if(id) { const {data} = await supabase.from('students').select('*').eq('id',id).single(); if(data) { document.getElementById('name').value=data.name; document.getElementById('student_number').value=data.student_number||''; document.getElementById('branch_id').value=data.branch_id; document.getElementById('phone').value=data.phone||''; document.getElementById('parent_name').value=data.parent_name||''; document.getElementById('parent_phone').value=data.parent_phone||''; } loadAttendance(); }
}
document.getElementById('student-form').addEventListener('submit', async (e) => { e.preventDefault(); const id = document.getElementById('student-id').value; const p = {name:document.getElementById('name').value, student_number:document.getElementById('student_number').value||null, branch_id:document.getElementById('branch_id').value, phone:document.getElementById('phone').value||null, parent_name:document.getElementById('parent_name').value||null, parent_phone:document.getElementById('parent_phone').value||null}; if(id) await supabase.from('students').update(p).eq('id',id); else await supabase.from('students').insert([p]); window.switchView('list'); loadStudents(); })

async function loadAttendance() {
  const {data} = await supabase.from('attendance').select('*').eq('student_id', currentStudentId);
  const events = []; const list = document.getElementById('att-list'); list.innerHTML='';
  if(data) data.forEach(a => {
    const c = a.status==='請假' ? '#f59e0b' : '#10b981'; events.push({ title: a.status, start: a.record_date, color: c });
    list.innerHTML += `<tr><td>${a.record_date}</td><td><span style="color:${c};font-weight:bold;">${a.status}</span></td><td>${a.check_in?new Date(a.check_in).toLocaleTimeString('zh-TW'):'-'}</td><td>${a.status==='請假'?a.leave_reason:(a.check_out?new Date(a.check_out).toLocaleTimeString('zh-TW'):'-')}</td></tr>`
  })
  if(!calendar) { calendar = new FullCalendar.Calendar(document.getElementById('calendar'), { initialView: 'dayGridMonth', events: events, height: 400 }); calendar.render(); }
  else { calendar.removeAllEvents(); calendar.addEventSource(events); }
}
window.markLeave = async () => { const reason = prompt('請輸入請假日期與事由 (格式: 2026-04-04,病假)'); if(reason) { const p = reason.split(','); await supabase.from('attendance').upsert([{user_type:'student', student_id:currentStudentId, record_date:p[0], status:'請假', leave_reason:p[1]}], {onConflict:'student_id,record_date'}); loadAttendance(); } }
initData()

import { supabase, adminAuthClient } from '../config.js'

const viewList = document.getElementById('view-list'); const viewEditor = document.getElementById('view-editor')
const staffList = document.getElementById('staff-list'); const searchInput = document.getElementById('search-input'); const statusFilter = document.getElementById('status-filter')
const staffForm = document.getElementById('staff-form'); const branchIdsSelect = document.getElementById('branch_ids')

let allStaff = []; let globalBranchesMap = {}; let currentPhotoUrl = null

window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => { return new Promise((resolve) => { const dialog = document.getElementById('custom-dialog'); document.getElementById('dialog-title').textContent = title; document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>'); const iconColor = type === 'confirm' ? '#f59e0b' : (type === 'error' ? '#dc2626' : '#3b82f6'); document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`; const btnCancel = document.getElementById('dialog-btn-cancel'); const btnConfirm = document.getElementById('dialog-btn-confirm'); btnCancel.style.display = type === 'confirm' ? 'block' : 'none'; const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }; btnConfirm.onclick = () => { cleanup(); resolve(true) }; btnCancel.onclick = () => { cleanup(); resolve(false) }; dialog.style.display = 'flex' }) }
window.switchView = (view) => { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); if(view === 'list') viewList.classList.add('active'); if(view === 'editor') viewEditor.classList.add('active') }
window.switchFormTab = (tabName) => { document.querySelectorAll('.form-tab').forEach(el => el.classList.remove('active')); document.querySelectorAll('.form-tab-content').forEach(el => el.classList.remove('active')); document.getElementById('tab-btn-' + tabName).classList.add('active'); document.getElementById('tab-' + tabName).classList.add('active') }

async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) { branchIdsSelect.innerHTML = ''; bData.forEach(b => { globalBranchesMap[b.id] = b.name; branchIdsSelect.appendChild(new Option(b.name, b.id)); }) }
  await fetchStaff()
}

async function fetchStaff() {
  let query = supabase.from('staff').select('*').order('name', { ascending: true })
  const user = window.currentUser
  if (user && (user.role === 'admin' || user.role === 'manager')) query = query.contains('branch_ids', `["${user.branch_id}"]`) 
  
  const { data, error } = await query; if (error) { staffList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allStaff = data || []; renderTable(allStaff)
}

function renderTable(data) {
  staffList.innerHTML = ''; if (data.length === 0) { staffList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }

  data.forEach(s => {
    const avatarUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f8fafc&color=64748b`
    const isWorking = s.status === '在職' || !s.status;
    const statusDisplay = `<span style="background:${isWorking ? '#dcfce7' : '#fee2e2'}; color:${isWorking ? '#15803d' : '#b91c1c'}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">${isWorking ? 'check_circle' : 'cancel'}</span>${s.status || '在職'}</span>`
    
    let branchNames = '<span style="color:#9ca3af;">未指定</span>';
    if (s.branch_ids && Array.isArray(s.branch_ids) && s.branch_ids.length > 0) branchNames = s.branch_ids.map(id => globalBranchesMap[id] || '未知分校').join(', ');
    const subText = s.staff_number ? `編號: ${s.staff_number}` : (s.id_number ? `ID: ${s.id_number}` : '無編號');

    // 💡 若無 auth_id 則觸發開通 Modal
    const accountBtn = s.auth_id 
      ? `<button class="btn-icon" style="color:#15803d; background:#dcfce7;" title="已開通系統帳號"><span class="material-symbols-outlined" style="font-size:18px;">manage_accounts</span></button>`
      : `<button class="btn-icon" style="color:var(--warning); background:#fef3c7;" title="點此開通系統登入帳號" onclick="window.openAccountSetupModal('${s.id}', '${s.name}', '${s.id_number || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">key</span></button>`;

    const row = document.createElement('tr')
    row.innerHTML = `
      <td style="display:flex; align-items:center; gap:12px; padding: 12px 15px;"><img src="${avatarUrl}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid var(--border);"><div><strong style="font-size:15px;">${s.name}</strong><div style="font-size:12px; color:var(--text-light); margin-top:2px;">${subText}</div></div></td>
      <td>${statusDisplay}</td><td>${s.phone || '-'}</td><td>${s.hire_date || '-'}</td><td style="font-size:13px; max-width:200px; line-height:1.4;">${branchNames}</td>
      <td><div class="action-btns" style="display:flex; gap:5px;">${accountBtn}<button class="btn-icon" title="修改人事資料" onclick="window.openEditor('${s.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn-icon" style="color:var(--danger);" title="刪除檔案" onclick="window.deleteStaff('${s.id}', '${s.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></div></td>`
    staffList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const statusVal = statusFilter.value
  renderTable(allStaff.filter(s => (s.name.toLowerCase().includes(keyword) || (s.staff_number && s.staff_number.toLowerCase().includes(keyword)) || (s.id_number && s.id_number.toLowerCase().includes(keyword))) && (statusVal === 'all' || (s.status || '在職') === statusVal)))
}
searchInput.addEventListener('input', filterData); statusFilter.addEventListener('change', filterData)
window.previewPhoto = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { document.getElementById('avatar-preview').src = ev.target.result }; reader.readAsDataURL(file) } }

window.openEditor = (id = null) => {
  staffForm.reset(); document.getElementById('staff-id').value = id || ''; currentPhotoUrl = null; Array.from(branchIdsSelect.options).forEach(opt => opt.selected = false); window.switchFormTab('basic'); window.switchView('editor');
  if (id) {
    document.getElementById('editor-title').textContent = '修改人事檔案'; const s = allStaff.find(x => x.id === id)
    if (s) {
      currentPhotoUrl = s.photo_url; document.getElementById('avatar-preview').src = currentPhotoUrl || 'https://via.placeholder.com/60'; document.getElementById('name').value = s.name || ''; document.getElementById('staff_number').value = s.staff_number || ''; document.getElementById('id_number').value = s.id_number || ''; document.getElementById('hire_date').value = s.hire_date || ''; document.getElementById('phone').value = s.phone || ''; document.getElementById('status').value = s.status || '在職'; document.getElementById('base_salary').value = s.base_salary || 0; document.getElementById('hourly_rate').value = s.hourly_rate || 0; document.getElementById('emergency_contact').value = s.emergency_contact || ''; document.getElementById('emergency_phone').value = s.emergency_phone || ''; document.getElementById('address').value = s.address || ''
      if (s.branch_ids && Array.isArray(s.branch_ids)) Array.from(branchIdsSelect.options).forEach(opt => { if (s.branch_ids.includes(opt.value)) opt.selected = true })
    }
  } else { document.getElementById('editor-title').textContent = '新增人事檔案'; document.getElementById('avatar-preview').src = 'https://via.placeholder.com/60' }
}

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    const id = document.getElementById('staff-id').value; const photoInput = document.getElementById('photo'); let finalPhotoUrl = currentPhotoUrl
    if (photoInput.files.length > 0) { const file = photoInput.files[0]; const fileName = `${Date.now()}_${file.name}`; const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file); if (uploadError) throw uploadError; const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName); finalPhotoUrl = publicUrlData.publicUrl }
    const selectedBranches = Array.from(branchIdsSelect.selectedOptions).map(opt => opt.value); if (selectedBranches.length === 0) throw new Error('請至少選擇一間所屬分校！')
    
    const payload = { branch_ids: selectedBranches, branch_id: selectedBranches[0], name: document.getElementById('name').value, staff_number: document.getElementById('staff_number').value || null, id_number: document.getElementById('id_number').value || null, hire_date: document.getElementById('hire_date').value || null, phone: document.getElementById('phone').value || null, status: document.getElementById('status').value, base_salary: parseInt(document.getElementById('base_salary').value) || 0, hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0, emergency_contact: document.getElementById('emergency_contact').value || null, emergency_phone: document.getElementById('emergency_phone').value || null, address: document.getElementById('address').value || null, photo_url: finalPhotoUrl }
    const { error } = id ? await supabase.from('staff').update(payload).eq('id', id) : await supabase.from('staff').insert([payload])
    if (error) { if (error.code === '23505') throw new Error('人事編號或身分證重複！'); else throw error }
    await window.showCustomDialog('成功', '人事檔案儲存成功！', 'alert', 'check_circle'); window.switchView('list'); await fetchStaff()
  } catch (err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error') } finally { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存人事檔案' }
})

window.deleteStaff = async (id, name) => {
  const confirmDel = await window.showCustomDialog('確認刪除', `確定要刪除「${name}」的人事資料嗎？這將同步撤銷他的系統權限！`, 'confirm', 'warning')
  if (!confirmDel) return; await supabase.from('staff').delete().eq('id', id); fetchStaff()
}

// 💡 處理 HR 列表中的「快速開通」邏輯
window.openAccountSetupModal = (id, name, idNumber) => {
  document.getElementById('setup-staff-id').value = id;
  document.getElementById('setup-staff-name').textContent = name;
  document.getElementById('setup-pwd').value = idNumber || '123456';
  document.getElementById('setup-email').value = '';
  document.getElementById('account-setup-modal').style.display = 'flex';
}
window.closeAccountSetupModal = () => document.getElementById('account-setup-modal').style.display = 'none';

document.getElementById('account-setup-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('btn-setup-submit'); btn.disabled = true; btn.textContent = '開通中...';
  try {
    const id = document.getElementById('setup-staff-id').value; const email = document.getElementById('setup-email').value; const pwd = document.getElementById('setup-pwd').value; const role = document.getElementById('setup-role').value;
    const { data: authData, error: authErr } = await adminAuthClient.auth.signUp({ email, password: pwd }); if (authErr) throw authErr;
    const { error: updErr } = await supabase.from('staff').update({ auth_id: authData.user.id, email, role }).eq('id', id); if (updErr) throw updErr;
    await window.showCustomDialog('成功', '帳號開通成功，老師現在可以登入了！', 'alert', 'check_circle'); window.closeAccountSetupModal(); fetchStaff();
  } catch(err) { await window.showCustomDialog('錯誤', err.message, 'alert', 'error'); } finally { btn.disabled = false; btn.textContent = '確認開通'; }
});

initData()

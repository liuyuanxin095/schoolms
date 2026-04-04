// sidebar.js - 陽禾文理補習班 側邊導覽列 (支援 RBAC 權限與 RWD)

export function initSidebar(supabase) {
  const currentPath = window.location.pathname;
  if (currentPath.includes('login.html')) return; 

  const isSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals|accounts|branches)\//);
  const basePath = isSubfolder ? '../' : './';
  const currentModule = isSubfolder ? isSubfolder[1] : 'home';

  const user = window.currentUser || { name: '未知使用者', role: 'teacher' };
  const roleNameMap = { 'superadmin': '總部管理員', 'manager': '分校主任', 'admin': '分校櫃檯', 'teacher': '授課教師' };
  const userRoleText = roleNameMap[user.role] || '教職員';
  const userBranchText = user.branches ? user.branches.name : (user.role === 'superadmin' ? '全域總部' : '未綁定分校');

  const showAdminMenu = user.role === 'superadmin' || user.role === 'manager';

  const sidebarHTML = `
    <aside class="sidebar" id="global-sidebar">
      <div class="sidebar-header">
        <span class="material-symbols-outlined" style="font-size: 32px; color: #60a5fa;">school</span>
        <h2>陽禾補習班</h2>
      </div>
      
      <div class="sidebar-menu">
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 10px 0 5px 15px;">核心業務</div>
        <a href="${basePath}index.html" class="menu-item ${currentModule === 'home' ? 'active' : ''}"><span class="material-symbols-outlined">dashboard</span> 首頁儀表板</a>
        <a href="${basePath}students/index.html" class="menu-item ${currentModule === 'students' ? 'active' : ''}"><span class="material-symbols-outlined">group</span> 學生管理</a>
        <a href="${basePath}classes/index.html" class="menu-item ${currentModule === 'classes' ? 'active' : ''}"><span class="material-symbols-outlined">class</span> 班級與排課</a>
        <a href="${basePath}attendance/index.html" class="menu-item ${currentModule === 'attendance' ? 'active' : ''}"><span class="material-symbols-outlined">how_to_reg</span> 考勤打卡</a>
        
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 20px 0 5px 15px;">教務與財務</div>
        <a href="${basePath}grades/index.html" class="menu-item ${currentModule === 'grades' ? 'active' : ''}"><span class="material-symbols-outlined">quiz</span> 成績管理</a>
        <a href="${basePath}notifications/index.html" class="menu-item ${currentModule === 'notifications' ? 'active' : ''}"><span class="material-symbols-outlined">campaign</span> 班級通知</a>
        ${user.role !== 'teacher' ? `
        <a href="${basePath}payments/index.html" class="menu-item ${currentModule === 'payments' ? 'active' : ''}"><span class="material-symbols-outlined">payments</span> 繳費管理</a>
        <a href="${basePath}meals/index.html" class="menu-item ${currentModule === 'meals' ? 'active' : ''}"><span class="material-symbols-outlined">restaurant</span> 餐費與訂餐</a>
        ` : ''}
        
        ${showAdminMenu ? `
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 20px 0 5px 15px;">行政與設定</div>
        <a href="${basePath}staff/index.html" class="menu-item ${currentModule === 'staff' ? 'active' : ''}"><span class="material-symbols-outlined">badge</span> 教職員名冊 (HR)</a>
        <a href="${basePath}accounts/index.html" class="menu-item ${currentModule === 'accounts' ? 'active' : ''}"><span class="material-symbols-outlined">manage_accounts</span> 系統帳號權限</a>
        <a href="${basePath}classrooms/index.html" class="menu-item ${currentModule === 'classrooms' ? 'active' : ''}"><span class="material-symbols-outlined">meeting_room</span> 教室與行事曆</a>
        <a href="${basePath}branches/index.html" class="menu-item ${currentModule === 'branches' ? 'active' : ''}"><span class="material-symbols-outlined">domain</span> 分校管理</a>
        ` : ''}
      </div>
      
      <div class="sidebar-footer" style="background: #0f172a; padding: 15px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
          <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
            ${user.name.charAt(0)}
          </div>
          <div style="flex-grow: 1; overflow: hidden;">
            <div style="color: white; font-weight: bold; font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${user.name}</div>
            <div style="color: #94a3b8; font-size: 11px;">${userRoleText} · ${userBranchText}</div>
          </div>
        </div>

        <div style="display: flex; gap: 5px;">
          <button class="btn" title="變更密碼" style="flex: 1; background: #334155; color: #cbd5e1; border: 1px solid #475569; padding: 8px;" id="btn-global-pwd">
            <span class="material-symbols-outlined" style="font-size: 18px;">key</span>
          </button>
          <button class="btn" title="登出系統" style="flex: 1; background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 8px;" onclick="window.logout()">
            <span class="material-symbols-outlined" style="font-size: 18px;">logout</span>
          </button>
        </div>
      </div>
    </aside>

    <div class="modal-overlay" id="global-pwd-modal" style="z-index: 9999;">
      <div class="modal-content" style="max-width: 400px;">
        <span class="material-symbols-outlined modal-close" id="close-pwd-modal">close</span>
        <h2 style="margin-top: 0; color: var(--primary);">變更登入密碼</h2>
        <form id="global-pwd-form">
          <div class="form-group" style="margin-bottom: 15px;"><label>請輸入新密碼 (至少 6 碼) <span style="color:red">*</span></label><input type="password" id="global-new-pwd" required minlength="6"></div>
          <div class="form-group" style="margin-bottom: 25px;"><label>再次確認新密碼 <span style="color:red">*</span></label><input type="password" id="global-confirm-pwd" required minlength="6"></div>
          <div class="actions"><button type="submit" class="btn btn-primary" style="width: 100%;">確認變更</button></div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  const overlay = document.createElement('div'); overlay.className = 'sidebar-overlay'; document.body.appendChild(overlay);
  const headerLeft = document.querySelector('.header-left');
  if (headerLeft) {
    const toggleBtn = document.createElement('button'); toggleBtn.className = 'menu-toggle'; toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 28px;">menu</span>';
    headerLeft.insertBefore(toggleBtn, headerLeft.firstChild);
    const sidebar = document.getElementById('global-sidebar');
    const toggleSidebar = () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); };
    toggleBtn.addEventListener('click', toggleSidebar); overlay.addEventListener('click', toggleSidebar);
  }

  const pwdModal = document.getElementById('global-pwd-modal');
  document.getElementById('btn-global-pwd').onclick = () => { document.getElementById('global-pwd-form').reset(); pwdModal.style.display = 'flex'; };
  document.getElementById('close-pwd-modal').onclick = () => { pwdModal.style.display = 'none'; };
  
  document.getElementById('global-pwd-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const pwd1 = document.getElementById('global-new-pwd').value; const pwd2 = document.getElementById('global-confirm-pwd').value;
    if (pwd1 !== pwd2) return window.showCustomDialog ? window.showCustomDialog('錯誤', '兩次輸入密碼不一致！', 'alert', 'error') : alert('錯誤');
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = '變更中...';
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 }); if (error) throw error;
      if (window.showCustomDialog) await window.showCustomDialog('成功', '密碼變更成功，請重新登入。', 'alert', 'check_circle'); else alert('成功');
      await supabase.auth.signOut(); window.location.reload();
    } catch (err) { window.showCustomDialog ? window.showCustomDialog('失敗', err.message, 'alert', 'error') : alert(err.message); btn.disabled = false; btn.textContent = '確認變更'; }
  });
}

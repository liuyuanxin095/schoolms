// sidebar.js - 陽禾文理補習班 側邊導覽列 (單一列表、動態大頭貼、核彈級安全登出)

export function initSidebar(supabase) {
  const currentPath = window.location.pathname;
  if (currentPath.includes('login.html')) return; 

  const isSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals|accounts|branches)\//);
  const basePath = isSubfolder ? '../' : './';
  const currentModule = isSubfolder ? isSubfolder[1] : 'home';

  const user = window.currentUser || { name: '未知使用者', role: 'teacher' };
  const roleNameMap = { 'superadmin': '總管理員', 'manager': '分校主任', 'admin': '分校櫃檯', 'teacher': '授課教師' };
  const userRoleText = roleNameMap[user.role] || '教職員';
  const userBranchText = user.branches ? user.branches.name : (user.role === 'superadmin' ? '全域總部' : '未綁定');

  const avatarUrl = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`;

  const showAdminMenu = user.role === 'superadmin' || user.role === 'manager';

  const sidebarHTML = `
    <aside class="sidebar" id="global-sidebar">
      <div class="sidebar-header">
        <span class="material-symbols-outlined" style="font-size: 32px; color: #60a5fa;">school</span>
        <h2>陽禾補習班</h2>
      </div>
      
      <div class="sidebar-menu">
        <a href="${basePath}index.html" class="menu-item ${currentModule === 'home' ? 'active' : ''}"><span class="material-symbols-outlined">dashboard</span> 首頁儀表板</a>
        <a href="${basePath}students/index.html" class="menu-item ${currentModule === 'students' ? 'active' : ''}"><span class="material-symbols-outlined">group</span> 學生管理</a>
        <a href="${basePath}classes/index.html" class="menu-item ${currentModule === 'classes' ? 'active' : ''}"><span class="material-symbols-outlined">class</span> 班級與排課</a>
        <a href="${basePath}attendance/index.html" class="menu-item ${currentModule === 'attendance' ? 'active' : ''}"><span class="material-symbols-outlined">how_to_reg</span> 考勤打卡</a>
        <a href="${basePath}grades/index.html" class="menu-item ${currentModule === 'grades' ? 'active' : ''}"><span class="material-symbols-outlined">quiz</span> 成績管理</a>
        <a href="${basePath}notifications/index.html" class="menu-item ${currentModule === 'notifications' ? 'active' : ''}"><span class="material-symbols-outlined">campaign</span> 班級通知</a>
        ${user.role !== 'teacher' ? `
        <a href="${basePath}payments/index.html" class="menu-item ${currentModule === 'payments' ? 'active' : ''}"><span class="material-symbols-outlined">payments</span> 繳費管理</a>
        <a href="${basePath}meals/index.html" class="menu-item ${currentModule === 'meals' ? 'active' : ''}"><span class="material-symbols-outlined">restaurant</span> 餐費與訂餐</a>
        ` : ''}
        ${showAdminMenu ? `
        <a href="${basePath}staff/index.html" class="menu-item ${currentModule === 'staff' ? 'active' : ''}"><span class="material-symbols-outlined">badge</span> 人事管理</a>
        <a href="${basePath}accounts/index.html" class="menu-item ${currentModule === 'accounts' ? 'active' : ''}"><span class="material-symbols-outlined">manage_accounts</span> 系統帳號管理</a>
        <a href="${basePath}classrooms/index.html" class="menu-item ${currentModule === 'classrooms' ? 'active' : ''}"><span class="material-symbols-outlined">meeting_room</span> 教室與行事曆</a>
        <a href="${basePath}branches/index.html" class="menu-item ${currentModule === 'branches' ? 'active' : ''}"><span class="material-symbols-outlined">domain</span> 分校管理</a>
        ` : ''}
      </div>
      
      <div class="sidebar-footer">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
          <img src="${avatarUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #334155;">
          <div style="flex-grow: 1; overflow: hidden;">
            <div style="color: white; font-weight: bold; font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${user.name}</div>
            <div style="color: #94a3b8; font-size: 11px;">${userRoleText} · ${userBranchText}</div>
          </div>
        </div>

        <div style="display: flex; gap: 5px;">
          <button class="btn" title="變更密碼" style="flex: 1; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 8px;" id="btn-global-pwd"><span class="material-symbols-outlined" style="font-size: 18px;">key</span></button>
          <button class="btn" title="安全登出" style="flex: 1; background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 8px;" onclick="window.performSecureLogout()"><span class="material-symbols-outlined" style="font-size: 18px;">logout</span></button>
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
      window.performSecureLogout();
    } catch (err) { window.showCustomDialog ? window.showCustomDialog('失敗', err.message, 'alert', 'error') : alert(err.message); btn.disabled = false; btn.textContent = '確認變更'; }
  });

  // ==========================================
  // 🛡️ 核彈級安全登出引擎 (清除所有快取與存儲)
  // ==========================================
  window.performSecureLogout = async () => {
    // 💡 補回完整的警告文字
    const confirmLogout = window.showCustomDialog 
      ? await window.showCustomDialog('系統登出', '確定要登出系統嗎？\n登出後系統將自動清除瀏覽器快取與暫存資料，以保障補習班資訊安全。', 'confirm', 'logout') 
      : confirm('確定要登出系統嗎？登出後將清除快取。');
      
    if (!confirmLogout) return;

    try {
      // 1. 註銷伺服器 Token
      await supabase.auth.signOut();
      
      // 2. 清除瀏覽器本地存儲 (防範資料殘留)
      localStorage.clear(); 
      sessionStorage.clear(); 
      window.currentUser = null;
      
      // 3. 清空瀏覽器 Cache API
      if ('caches' in window) { 
        const cacheNames = await caches.keys(); 
        await Promise.all(cacheNames.map(name => caches.delete(name))); 
      }
      
      // 4. 強制跳轉並加上隨機時間戳防快取
      window.location.replace(basePath + 'login.html?nocache=' + new Date().getTime());
    } catch (err) { 
      window.location.replace(basePath + 'login.html'); 
    }
  };
}

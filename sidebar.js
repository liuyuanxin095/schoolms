// sidebar.js - 全域側邊導覽列自動生成組件 (支援 RWD 響應式)

export function initSidebar() {
  const currentPath = window.location.pathname;
  
  // 登入頁面不需要顯示側邊欄
  if (currentPath.includes('login.html')) return; 

  const isSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals)\//);
  const basePath = isSubfolder ? '../' : './';
  const currentModule = isSubfolder ? isSubfolder[1] : 'home';

  // 💡 1. 建立側邊欄 HTML
  const sidebarHTML = `
    <aside class="sidebar" id="global-sidebar">
      <div class="sidebar-header">
        <span class="material-symbols-outlined" style="font-size: 32px; color: #60a5fa;">school</span>
        <h2>補習班管理系統</h2>
      </div>
      
      <div class="sidebar-menu">
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 10px 0 5px 15px; text-transform: uppercase;">核心模組</div>
        <a href="${basePath}index.html" class="menu-item ${currentModule === 'home' ? 'active' : ''}"><span class="material-symbols-outlined">dashboard</span> 首頁儀表板</a>
        <a href="${basePath}students/index.html" class="menu-item ${currentModule === 'students' ? 'active' : ''}"><span class="material-symbols-outlined">group</span> 學生管理</a>
        <a href="${basePath}classes/index.html" class="menu-item ${currentModule === 'classes' ? 'active' : ''}"><span class="material-symbols-outlined">class</span> 班級與排課</a>
        <a href="${basePath}attendance/index.html" class="menu-item ${currentModule === 'attendance' ? 'active' : ''}"><span class="material-symbols-outlined">how_to_reg</span> 考勤打卡</a>
        
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 20px 0 5px 15px; text-transform: uppercase;">教務與財務</div>
        <a href="${basePath}grades/index.html" class="menu-item ${currentModule === 'grades' ? 'active' : ''}"><span class="material-symbols-outlined">quiz</span> 成績管理</a>
        <a href="${basePath}payments/index.html" class="menu-item ${currentModule === 'payments' ? 'active' : ''}"><span class="material-symbols-outlined">payments</span> 繳費管理</a>
        <a href="${basePath}meals/index.html" class="menu-item ${currentModule === 'meals' ? 'active' : ''}"><span class="material-symbols-outlined">restaurant</span> 餐費與訂餐</a>
        
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 20px 0 5px 15px; text-transform: uppercase;">行政系統</div>
        <a href="${basePath}staff/index.html" class="menu-item ${currentModule === 'staff' ? 'active' : ''}"><span class="material-symbols-outlined">badge</span> 教職員管理</a>
        <a href="${basePath}classrooms/index.html" class="menu-item ${currentModule === 'classrooms' ? 'active' : ''}"><span class="material-symbols-outlined">meeting_room</span> 教室與行事曆</a>
        <a href="${basePath}notifications/index.html" class="menu-item ${currentModule === 'notifications' ? 'active' : ''}"><span class="material-symbols-outlined">campaign</span> 班級通知</a>
        
        <div style="font-size: 11px; color: #64748b; font-weight: bold; margin: 20px 0 5px 15px; text-transform: uppercase;">系統設定</div>
        <a href="#" class="menu-item" onclick="window.showCustomDialog ? window.showCustomDialog('系統提示', '下個階段即將解鎖帳號管理功能！', 'alert', 'manage_accounts') : alert('即將解鎖')">
          <span class="material-symbols-outlined">manage_accounts</span> 系統帳號管理
        </a>
      </div>
      
      <div class="sidebar-footer">
        <button class="btn" style="width: 100%; background: #334155; color: #f8fafc; display: flex; justify-content: center; gap: 8px; border: 1px solid #475569;" onclick="window.logout()">
          <span class="material-symbols-outlined" style="font-size: 18px;">logout</span> 登出系統
        </button>
      </div>
    </aside>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // 💡 2. 動態生成 RWD 手機版需要的元素 (漢堡選單與黑底遮罩)
  
  // 建立黑底遮罩
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // 尋找網頁的標題列 (header-left) 準備插入漢堡按鈕
  const headerLeft = document.querySelector('.header-left');
  if (headerLeft) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-toggle';
    toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 28px;">menu</span>';
    
    // 把漢堡按鈕插在最前面
    headerLeft.insertBefore(toggleBtn, headerLeft.firstChild);

    const sidebar = document.getElementById('global-sidebar');
    
    // 切換選單的邏輯
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    };

    // 綁定點擊事件：按漢堡圖示可以開關、點黑底遮罩可以關閉
    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
  }
}

initSidebar();

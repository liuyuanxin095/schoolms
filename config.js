import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// ==========================================
// 1. Supabase 資料庫連線設定 (請替換為您自己的 Key)
// ==========================================
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'
// (IT 模組獨立開通帳號用的 Service Role Key)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 專供 accounts 模組使用的管理員連線 (不保留登入狀態)
export const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ==========================================
// 2. 全域路由與登入狀態防護罩 (Router Guard)
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
  const currentPath = window.location.pathname;
  
  // 判斷當前所在頁面的類型
  const isLoginPage = currentPath.includes('login.html');
  const isParentApp = currentPath.includes('/parent/');

  // 💡 情境 A：尚未登入
  if (!session) {
    // 如果不在登入頁，且不是在家長端 APP，一律強制踢回後台登入頁
    if (!isLoginPage && !isParentApp) {
      window.location.replace('/schoolms/login.html'); // 根據您的 GitHub repo 名稱定位
    }
    return;
  }

  // 💡 情境 B：已登入，但卡在登入頁 (防止重複登入)
  if (session && isLoginPage) {
    window.location.replace('/schoolms/index.html');
    return;
  }

  // 💡 情境 C：已登入，且在後台管理系統中 (需抓取人事權限與側邊欄)
  if (session && !isParentApp) {
    try {
      // 根據登入的 Auth ID，去人事名冊 (staff) 抓取該員工的詳細資料與分校
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .single();

      if (error) throw error;
      
      // 將員工資料存入全域變數，供各模組讀取權限 (RBAC)
      window.currentUser = staffData;
      
      // 確保側邊欄只被繪製一次
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
      
    } catch (err) {
      console.error('無法獲取使用者權限資料:', err);
      // 如果在 staff 表找不到這筆資料 (可能被 IT 撤銷帳號了)，強制登出
      await supabase.auth.signOut();
      window.location.replace('/schoolms/login.html');
    }
  }
})

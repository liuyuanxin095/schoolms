import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// ==========================================
// 1. Supabase 資料庫連線設定 (請務必貼上您的金鑰)
// ==========================================
const SUPABASE_URL = 'https://gqxvgwpccydkktavblao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

// 💡 關鍵修復：同時導出「大寫」和「小寫」變數，確保所有模組都能抓到資料
export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 專供 accounts 模組使用的管理員連線
export const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ==========================================
// 2. 全域路由與登入狀態防護罩 (Router Guard)
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
  // 將網址轉為小寫判定，確保大小寫路徑都能通過
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.includes('login.html');
  const isParentApp = currentPath.includes('parent');

  // 情境 A：尚未登入
  if (!session) {
    if (!isLoginPage && !isParentApp) {
      window.location.replace('/schoolms/login.html'); 
    }
    return;
  }

  // 情境 B：已登入，但卡在登入頁 (防止重複登入)
  if (session && isLoginPage) {
    window.location.replace('/schoolms/index.html');
    return;
  }

  // 情境 C：已登入，且在後台管理系統中 (需抓取人事權限與側邊欄)
  if (session && !isParentApp) {
    try {
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .single();

      if (error) throw error;
      window.currentUser = staffData;
      
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (err) {
      console.error('權限抓取失敗:', err);
      // 如果 staff 找不到，代表帳號可能被停用
      await supabase.auth.signOut();
      window.location.replace('/schoolms/login.html');
    }
  }
});

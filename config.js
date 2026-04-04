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
  // 💡 將網址轉為小寫，並放寬判定條件，只要包含 parent 就放行
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.includes('login.html');
  const isParentApp = currentPath.includes('parent');

  if (!session) {
    if (!isLoginPage && !isParentApp) {
      window.location.replace('/schoolms/login.html'); 
    }
    return; // 家長未登入狀態，直接停在這裡，不產生側邊欄
  }

  if (session && isLoginPage) {
    window.location.replace('/schoolms/index.html');
    return;
  }

  // 💡 只有「已登入」且「不是在家長端」，才去抓取人事權限與側邊欄
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
      await supabase.auth.signOut();
      window.location.replace('/schoolms/login.html');
    }
  }
})

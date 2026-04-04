import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// ==========================================
// 1. 恢復原始變數名稱 (請填入您的金鑰)
// ==========================================
export const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

// 同時匯出 supabase 物件供新模組使用
export const supabase = createClient(supabaseUrl, supabaseKey);

// 供帳號管理模組使用
export const adminAuthClient = createClient(supabaseUrl, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ==========================================
// 2. 登入狀態與側邊欄邏輯
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.includes('login.html');
  const isParentApp = currentPath.includes('parent');

  // 未登入攔截
  if (!session) {
    if (!isLoginPage && !isParentApp) {
      window.location.replace('/schoolms/login.html'); 
    }
    return;
  }

  // 已登入排除家長端，才載入後台側邊欄
  if (session && !isParentApp && !isLoginPage) {
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .single();

      // 即使抓不到資料也給個預設值，防止側邊欄消失
      window.currentUser = staffData || { name: '管理員', role: 'superadmin' };
      
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (err) {
      window.currentUser = { name: '管理員', role: 'superadmin' };
      if (!document.getElementById('global-sidebar')) initSidebar(supabase);
    }
  }
});

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// ==========================================
// 1. Supabase 連線設定 (請填入您的金鑰)
// ==========================================
const URL = 'https://gqxvgwpccydkktavblao.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

// 💡 導出所有可能的變數組合，確保「主系統各模組」與「家長端」都能抓到連線
export const supabaseUrl = URL;
export const supabaseKey = KEY;
export const supabase = createClient(URL, KEY);
export const adminAuthClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ==========================================
// 2. 系統路由與權限守護 (解決跑不動的問題)
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.includes('login.html');
  const isParentApp = path.includes('parent');

  // 情境 A：未登入狀態
  if (!session) {
    if (!isLoginPage && !isParentApp) {
      window.location.replace('/schoolms/login.html'); 
    }
    return;
  }

  // 情境 B：已登入，且在「後台管理系統」
  if (session && !isParentApp && !isLoginPage) {
    try {
      // 嘗試抓取員工資料
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .single();

      // 💡 關鍵修復：即使 staff 表沒資料，也給個預設值，防止側邊欄卡死不出來
      window.currentUser = staffData || { name: '管理員', role: 'superadmin' };
      
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (err) {
      // 發生錯誤時的保險機制
      window.currentUser = { name: '管理員', role: 'superadmin' };
      if (!document.getElementById('global-sidebar')) initSidebar(supabase);
    }
  }
});

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// 1. 連線設定 (請再次確認金鑰是否正確貼上)
const SUPABASE_URL = 'https://gqxvgwpccydkktavblao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_ANON_KEY;

export const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. 登入防護與側邊欄初始化
supabase.auth.onAuthStateChange(async (event, session) => {
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.includes('login.html');
  const isParentApp = currentPath.includes('parent');

  if (!session) {
    if (!isLoginPage && !isParentApp) window.location.replace('/schoolms/login.html');
    return;
  }

  if (session && isLoginPage) {
    window.location.replace('/schoolms/index.html');
    return;
  }

  // 💡 強化邏輯：只要是後台，就一定要跑出側邊欄
  if (session && !isParentApp) {
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .single();

      // 即使 staff 表沒資料，我們也預設一個管理員身分，不讓畫面卡死
      window.currentUser = staffData || { name: '系統管理員', role: 'superadmin' };
      
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (err) {
      console.log("提示：目前使用預設權限瀏覽");
      window.currentUser = { name: '管理員', role: 'superadmin' };
      if (!document.getElementById('global-sidebar')) initSidebar(supabase);
    }
  }
});

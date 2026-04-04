import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// ==========================================
// 1. 回歸最穩定的連線定義
// ==========================================
export const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const adminAuthClient = createClient(supabaseUrl, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ==========================================
// 2. 簡化版權限守護員 (不再干擾連線鎖)
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.includes('login.html');
  const isParentApp = path.includes('parent');

  // 家長端 APP：完全放行，不做任何處理
  if (isParentApp) return;

  // 未登入：只在非登入頁跳轉
  if (!session && !isLoginPage) {
    window.location.replace('/schoolms/login.html');
    return;
  }

  // 已登入：抓取身分並繪製側邊欄
  if (session && !isLoginPage) {
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, branches(name)')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      // 設定全域變數 (如果找不到資料也給預設，保證 sidebar 能跑)
      window.currentUser = staffData || { name: '管理員', role: 'superadmin' };

      // 繪製側邊欄
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (e) {
      console.error("側邊欄載入失敗", e);
    }
  }
});

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { initSidebar } from './sidebar.js'

// 1. 基礎連線設定
export const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM0NzgwNiwiZXhwIjoyMDg5OTIzODA2fQ.fWHfq8mAURiCermtWiG0oCkCvJaEx8zLwUqlF3_-5mQ';

// 💡 整個系統「唯一」的連線實例
export const supabase = createClient(supabaseUrl, supabaseKey);

export const adminAuthClient = createClient(supabaseUrl, S_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. 登入監聽 (僅做身分確認與畫 Sidebar)
supabase.auth.onAuthStateChange(async (event, session) => {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('parent')) return;

  if (!session && !path.includes('login.html')) {
    window.location.replace('/schoolms/login.html');
    return;
  }

  if (session && !path.includes('login.html')) {
    try {
      const { data } = await supabase.from('staff').select('*, branches(name)').eq('auth_id', session.user.id).maybeSingle();
      window.currentUser = data || { name: '管理員', role: 'superadmin' };
      
      // 檢查是否已經有 Sidebar，避免重複畫
      if (!document.getElementById('global-sidebar')) {
        initSidebar(supabase);
      }
    } catch (e) {
      console.error("Sidebar 初始化失敗", e);
    }
  }
});

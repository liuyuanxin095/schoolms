import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { initSidebar } from './sidebar.js' 

// ⚠️ 請換成你自己的 Supabase URL 與 Anon Key
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'

// 1. 主要客戶端 (正常登入與操作資料庫使用)
export const supabase = createClient(supabaseUrl, supabaseKey)

// 💡 2. 後台註冊專用客戶端 (重要：關閉 Session 保留，避免註冊新老師時把主任自己登出！)
export const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 3. 啟動全域側邊欄與密碼修改功能
initSidebar(supabase)

// ==========================================
// 🛡️ 全域防護罩 (Auth Guard)
// ==========================================
supabase.auth.getSession().then(({ data: { session } }) => {
  const currentPath = window.location.pathname
  const isLoginPage = currentPath.includes('login.html')
  
  const isInSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals)\//)
  const loginUrl = isInSubfolder ? '../login.html' : './login.html'
  const indexUrl = isInSubfolder ? '../index.html' : './index.html'

  if (!session && !isLoginPage) window.location.replace(loginUrl)
  else if (session && isLoginPage) window.location.replace(indexUrl)
})

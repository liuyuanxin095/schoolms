import './sidebar.js' // 💡 自動載入並渲染全域側邊欄

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ⚠️ 請換成你自己的 Supabase URL 與 Anon Key
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'

export const supabase = createClient(supabaseUrl, supabaseKey)

// ==========================================
// 🛡️ 全域防護罩 (Auth Guard)
// ==========================================
// 只要有任何網頁載入 config.js，就會立刻執行這段身分驗證
supabase.auth.getSession().then(({ data: { session } }) => {
  const currentPath = window.location.pathname
  const isLoginPage = currentPath.includes('login.html')
  
  // 判斷目前是否在子資料夾 (例如 /students/ 或 /grades/)
  const isInSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals)\//)
  
  // 計算正確的跳轉路徑
  const loginUrl = isInSubfolder ? '../login.html' : './login.html'
  const indexUrl = isInSubfolder ? '../index.html' : './index.html'

  if (!session && !isLoginPage) {
    // 沒登入，且不在登入頁 -> 強制踢回登入頁
    window.location.replace(loginUrl)
  } else if (session && isLoginPage) {
    // 已登入，卻跑去登入頁 -> 自動導回首頁
    window.location.replace(indexUrl)
  }
})

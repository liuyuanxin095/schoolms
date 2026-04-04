import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { initSidebar } from './sidebar.js'

// ⚠️ 請換成你自己的 Supabase URL 與 Anon Key
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 全域使用者狀態
window.currentUser = null;

// ==========================================
// 🛡️ 權限防護罩與身分載入引擎 (Auth Guard & RBAC)
// ==========================================
async function initializeSystem() {
  const currentPath = window.location.pathname
  const isLoginPage = currentPath.includes('login.html')
  const isInSubfolder = currentPath.match(/\/(students|staff|classes|attendance|grades|payments|notifications|classrooms|meals|accounts)\//)
  
  const loginUrl = isInSubfolder ? '../login.html' : './login.html'
  const indexUrl = isInSubfolder ? '../index.html' : './index.html'

  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !isLoginPage) {
    window.location.replace(loginUrl)
    return
  } else if (session && isLoginPage) {
    window.location.replace(indexUrl)
    return
  }

  // 如果已登入，抓取使用者的詳細權限與分校資料
  if (session) {
    const { data: userData, error } = await supabase.from('staff').select('*, branches(name)').eq('auth_id', session.user.id).maybeSingle()
    
    if (userData) {
      window.currentUser = userData
    } else {
      // 若是最初的超級管理員(尚未建立staff檔案)，給予預設最高權限
      window.currentUser = { name: '系統管理員', role: 'superadmin', branch_id: 'all' }
    }
    
    // 身分載入完成後，才繪製側邊欄
    initSidebar(supabase)
  }
}

initializeSystem()

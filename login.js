import { supabase } from './config.js'

const loginForm = document.getElementById('login-form')
const btnSubmit = document.getElementById('btn-submit')
const errorMsg = document.getElementById('error-msg')

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  
  btnSubmit.disabled = true
  btnSubmit.textContent = '驗證中...'
  errorMsg.style.display = 'none'

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) throw error

    // 登入成功，導向首頁
    window.location.href = './index.html'
    
  } catch (err) {
    errorMsg.textContent = '登入失敗：請檢查帳號密碼是否正確'
    errorMsg.style.display = 'block'
    btnSubmit.disabled = false
    btnSubmit.textContent = '安全登入'
  }
})

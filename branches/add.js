import { supabase } from '../config.js'

const addForm = document.getElementById('add-branch-form')
const submitBtn = document.getElementById('submit-btn')

addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  const newBranch = {
    name: document.getElementById('name').value,
    address: document.getElementById('address').value || null,
    phone: document.getElementById('phone').value || null
  }

  const { error } = await supabase.from('branches').insert([newBranch])

  if (error) {
    alert('儲存失敗：' + error.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存分校'
    submitBtn.disabled = false
  } else {
    // 成功後返回分校列表
    window.location.href = './index.html'
  }
})

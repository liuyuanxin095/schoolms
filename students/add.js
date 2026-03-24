import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')

addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  // 收集表單資料
  const newStudent = {
    name: document.getElementById('name').value,
    id_number: document.getElementById('id_number').value || null,
    birthday: document.getElementById('birthday').value || null,
    school: document.getElementById('school').value,
    grade: document.getElementById('grade').value,
    parent_name: document.getElementById('parent_name').value,
    parent_phone: document.getElementById('parent_phone').value,
    photo_url: document.getElementById('photo_url').value || null,
    branch_id: '11111111-1111-1111-1111-111111111111' // 預設測試分校
  }

  const { error } = await supabase.from('students').insert([newStudent])

  if (error) {
    alert('儲存失敗：' + error.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存資料'
    submitBtn.disabled = false
  } else {
    // 儲存成功後，自動跳轉回列表頁
    window.location.href = './index.html'
  }
})

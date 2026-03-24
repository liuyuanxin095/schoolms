import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

// 載入分校清單
async function loadBranches() {
  try {
    const { data, error } = await supabase.from('branches').select('id, name')
    if (error) throw error

    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'
    if (data && data.length > 0) {
      data.forEach(b => {
        const option = document.createElement('option')
        option.value = b.id
        option.textContent = b.name
        branchSelect.appendChild(option)
      })
    }
  } catch (err) {
    branchSelect.innerHTML = `<option value="" disabled selected>讀取失敗: ${err.message}</option>`
  }
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 處理中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = null
    const photoInput = document.getElementById('photo_file')
    
    // 上傳照片
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `staff_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 儲存資料
    const newStaff = {
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value || null,
      role: document.getElementById('role').value,
      branch_id: document.getElementById('branch_id').value,
      base_salary: parseInt(document.getElementById('base_salary').value) || 0,
      hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      photo_url: finalPhotoUrl
    }

    const { error } = await supabase.from('staff').insert([newStaff])
    if (error) throw new Error('儲存失敗：' + error.message)

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存資料'
    submitBtn.disabled = false
  }
})

loadBranches()

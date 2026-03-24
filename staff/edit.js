import { supabase } from '../config.js'

const urlParams = new URLSearchParams(window.location.search)
const staffId = urlParams.get('id')

const loadingState = document.getElementById('loading-state')
const editForm = document.getElementById('edit-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

let existingPhotoUrl = null

if (!staffId) {
  alert('無法取得指定的教職員資料！')
  window.location.href = './index.html'
}

async function initEditPage() {
  try {
    // 抓取分校清單
    const { data: branchesData, error: branchError } = await supabase.from('branches').select('id, name')
    if (branchError) throw branchError
    
    branchSelect.innerHTML = '<option value="" disabled>請選擇分校</option>'
    branchesData.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchSelect.appendChild(option)
    })

    // 抓取教職員資料
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single()

    if (staffError || !staffData) throw new Error('讀取資料失敗')

    // 填入資料
    document.getElementById('name').value = staffData.name || ''
    document.getElementById('phone').value = staffData.phone || ''
    document.getElementById('role').value = staffData.role || 'teacher'
    document.getElementById('base_salary').value = staffData.base_salary || 0
    document.getElementById('hourly_rate').value = staffData.hourly_rate || 0
    
    if (staffData.branch_id) {
      branchSelect.value = staffData.branch_id
    }

    // 處理照片預覽
    existingPhotoUrl = staffData.photo_url
    if (existingPhotoUrl) {
      document.getElementById('current-photo-container').style.display = 'flex'
      document.getElementById('current-photo-img').src = existingPhotoUrl
    }

    loadingState.style.display = 'none'
    editForm.style.display = 'block'

  } catch (err) {
    alert(err.message)
    window.location.href = './index.html'
  }
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = existingPhotoUrl
    const photoInput = document.getElementById('photo_file')
    
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `staff_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    const updatedData = {
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value || null,
      role: document.getElementById('role').value,
      branch_id: document.getElementById('branch_id').value,
      base_salary: parseInt(document.getElementById('base_salary').value) || 0,
      hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      photo_url: finalPhotoUrl
    }

    const { error } = await supabase.from('staff').update(updatedData).eq('id', staffId)
    if (error) throw new Error('更新失敗：' + error.message)

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存修改'
    submitBtn.disabled = false
  }
})

initEditPage()

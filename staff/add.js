import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

async function loadBranches() {
  try {
    const { data, error } = await supabase.from('branches').select('id, name')
    if (error) throw error

    branchSelect.innerHTML = '<option value="" disabled selected>請選擇歸屬分校</option>'
    if (data && data.length > 0) {
      data.forEach(b => {
        const option = document.createElement('option')
        option.value = b.id
        option.textContent = b.name
        branchSelect.appendChild(option)
      })
    } else {
      branchSelect.innerHTML = '<option value="" disabled selected>請先至分校管理新增分校</option>'
    }
  } catch (err) {
    console.error('讀取分校失敗:', err)
  }
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 處理中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = null
    const photoInput = document.getElementById('photo_file')
    
    // 上傳大頭照
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `staff_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 彙整所有 HR 資料
    const newStaff = {
      // 1. 基本資料
      photo_url: finalPhotoUrl,
      name: document.getElementById('name').value,
      staff_number: document.getElementById('staff_number').value || null,
      id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null,
      phone: document.getElementById('phone').value,
      
      // 2. 職務薪資
      branch_id: document.getElementById('branch_id').value,
      role: document.getElementById('role').value,
      base_salary: parseInt(document.getElementById('base_salary').value) || 0,
      hourly_rate: parseInt(document.getElementById('hourly_rate').value) || 0,
      
      // 3. 保險設定
      labor_insurance_date: document.getElementById('labor_insurance_date').value || null,
      labor_insurance_amount: parseInt(document.getElementById('labor_insurance_amount').value) || 0,
      health_insurance_date: document.getElementById('health_insurance_date').value || null,
      health_insurance_amount: parseInt(document.getElementById('health_insurance_amount').value) || 0,
      group_insurance_date: document.getElementById('group_insurance_date').value || null
    }

    const { error } = await supabase.from('staff').insert([newStaff])
    if (error) {
      // 處理資料庫 UNIQUE 欄位重複的問題
      if (error.code === '23505') throw new Error('儲存失敗：身分證字號或人事編號已存在！')
      throw new Error('儲存失敗：' + error.message)
    }

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存人事資料'
    submitBtn.disabled = false
  }
})

loadBranches()

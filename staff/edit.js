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

// 初始化頁面：同時載入「分校清單」與「教職員舊資料」
async function initEditPage() {
  try {
    // 1. 抓取分校清單
    const { data: branchesData, error: branchError } = await supabase.from('branches').select('id, name')
    if (branchError) throw branchError
    
    branchSelect.innerHTML = '<option value="" disabled>請選擇歸屬分校</option>'
    branchesData.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchSelect.appendChild(option)
    })

    // 2. 抓取教職員資料
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single()

    if (staffError || !staffData) throw new Error('讀取資料失敗')

    // 3. 將資料填入畫面的表單欄位
    // 區塊一：基本身分
    document.getElementById('name').value = staffData.name || ''
    document.getElementById('staff_number').value = staffData.staff_number || ''
    document.getElementById('id_number').value = staffData.id_number || ''
    document.getElementById('birthday').value = staffData.birthday || ''
    document.getElementById('phone').value = staffData.phone || ''
    
    // 區塊二：職務薪資
    document.getElementById('role').value = staffData.role || 'teacher'
    document.getElementById('base_salary').value = staffData.base_salary || 0
    document.getElementById('hourly_rate').value = staffData.hourly_rate || 0
    if (staffData.branch_id) {
      branchSelect.value = staffData.branch_id
    }

    // 區塊三：保險管理
    document.getElementById('labor_insurance_date').value = staffData.labor_insurance_date || ''
    document.getElementById('labor_insurance_amount').value = staffData.labor_insurance_amount || 0
    document.getElementById('health_insurance_date').value = staffData.health_insurance_date || ''
    document.getElementById('health_insurance_amount').value = staffData.health_insurance_amount || 0
    document.getElementById('group_insurance_date').value = staffData.group_insurance_date || ''

    // 處理照片預覽
    existingPhotoUrl = staffData.photo_url
    if (existingPhotoUrl) {
      document.getElementById('current-photo-container').style.display = 'flex'
      document.getElementById('current-photo-img').src = existingPhotoUrl
    }

    // 隱藏載入動畫，顯示表單
    loadingState.style.display = 'none'
    editForm.style.display = 'block'

  } catch (err) {
    alert(err.message)
    window.location.href = './index.html'
  }
}

// 處理表單送出更新
editForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = existingPhotoUrl
    const photoInput = document.getElementById('photo_file')
    
    // 如果有選新圖片，上傳並覆蓋舊網址
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `staff_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 彙整更新的 HR 資料
    const updatedData = {
      // 1. 基本資料
      photo_url: finalPhotoUrl,
      name: document.getElementById('name').value,
      staff_number: document.getElementById('staff_number').value || null,
      id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null,
      phone: document.getElementById('phone').value,
      
      // 2. 職務薪資
      branch_id: branchSelect.value,
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

    const { error } = await supabase.from('staff').update(updatedData).eq('id', staffId)
    if (error) {
      if (error.code === '23505') throw new Error('更新失敗：身分證字號或人事編號與其他員工重複！')
      throw new Error('更新失敗：' + error.message)
    }

    // 成功後返回列表
    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存 HR 資料'
    submitBtn.disabled = false
  }
})

// 啟動頁面初始化
initEditPage()

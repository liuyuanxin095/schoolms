import { supabase } from '../config.js'

const urlParams = new URLSearchParams(window.location.search)
const studentId = urlParams.get('id')

const loadingState = document.getElementById('loading-state')
const editForm = document.getElementById('edit-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

let existingPhotoUrl = null // 儲存舊照片網址

if (!studentId) {
  alert('無法取得指定的學生資料！')
  window.location.href = './index.html'
}

// 1. 同時載入「分校清單」與「學生舊資料」
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

    // 抓取學生資料
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (studentError || !studentData) throw new Error('讀取學生資料失敗')

    // 填入資料
    document.getElementById('name').value = studentData.name || ''
    document.getElementById('student_number').value = studentData.student_number || ''
    document.getElementById('id_number').value = studentData.id_number || ''
    document.getElementById('birthday').value = studentData.birthday || ''
    document.getElementById('school').value = studentData.school || ''
    document.getElementById('grade').value = studentData.grade || ''
    document.getElementById('parent_name').value = studentData.parent_name || ''
    document.getElementById('parent_phone').value = studentData.parent_phone || ''
    
    // 設定下拉選單的值
    if (studentData.branch_id) {
      branchSelect.value = studentData.branch_id
    }

    // 處理舊照片預覽
    existingPhotoUrl = studentData.photo_url
    if (existingPhotoUrl) {
      document.getElementById('current-photo-container').style.display = 'flex'
      document.getElementById('current-photo-img').src = existingPhotoUrl
    }

    // 切換畫面顯示
    loadingState.style.display = 'none'
    editForm.style.display = 'block'

  } catch (err) {
    alert(err.message)
    window.location.href = './index.html'
  }
}

// 2. 處理表單送出
editForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = existingPhotoUrl // 預設保留舊照片
    const photoInput = document.getElementById('photo_file')
    
    // 如果有選新圖片，上傳並覆蓋網址
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `student_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 準備更新資料
    const updatedData = {
      branch_id: branchSelect.value,
      student_number: document.getElementById('student_number').value || null,
      name: document.getElementById('name').value,
      id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null,
      school: document.getElementById('school').value,
      grade: document.getElementById('grade').value,
      parent_name: document.getElementById('parent_name').value,
      parent_phone: document.getElementById('parent_phone').value,
      photo_url: finalPhotoUrl
    }

    // 寫入資料庫
    const { error } = await supabase
      .from('students')
      .update(updatedData)
      .eq('id', studentId)

    if (error) throw new Error('更新失敗：' + error.message)

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存修改'
    submitBtn.disabled = false
  }
})

// 啟動畫面初始化
initEditPage()

import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

// 網頁載入時，先抓取分校清單並產生下拉選項
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) {
    data.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchSelect.appendChild(option)
    })
  }
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 處理中...'
  submitBtn.disabled = true

  try {
    let finalPhotoUrl = null
    const photoInput = document.getElementById('photo_file')
    
    // 步驟一：如果有選擇圖片，先執行上傳
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `student_${Date.now()}.${fileExt}` // 產生唯一檔名

      // 上傳到剛建好的 avatars 資料夾
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      // 取得圖片的公開網址
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 步驟二：儲存學生資料
    const newStudent = {
      branch_id: document.getElementById('branch_id').value,
      student_number: document.getElementById('student_number').value || null,
      name: document.getElementById('name').value,
      id_number: document.getElementById('id_number').value || null,
      birthday: document.getElementById('birthday').value || null,
      school: document.getElementById('school').value,
      grade: document.getElementById('grade').value,
      parent_name: document.getElementById('parent_name').value,
      parent_phone: document.getElementById('parent_phone').value,
      photo_url: finalPhotoUrl // 寫入剛剛拿到的雲端圖片網址
    }

    const { error } = await supabase.from('students').insert([newStudent])
    if (error) throw new Error('資料儲存失敗：' + error.message)

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存資料'
    submitBtn.disabled = false
  }
})

loadBranches()

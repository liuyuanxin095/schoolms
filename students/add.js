import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

// 載入分校清單 (強化防呆版)
async function loadBranches() {
  try {
    const { data, error } = await supabase.from('branches').select('id, name')
    if (error) throw error

    // 清空原本的「載入中...」文字
    branchSelect.innerHTML = '<option value="" disabled selected>請選擇分校</option>'

    if (data && data.length > 0) {
      data.forEach(b => {
        const option = document.createElement('option')
        option.value = b.id
        option.textContent = b.name
        branchSelect.appendChild(option)
      })
    } else {
      branchSelect.innerHTML = '<option value="" disabled selected>目前沒有分校資料，請先至分校管理新增</option>'
    }
  } catch (err) {
    console.error('讀取分校失敗:', err)
    branchSelect.innerHTML = `<option value="" disabled selected>讀取失敗: ${err.message}</option>`
  }
}

// 處理表單送出
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

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗：' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      finalPhotoUrl = publicUrlData.publicUrl
    }

    // 步驟二：儲存學生資料
    const newStudent = {
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

    const { error } = await supabase.from('students').insert([newStudent])
    if (error) throw new Error('資料儲存失敗：' + error.message)

    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存資料'
    submitBtn.disabled = false
  }
})

// 啟動載入分校
loadBranches()

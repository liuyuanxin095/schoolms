import { supabase } from '../config.js'

const addForm = document.getElementById('add-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

// 載入分校下拉選單
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
    console.error('讀取分校失敗:', err)
  }
}

// 送出表單
addForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 處理中...'
  submitBtn.disabled = true

  const newClassroom = {
    branch_id: branchSelect.value,
    name: document.getElementById('name').value,
    capacity: parseInt(document.getElementById('capacity').value) || 0,
    facilities: document.getElementById('facilities').value || null,
    status: document.getElementById('status').value
  }

  const { error } = await supabase.from('classrooms').insert([newClassroom])

  if (error) {
    alert('儲存失敗：' + error.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存教室'
    submitBtn.disabled = false
  } else {
    window.location.href = './index.html'
  }
})

loadBranches()

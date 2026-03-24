import { supabase } from '../config.js'

// 從網址列抓取教室 ID
const urlParams = new URLSearchParams(window.location.search)
const classroomId = urlParams.get('id')

const loadingState = document.getElementById('loading-state')
const editForm = document.getElementById('edit-form')
const submitBtn = document.getElementById('submit-btn')
const branchSelect = document.getElementById('branch_id')

if (!classroomId) {
  alert('無法取得指定的教室資料！')
  window.location.href = './index.html'
}

// 初始化頁面：載入分校清單與教室舊資料
async function initEditPage() {
  try {
    // 1. 抓取分校清單
    const { data: branchesData, error: branchError } = await supabase.from('branches').select('id, name')
    if (branchError) throw branchError
    
    branchSelect.innerHTML = '<option value="" disabled>請選擇分校</option>'
    branchesData.forEach(b => {
      const option = document.createElement('option')
      option.value = b.id
      option.textContent = b.name
      branchSelect.appendChild(option)
    })

    // 2. 抓取這間教室的現有資料
    const { data: roomData, error: roomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single()

    if (roomError || !roomData) throw new Error('讀取教室資料失敗')

    // 3. 填入畫面的表單欄位
    document.getElementById('name').value = roomData.name || ''
    document.getElementById('capacity').value = roomData.capacity || 0
    document.getElementById('facilities').value = roomData.facilities || ''
    document.getElementById('status').value = roomData.status || '可用'
    
    // 設定分校下拉選單的值
    if (roomData.branch_id) {
      branchSelect.value = roomData.branch_id
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
    const updatedData = {
      branch_id: branchSelect.value,
      name: document.getElementById('name').value,
      capacity: parseInt(document.getElementById('capacity').value) || 0,
      facilities: document.getElementById('facilities').value || null,
      status: document.getElementById('status').value
    }

    const { error } = await supabase
      .from('classrooms')
      .update(updatedData)
      .eq('id', classroomId)

    if (error) throw new Error('更新失敗：' + error.message)

    // 成功後返回列表
    window.location.href = './index.html'

  } catch (err) {
    alert(err.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存修改'
    submitBtn.disabled = false
  }
})

// 啟動頁面初始化
initEditPage()

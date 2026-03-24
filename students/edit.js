import { supabase } from '../config.js'

// 1. 從網址列解析出學生 ID (例如抓取 edit.html?id=12345 中的 12345)
const urlParams = new URLSearchParams(window.location.search)
const studentId = urlParams.get('id')

// UI 元素綁定
const loadingState = document.getElementById('loading-state')
const editForm = document.getElementById('edit-form')
const submitBtn = document.getElementById('submit-btn')

// 如果網址沒有帶 ID，直接退回列表頁防呆
if (!studentId) {
  alert('無法取得指定的學生資料！')
  window.location.href = './index.html'
}

// 2. 載入該學生的現有資料
async function loadStudentData() {
  // 使用 .eq('id', studentId).single() 確保只精準抓出一筆資料
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (error || !data) {
    alert('讀取資料失敗，請確認該學生是否存在。')
    window.location.href = './index.html'
    return
  }

  // 將資料庫撈回來的舊資料，填入對應的輸入框中
  document.getElementById('name').value = data.name || ''
  document.getElementById('id_number').value = data.id_number || ''
  document.getElementById('birthday').value = data.birthday || ''
  document.getElementById('school').value = data.school || ''
  document.getElementById('grade').value = data.grade || ''
  document.getElementById('parent_name').value = data.parent_name || ''
  document.getElementById('parent_phone').value = data.parent_phone || ''
  document.getElementById('photo_url').value = data.photo_url || ''

  // 資料填妥後，隱藏載入提示，顯示表單
  loadingState.style.display = 'none'
  editForm.style.display = 'block'
}

// 3. 處理表單送出（更新資料）
editForm.addEventListener('submit', async (e) => {
  e.preventDefault() // 防止重整頁面
  
  // 避免重複點擊
  submitBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> 儲存中...'
  submitBtn.disabled = true

  // 收集畫面上最新的值
  const updatedData = {
    name: document.getElementById('name').value,
    id_number: document.getElementById('id_number').value || null,
    birthday: document.getElementById('birthday').value || null,
    school: document.getElementById('school').value,
    grade: document.getElementById('grade').value,
    parent_name: document.getElementById('parent_name').value,
    parent_phone: document.getElementById('parent_phone').value,
    photo_url: document.getElementById('photo_url').value || null,
  }

  // 發送更新請求 (使用 .update() 並指定該學生的 ID)
  const { error } = await supabase
    .from('students')
    .update(updatedData)
    .eq('id', studentId)

  if (error) {
    alert('更新失敗：' + error.message)
    submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> 儲存修改'
    submitBtn.disabled = false
  } else {
    // 更新成功，跳轉回列表頁
    window.location.href = './index.html'
  }
})

// 網頁載入時自動執行讀取
loadStudentData()

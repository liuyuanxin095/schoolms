import { supabase } from '../config.js'

const viewList = document.getElementById('view-list')
const viewEditor = document.getElementById('view-editor')

const notificationList = document.getElementById('notification-list')
const filterBranch = document.getElementById('filter-branch')
const filterClass = document.getElementById('filter-class')
const studentList = document.getElementById('student-list')
const selectAllCheckbox = document.getElementById('select-all')
const selectedCountLabel = document.getElementById('selected-count')

let allNotifications = []
let allClasses = []
let currentStudents = []

// 1. 畫面切換器
window.switchView = (viewName) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  if (viewName === 'list') {
    viewList.classList.add('active'); fetchNotifications()
  }
  if (viewName === 'editor') {
    viewEditor.classList.add('active')
    document.getElementById('notify-form').reset()
    document.getElementById('image-preview').style.display = 'none'
    document.getElementById('upload-hint').style.display = 'block'
    selectAllCheckbox.checked = false
    updateSelectedCount()
    window.handleFilterChange() // 預設載入全體名單
  }
  window.scrollTo(0, 0)
}

// 2. 載入通知歷史紀錄
async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
  if (error) { notificationList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`; return }
  
  allNotifications = data || []
  notificationList.innerHTML = ''
  
  if (allNotifications.length === 0) {
    notificationList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">尚無發送紀錄</td></tr>'
    return
  }

  allNotifications.forEach(n => {
    const dateStr = new Date(n.created_at).toLocaleString('zh-TW', { hour12: false })
    const snippet = n.content.length > 30 ? n.content.substring(0, 30) + '...' : n.content
    const imgIcon = n.image_url ? `<a href="${n.image_url}" target="_blank" style="color: var(--primary);"><span class="material-symbols-outlined">image</span></a>` : '<span style="color: var(--border);">-</span>'
    
    const row = document.createElement('tr')
    row.innerHTML = `
      <td style="font-size:13px; color:var(--text-light);">${dateStr}</td>
      <td>
        <div style="font-weight:bold; color:var(--text-main); margin-bottom:4px;">${n.title}</div>
        <div style="font-size:12px; color:var(--text-light);">${snippet}</div>
      </td>
      <td>${imgIcon}</td>
      <td><span style="background:#e0e7ff; color:var(--primary); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600;">${n.recipient_count} 人</span></td>
      <td>
        <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteNotification('${n.id}', '${n.title}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </td>
    `
    notificationList.appendChild(row)
  })
}

// 3. 載入篩選器資料 (分校與班級)
async function loadFilters() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) bData.forEach(b => filterBranch.appendChild(new Option(b.name, b.id)))

  const { data: cData } = await supabase.from('classes').select('id, name, branch_id')
  if (cData) allClasses = cData
}

// 4. 處理篩選器變更 (連動下拉選單並抓取學生)
window.handleFilterChange = async () => {
  const bId = filterBranch.value
  const cId = filterClass.value

  // 更新班級下拉選單 (根據分校)
  const currentClassVal = filterClass.value
  filterClass.innerHTML = '<option value="all">不限班級</option>'
  allClasses.forEach(c => {
    if (bId === 'all' || c.branch_id === bId) filterClass.appendChild(new Option(c.name, c.id))
  })
  // 試著保留剛剛選擇的班級
  if (Array.from(filterClass.options).some(opt => opt.value === currentClassVal)) filterClass.value = currentClassVal

  studentList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">過濾名單中...</div>'
  
  try {
    let query;
    if (filterClass.value !== 'all') {
      // 依班級抓取
      const { data } = await supabase.from('class_students').select('students(id, name, student_number)').eq('class_id', filterClass.value)
      currentStudents = data ? data.map(d => d.students).filter(Boolean) : []
    } else if (filterBranch.value !== 'all') {
      // 依分校抓取
      const { data } = await supabase.from('students').select('id, name, student_number').eq('branch_id', filterBranch.value)
      currentStudents = data || []
    } else {
      // 抓取全體
      const { data } = await supabase.from('students').select('id, name, student_number')
      currentStudents = data || []
    }

    // 依學號升冪排序
    currentStudents.sort((a, b) => (a.student_number || '').localeCompare(b.student_number || '', 'zh-TW', { numeric: true }))

    renderStudentList()
  } catch (err) {
    studentList.innerHTML = `<div style="text-align:center; color:red; padding:20px;">抓取失敗: ${err.message}</div>`
  }
}

// 5. 渲染學生核取清單
function renderStudentList() {
  studentList.innerHTML = ''
  selectAllCheckbox.checked = false
  updateSelectedCount()

  if (currentStudents.length === 0) {
    studentList.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-light);">此條件下沒有學生</div>'
    return
  }

  currentStudents.forEach(s => {
    const label = document.createElement('label')
    label.className = 'roster-item'
    label.innerHTML = `
      <input type="checkbox" class="student-cb" value="${s.id}" onchange="window.updateSelectedCount()">
      <div>
        <div style="font-weight:600; color:var(--text-main);">${s.name}</div>
        <div style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</div>
      </div>
    `
    studentList.appendChild(label)
  })
}

// 全選與計數邏輯
window.toggleSelectAll = () => {
  const isChecked = selectAllCheckbox.checked
  document.querySelectorAll('.student-cb').forEach(cb => cb.checked = isChecked)
  updateSelectedCount()
}

window.updateSelectedCount = () => {
  const count = document.querySelectorAll('.student-cb:checked').length
  selectedCountLabel.textContent = count
  // 檢查是否已手動全選
  const total = document.querySelectorAll('.student-cb').length
  if (total > 0) selectAllCheckbox.checked = (count === total)
}

// 6. 圖片預覽處理
window.previewImage = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById('image-preview').src = e.target.result
      document.getElementById('image-preview').style.display = 'block'
      document.getElementById('upload-hint').style.display = 'none'
    }
    reader.readAsDataURL(file)
  }
}

// 7. 發送通知邏輯
window.sendNotification = async () => {
  const title = document.getElementById('noti_title').value
  const content = document.getElementById('noti_content').value
  const checkedCbs = document.querySelectorAll('.student-cb:checked')
  
  if (!title || !content) { alert('通知主旨與詳細內文為必填！'); return }
  if (checkedCbs.length === 0) { alert('請至少選擇一位發送對象！'); return }

  const btnSend = document.getElementById('btn-send')
  btnSend.disabled = true; btnSend.textContent = '發送中...'

  try {
    let finalImageUrl = null
    const photoInput = document.getElementById('noti_image')
    
    // 如果有圖片，上傳到 avatars bucket (借用該空間)
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0]
      const fileName = `notify_${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw new Error('圖片上傳失敗')
      finalImageUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
    }

    // 寫入資料庫
    const payload = {
      title: title,
      content: content,
      image_url: finalImageUrl,
      recipient_count: checkedCbs.length
    }

    const { error } = await supabase.from('notifications').insert([payload])
    if (error) throw error

    alert(`✅ 通知發送成功！共發送給 ${checkedCbs.length} 位學生/家長。`)
    window.switchView('list')

  } catch (err) {
    alert('發送失敗：' + err.message)
  } finally {
    btnSend.disabled = false; btnSend.innerHTML = '<span class="material-symbols-outlined">send</span> 確認發送'
  }
}

// 8. 刪除紀錄
window.deleteNotification = async (id, title) => {
  if (!confirm(`確定要刪除「${title}」這筆發送紀錄嗎？`)) return
  await supabase.from('notifications').delete().eq('id', id)
  fetchNotifications()
}

// 啟動
loadFilters().then(fetchNotifications)

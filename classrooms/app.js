import { supabase } from '../config.js'

// 視圖
const viewList = document.getElementById('view-list')
const viewCalendar = document.getElementById('view-calendar')
const tabBtns = document.querySelectorAll('.tab-btn')

// 列表區
const classroomList = document.getElementById('classroom-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')

// 行事曆區
const calBranchSelect = document.getElementById('cal-branch-select')
const calClassroomSelect = document.getElementById('cal-classroom-select')
const calendarContainer = document.getElementById('calendar-container')
const calendarEmptyState = document.getElementById('calendar-empty-state')

// 表單 Modal
const formModal = document.getElementById('form-modal')
const classroomForm = document.getElementById('classroom-form')
const branchSelect = document.getElementById('branch_id')

let allClassrooms = []
let allBranches = []
let allClasses = []
let calendar = null // FullCalendar 實例

// 💡 1. 模組切換 (處理 FullCalendar 的渲染問題)
window.switchTab = (viewName) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  tabBtns.forEach(btn => btn.classList.remove('active'))
  
  if (viewName === 'list') { 
    viewList.classList.add('active'); tabBtns[0].classList.add('active') 
  }
  if (viewName === 'calendar') { 
    viewCalendar.classList.add('active'); tabBtns[1].classList.add('active') 
    // 若行事曆已初始化，切換畫面時需要強制重新渲染尺寸
    if (calendar) setTimeout(() => calendar.render(), 10)
  }
}

// 2. 載入基礎資料 (分校、教室)
async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) {
    allBranches = bData
    bData.forEach(b => {
      branchFilter.appendChild(new Option(b.name, b.id))
      branchSelect.appendChild(new Option(b.name, b.id))
      calBranchSelect.appendChild(new Option(b.name, b.id))
    })
  }

  // 抓取所有的排課資料 (準備給行事曆用)
  const { data: cData } = await supabase.from('classes').select('id, name, classroom_id, schedule, start_date, end_date, staff!classes_teacher_id_fkey(name)')
  if (cData) allClasses = cData

  await fetchClassrooms()
}

// 3. 教室建檔列表邏輯
async function fetchClassrooms() {
  const { data, error } = await supabase.from('classrooms').select('*, branches(name)').order('name', { ascending: true })
  if (error) { classroomList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗</td></tr>`; return }
  allClassrooms = data || []
  renderTable(allClassrooms)
}

function renderTable(data) {
  classroomList.innerHTML = ''
  if (data.length === 0) { classroomList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">目前沒有教室資料</td></tr>'; return }

  data.forEach(c => {
    const branchName = c.branches ? c.branches.name : '-'
    const isActive = c.status === '可用'
    const statusClass = isActive ? 'status-active' : 'status-inactive'
    const statusIcon = isActive ? 'check_circle' : 'construction'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${branchName}</td>
      <td>${c.capacity ? c.capacity + ' 人' : '-'}</td>
      <td><span class="status-badge ${statusClass}"><span class="material-symbols-outlined" style="font-size:14px;">${statusIcon}</span>${c.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="修改" onclick="window.openFormModal('${c.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除" onclick="window.deleteClassroom('${c.id}', '${c.name}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    classroomList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  const filtered = allClassrooms.filter(c => {
    const matchKey = c.name.toLowerCase().includes(keyword)
    const matchBranch = branchId === 'all' || c.branch_id === branchId
    return matchKey && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)

// 表單操作
window.openFormModal = (id = null) => {
  classroomForm.reset(); document.getElementById('classroom-id').value = id || ''
  if (id) {
    document.getElementById('form-title').textContent = '修改教室資料'
    const c = allClassrooms.find(x => x.id === id)
    if (c) {
      document.getElementById('branch_id').value = c.branch_id || ''
      document.getElementById('name').value = c.name || ''
      document.getElementById('capacity').value = c.capacity || ''
      document.getElementById('status').value = c.status || '可用'
    }
  } else { document.getElementById('form-title').textContent = '新增教室' }
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

classroomForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('classroom-id').value
    const payload = {
      branch_id: document.getElementById('branch_id').value,
      name: document.getElementById('name').value,
      capacity: parseInt(document.getElementById('capacity').value) || null,
      status: document.getElementById('status').value
    }
    const { error } = id ? await supabase.from('classrooms').update(payload).eq('id', id) : await supabase.from('classrooms').insert([payload])
    if (error) throw error
    window.closeFormModal(); await fetchClassrooms()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { btn.disabled = false; btn.textContent = '儲存資料' }
})

window.deleteClassroom = async (id, name) => {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return
  await supabase.from('classrooms').delete().eq('id', id); fetchClassrooms()
}

// ==========================================
// 💡 [核心] FullCalendar 課表渲染引擎
// ==========================================
window.handleCalBranchChange = () => {
  const bId = calBranchSelect.value
  calClassroomSelect.innerHTML = '<option value="" disabled selected>請選擇教室...</option>'
  const targetClassrooms = allClassrooms.filter(c => c.branch_id === bId)
  targetClassrooms.forEach(c => calClassroomSelect.appendChild(new Option(c.name, c.id)))
  
  calendarContainer.style.display = 'none'
  calendarEmptyState.style.display = 'block'
}

window.loadClassroomCalendar = () => {
  const classroomId = calClassroomSelect.value
  if (!classroomId) return

  calendarContainer.style.display = 'block'
  calendarEmptyState.style.display = 'none'

  // 1. 抓取該教室的所有班級課程
  const roomClasses = allClasses.filter(c => c.classroom_id === classroomId)
  const events = []

  // 星期對應字典 (FullCalendar 0 是週日)
  const dayMap = { '星期日': 0, '週日': 0, '星期一': 1, '週一': 1, '星期二': 2, '週二': 2, '星期三': 3, '週三': 3, '星期四': 4, '週四': 4, '星期五': 5, '週五': 5, '星期六': 6, '週六': 6 }

  // 2. 解析我們在班級模組存入的字串 (例如: "週一 18:30~21:30, 週三 18:30~21:30")
  roomClasses.forEach(c => {
    if (!c.schedule) return
    const slots = c.schedule.split(', ')
    
    slots.forEach(slot => {
      // 擷取中文星期與時間
      const match = slot.match(/(星期[一二三四五六日]|週[一二三四五六日])\s*(\d{2}:\d{2})~(\d{2}:\d{2})/)
      if (match) {
        const dayStr = match[1]
        const startTime = match[2]
        const endTime = match[3]
        const dayNum = dayMap[dayStr]

        if (dayNum !== undefined) {
          // 轉換成 FullCalendar 的重複事件格式
          events.push({
            title: c.name,
            daysOfWeek: [dayNum],
            startTime: startTime + ':00',
            endTime: endTime + ':00',
            startRecur: c.start_date || undefined,  // 開課日
            endRecur: c.end_date || undefined,      // 結業日
            extendedProps: {
              teacher: c.staff ? c.staff.name : '未指派'
            },
            backgroundColor: '#3b82f6', // 藍色系
            borderColor: '#2563eb'
          })
        }
      }
    })
  })

  // 3. 初始化或重新載入 FullCalendar
  const calendarEl = document.getElementById('calendar')
  
  if (calendar) {
    // 若已存在，清除舊事件，加入新事件
    calendar.removeAllEventSources()
    calendar.addEventSource(events)
  } else {
    // 第一次初始化
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek', // 預設顯示週課表
      locale: 'zh-tw',             // 中文化
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay' // 允許切換週/日
      },
      slotMinTime: '08:00:00', // 早上8點開始
      slotMaxTime: '23:00:00', // 晚上11點結束
      allDaySlot: false,       // 關閉整天選項 (補習班都是算時數的)
      events: events,
      eventContent: function(arg) {
        // 自訂行事曆方塊內的排版
        return {
          html: `
            <div style="padding: 3px 5px; font-family: sans-serif; overflow: hidden; color: white;">
              <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px; white-space: nowrap; text-overflow: ellipsis;">${arg.event.title}</div>
              <div style="font-size: 11px; opacity: 0.9; display: flex; align-items: center; gap: 3px;">
                <span class="material-symbols-outlined" style="font-size: 12px;">school</span> ${arg.event.extendedProps.teacher}
              </div>
            </div>
          `
        }
      }
    })
    calendar.render()
  }
}

// 啟動
initData()

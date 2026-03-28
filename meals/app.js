import { supabase } from '../config.js'

// 視圖控制
const viewWallet = document.getElementById('view-wallet')
const viewOrders = document.getElementById('view-orders')
const tabBtns = document.querySelectorAll('.tab-btn')

// 錢包區
const walletList = document.getElementById('wallet-list')
const walletSearch = document.getElementById('wallet-search')
const walletBranchFilter = document.getElementById('wallet-branch-filter')

// 訂餐區
const orderList = document.getElementById('order-list')
const orderSearch = document.getElementById('order-search')
const orderClassFilter = document.getElementById('order-class-filter')
const orderDateInput = document.getElementById('order-date')

// Modal
const transModal = document.getElementById('transaction-modal')
const transForm = document.getElementById('transaction-form')
const historyModal = document.getElementById('history-modal')

let allStudents = []; let allClasses = []
let dailyOrders = []

// 初始化設定今日日期
const todayStr = new Date().toISOString().split('T')[0]
orderDateInput.value = todayStr

// 💡 1. 模組視圖切換
window.switchTab = (viewName) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  tabBtns.forEach(btn => btn.classList.remove('active'))
  
  if (viewName === 'wallet') { viewWallet.classList.add('active'); tabBtns[0].classList.add('active'); renderWallet() }
  if (viewName === 'orders') { viewOrders.classList.add('active'); tabBtns[1].classList.add('active'); window.loadDailyOrders() }
}

// 💡 2. 初始載入基礎資料 (學生、分校、班級)
async function initData() {
  const { data: bData } = await supabase.from('branches').select('id, name')
  if (bData) bData.forEach(b => walletBranchFilter.appendChild(new Option(b.name, b.id)))

  const { data: cData } = await supabase.from('classes').select('id, name')
  if (cData) {
    allClasses = cData
    cData.forEach(c => orderClassFilter.appendChild(new Option(c.name, c.id)))
  }

  const { data: sData } = await supabase.from('students').select('id, name, student_number, meal_balance, branches(name)').order('name', { ascending: true })
  if (sData) allStudents = sData
  
  renderWallet()
}

// ==========================================
// 💡 [模組一] 錢包與儲值邏輯
// ==========================================
function renderWallet() {
  const keyword = walletSearch.value.toLowerCase(); const branchId = walletBranchFilter.value
  const filtered = allStudents.filter(s => {
    const matchKey = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || s.branches?.name === walletBranchFilter.options[walletBranchFilter.selectedIndex].text
    return matchKey && matchBranch
  })

  walletList.innerHTML = ''
  document.getElementById('select-all').checked = false; window.updateSelectedCount()

  if (filtered.length === 0) { walletList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">查無資料</td></tr>'; return }

  filtered.forEach(s => {
    const balance = s.meal_balance || 0
    const badgeClass = balance < 100 ? 'balance-warning' : 'balance-safe'
    walletList.innerHTML += `
      <tr>
        <td><input type="checkbox" class="student-cb" value="${s.id}" onchange="window.updateSelectedCount()"></td>
        <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</span></td>
        <td>${s.branches ? s.branches.name : '-'}</td>
        <td><span class="balance-badge ${badgeClass}">$${balance}</span></td>
        <td>
          <div style="display:flex; gap:5px;">
            <button class="btn-icon" title="儲值" onclick="window.openTransModal('deposit', '${s.id}', '${s.name}', ${balance})" style="color:#16a34a; background:#f0fdf4; border-radius:6px; padding:6px;"><span class="material-symbols-outlined" style="font-size:18px;">add_card</span></button>
            <button class="btn-icon" title="歷史明細" onclick="window.openHistoryModal('${s.id}', '${s.name}')" style="background:#f3f4f6; border-radius:6px; padding:6px;"><span class="material-symbols-outlined" style="font-size:18px;">history</span></button>
          </div>
        </td>
      </tr>`
  })
}

walletSearch.addEventListener('input', renderWallet); walletBranchFilter.addEventListener('change', renderWallet)

window.toggleSelectAll = () => {
  const isChecked = document.getElementById('select-all').checked
  document.querySelectorAll('.student-cb').forEach(cb => cb.checked = isChecked)
  window.updateSelectedCount()
}
window.updateSelectedCount = () => {
  const count = document.querySelectorAll('.student-cb:checked').length
  document.getElementById('selected-count').textContent = count
  document.getElementById('btn-batch-deduct').disabled = count === 0
}
window.openBatchModal = () => window.openTransModal('manual_deduct', 'batch', '批次扣款', 0)

// ==========================================
// 💡 [模組二] 每日訂餐與結算邏輯
// ==========================================
window.loadDailyOrders = async () => {
  orderList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">載入中...</td></tr>'
  const targetDate = orderDateInput.value; const classId = orderClassFilter.value; const keyword = orderSearch.value.toLowerCase()

  try {
    // 1. 抓取這天的所有訂單
    const { data: orders } = await supabase.from('meal_logs').select('*').limit(0) // 佔位
    const { data: realOrders, error } = await supabase.from('meal_orders').select('*').eq('order_date', targetDate)
    if (error) throw error
    dailyOrders = realOrders || []

    // 2. 決定要顯示的學生名單
    let displayStudents = allStudents
    if (classId !== 'all') {
      const { data: roster } = await supabase.from('class_students').select('student_id').eq('class_id', classId)
      const cIds = roster ? roster.map(r => r.student_id) : []
      displayStudents = allStudents.filter(s => cIds.includes(s.id))
    }
    if (keyword) displayStudents = displayStudents.filter(s => s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword)))

    // 3. 統計與渲染
    let lunchTotal = 0, dinnerTotal = 0
    orderList.innerHTML = ''
    
    if (displayStudents.length === 0) { orderList.innerHTML = '<tr><td colspan="5" style="text-align:center;">無學生資料</td></tr>'; return }

    displayStudents.forEach(s => {
      // 找出該學生的訂單
      const lOrder = dailyOrders.find(o => o.student_id === s.id && o.meal_type === '午餐')
      const dOrder = dailyOrders.find(o => o.student_id === s.id && o.meal_type === '晚餐')
      
      if (lOrder) lunchTotal++
      if (dOrder) dinnerTotal++

      // 判斷按鈕狀態與樣式
      const makeToggleBtn = (type, orderObj) => {
        const isActive = !!orderObj
        const isPaid = orderObj && orderObj.status === '已扣款'
        const baseClass = `order-toggle ${isActive ? 'active ' + (type === '午餐' ? 'lunch' : 'dinner') : ''} ${isPaid ? 'paid' : ''}`
        const icon = type === '午餐' ? 'light_mode' : 'dark_mode'
        return `<button class="${baseClass}" onclick="window.toggleMealOrder('${s.id}', '${type}', ${isActive}, ${isPaid})"><span class="material-symbols-outlined" style="font-size:16px;">${icon}</span>${type}</button>`
      }

      // 狀態顯示
      let statusHtml = '<span style="color:var(--text-light);">-</span>'
      if (lOrder || dOrder) {
        const allPaid = (!lOrder || lOrder.status === '已扣款') && (!dOrder || dOrder.status === '已扣款')
        statusHtml = allPaid ? '<span style="color:#15803d; font-weight:bold; font-size:13px;">✅ 已扣款</span>' : '<span style="color:#b91c1c; font-weight:bold; font-size:13px;">⏳ 未扣款</span>'
      }

      const balanceBadge = s.meal_balance < 100 ? `<span class="balance-badge balance-warning">$${s.meal_balance || 0}</span>` : `<span class="balance-badge balance-safe">$${s.meal_balance || 0}</span>`

      orderList.innerHTML += `
        <tr>
          <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</span></td>
          <td>${balanceBadge}</td>
          <td>${makeToggleBtn('午餐', lOrder)}</td>
          <td>${makeToggleBtn('晚餐', dOrder)}</td>
          <td>${statusHtml}</td>
        </tr>`
    })

    document.getElementById('stat-lunch').textContent = lunchTotal
    document.getElementById('stat-dinner').textContent = dinnerTotal

  } catch (err) { alert('載入失敗：' + err.message) }
}
orderSearch.addEventListener('input', () => window.loadDailyOrders())

// 點擊切換訂餐狀態
window.toggleMealOrder = async (studentId, type, currentlyActive, isPaid) => {
  if (isPaid) { alert('⚠️ 此訂單已扣款，無法直接取消！'); return }
  const targetDate = orderDateInput.value
  
  try {
    if (currentlyActive) {
      await supabase.from('meal_orders').delete().match({ student_id: studentId, order_date: targetDate, meal_type: type })
    } else {
      await supabase.from('meal_orders').insert([{ student_id: studentId, order_date: targetDate, meal_type: type }])
    }
    window.loadDailyOrders() // 重新整理
  } catch (err) { alert('操作失敗：' + err.message) }
}

window.openSettleModal = () => {
  const unpaidCount = dailyOrders.filter(o => o.status === '未扣款').length
  if (unpaidCount === 0) { alert('今日目前沒有「未扣款」的訂單需要結算喔！'); return }
  window.openTransModal('settle_orders', 'all', '一鍵結算訂單', unpaidCount)
}

// ==========================================
// 💡 [共用] 交易與結算核心邏輯
// ==========================================
let currentTransBalance = 0

window.openTransModal = (mode, targetId, titleStr, refValue) => {
  transForm.reset(); document.getElementById('trans-mode').value = mode; document.getElementById('trans-target-id').value = targetId
  document.getElementById('trans-title').textContent = titleStr
  
  const box = document.getElementById('trans-info-box'); const sub = document.getElementById('trans-subtitle'); const val = document.getElementById('trans-display-val')
  
  if (mode === 'deposit') {
    box.style.display = 'block'; sub.textContent = '目前餘額'; val.textContent = `$${refValue}`
    document.getElementById('trans-amount').value = 1000; document.getElementById('trans-note').value = '現金儲值'
    currentTransBalance = refValue
  } else if (mode === 'manual_deduct') {
    box.style.display = 'block'; sub.textContent = '即將扣款人數'; val.textContent = `${document.querySelectorAll('.student-cb:checked').length} 人`
    document.getElementById('trans-amount').value = 100; document.getElementById('trans-note').value = '扣除餐費'
  } else if (mode === 'settle_orders') {
    box.style.display = 'block'; sub.textContent = '今日待扣款訂單總數'; val.textContent = `${refValue} 份`
    document.getElementById('trans-amount').value = 100; document.getElementById('trans-note').value = `代訂${orderDateInput.value}餐點`
  }
  transModal.style.display = 'flex'
}

window.closeTransactionModal = () => transModal.style.display = 'none'

transForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('btn-submit-trans'); btn.disabled = true; btn.textContent = '處理中...'
  
  const mode = document.getElementById('trans-mode').value
  const amount = parseInt(document.getElementById('trans-amount').value)
  const note = document.getElementById('trans-note').value

  try {
    if (mode === 'deposit') {
      const studentId = document.getElementById('trans-target-id').value
      const balanceAfter = currentTransBalance + amount
      await supabase.from('meal_logs').insert([{ student_id: studentId, log_type: '儲值', amount: amount, balance_after: balanceAfter, note: note }])
      await supabase.from('students').update({ meal_balance: balanceAfter }).eq('id', studentId)
    } 
    else if (mode === 'manual_deduct') {
      const selectedIds = Array.from(document.querySelectorAll('.student-cb:checked')).map(cb => cb.value)
      const targets = allStudents.filter(s => selectedIds.includes(s.id))
      const updatePromises = targets.map(s => {
        const balanceAfter = (s.meal_balance || 0) - amount
        supabase.from('meal_logs').insert([{ student_id: s.id, log_type: '扣款', amount: amount, balance_after: balanceAfter, note: note }])
        return supabase.from('students').update({ meal_balance: balanceAfter }).eq('id', s.id)
      })
      await Promise.all(updatePromises)
    }
    else if (mode === 'settle_orders') {
      // 💡 最強的一鍵結算邏輯
      const targetDate = orderDateInput.value
      const unpaidOrders = dailyOrders.filter(o => o.status === '未扣款')
      
      // 因為一個學生可能同時訂午晚餐，要先將訂單按學生分組加總，再一次扣餘額，避免併發覆蓋
      const deductMap = {}
      unpaidOrders.forEach(o => { deductMap[o.student_id] = (deductMap[o.student_id] || 0) + amount })

      const updatePromises = Object.keys(deductMap).map(sId => {
        const student = allStudents.find(s => s.id === sId)
        const totalDeduct = deductMap[sId]
        const balanceAfter = (student.meal_balance || 0) - totalDeduct
        
        supabase.from('meal_logs').insert([{ student_id: sId, log_type: '扣款', amount: totalDeduct, balance_after: balanceAfter, note: note }])
        return supabase.from('students').update({ meal_balance: balanceAfter }).eq('id', sId)
      })

      await Promise.all(updatePromises)
      // 將訂單標記為已扣款
      await supabase.from('meal_orders').update({ status: '已扣款' }).in('id', unpaidOrders.map(o => o.id))
    }

    window.closeTransactionModal(); 
    await initData(); // 重新抓取最新餘額
    if (mode === 'settle_orders') window.loadDailyOrders()
    alert('✅ 操作成功！')

  } catch (err) { alert('處理失敗：' + err.message) } finally { btn.disabled = false; btn.textContent = '確認執行' }
})

// ==========================================
// 💡 歷史明細
// ==========================================
window.openHistoryModal = async (studentId, studentName) => {
  document.getElementById('history-name').textContent = `${studentName} 的餐費明細`
  const listContainer = document.getElementById('history-list'); listContainer.innerHTML = '<div style="padding: 30px; text-align: center;">載入中...</div>'
  historyModal.style.display = 'flex'
  try {
    const { data } = await supabase.from('meal_logs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    listContainer.innerHTML = ''
    if (!data || data.length === 0) { listContainer.innerHTML = '<div style="padding: 30px; text-align: center;">尚無異動紀錄</div>'; return }
    data.forEach(log => {
      const dateStr = new Date(log.created_at).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
      const isAdd = log.log_type === '儲值'; const typeClass = isAdd ? 'log-type-add' : 'log-type-sub'; const sign = isAdd ? '+' : '-'
      listContainer.innerHTML += `
        <div class="history-item">
          <div><div style="font-weight: 600; color: var(--text-main);">${log.note || log.log_type}</div><div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">${dateStr} | 異動後餘額: $${log.balance_after}</div></div>
          <div class="${typeClass}" style="font-size: 18px;">${sign}$${log.amount}</div>
        </div>`
    })
  } catch (err) { listContainer.innerHTML = `<div style="padding:20px; color:red; text-align:center;">讀取失敗</div>` }
}
window.closeHistoryModal = () => historyModal.style.display = 'none'

// 啟動
initData()

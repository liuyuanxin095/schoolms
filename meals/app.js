import { supabase } from '../config.js'

const studentList = document.getElementById('student-list')
const searchInput = document.getElementById('search-input')
const branchFilter = document.getElementById('branch-filter')

const transModal = document.getElementById('transaction-modal')
const transForm = document.getElementById('transaction-form')
const batchModal = document.getElementById('batch-modal')
const batchForm = document.getElementById('batch-form')
const historyModal = document.getElementById('history-modal')

let allStudents = []

// 1. 載入分校篩選器
async function loadBranches() {
  const { data } = await supabase.from('branches').select('id, name')
  if (data) data.forEach(b => branchFilter.appendChild(new Option(b.name, b.id)))
}

// 2. 載入學生清單與餘額
async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('id, name, student_number, meal_balance, branches(name)').order('name', { ascending: true })
  if (error) { studentList.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`; return }
  allStudents = data || []
  renderTable(allStudents)
}

function renderTable(data) {
  studentList.innerHTML = ''
  document.getElementById('select-all').checked = false
  window.updateSelectedCount()

  if (data.length === 0) { studentList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">查無學生資料</td></tr>'; return }

  data.forEach(s => {
    const branchName = s.branches ? s.branches.name : '-'
    const balance = s.meal_balance || 0
    // 💡 餘額低於 100 顯示紅色警告
    const badgeClass = balance < 100 ? 'balance-warning' : 'balance-safe'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><input type="checkbox" class="student-cb" value="${s.id}" onchange="window.updateSelectedCount()"></td>
      <td><strong>${s.name}</strong> <span style="font-size:12px; color:var(--text-light);">${s.student_number || ''}</span></td>
      <td>${branchName}</td>
      <td><span class="balance-badge ${badgeClass}">$${balance}</span></td>
      <td>
        <div style="display:flex; gap:5px;">
          <button class="btn-icon" title="儲值" onclick="window.openTransModal('${s.id}', '${s.name}', '儲值', ${balance})" style="color:#16a34a; background:#f0fdf4; border-radius:6px; padding:6px;"><span class="material-symbols-outlined" style="font-size:18px;">add_card</span></button>
          <button class="btn-icon" title="單筆扣款" onclick="window.openTransModal('${s.id}', '${s.name}', '扣款', ${balance})" style="color:#ea580c; background:#fff7ed; border-radius:6px; padding:6px;"><span class="material-symbols-outlined" style="font-size:18px;">receipt_long</span></button>
          <button class="btn-icon" title="歷史明細" onclick="window.openHistoryModal('${s.id}', '${s.name}')" style="background:#f3f4f6; border-radius:6px; padding:6px;"><span class="material-symbols-outlined" style="font-size:18px;">history</span></button>
        </div>
      </td>
    `
    studentList.appendChild(row)
  })
}

// 搜尋與篩選
function filterData() {
  const keyword = searchInput.value.toLowerCase(); const branchId = branchFilter.value
  const filtered = allStudents.filter(s => {
    const matchKey = s.name.toLowerCase().includes(keyword) || (s.student_number && s.student_number.toLowerCase().includes(keyword))
    const matchBranch = branchId === 'all' || s.branches?.name === branchFilter.options[branchFilter.selectedIndex].text
    return matchKey && matchBranch
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); branchFilter.addEventListener('change', filterData)

// ==========================================
// 💡 全選與批次按鈕邏輯
// ==========================================
window.toggleSelectAll = () => {
  const isChecked = document.getElementById('select-all').checked
  document.querySelectorAll('.student-cb').forEach(cb => cb.checked = isChecked)
  window.updateSelectedCount()
}

window.updateSelectedCount = () => {
  const count = document.querySelectorAll('.student-cb:checked').length
  document.getElementById('selected-count').textContent = count
  document.getElementById('btn-batch-deduct').disabled = count === 0
  const total = document.querySelectorAll('.student-cb').length
  if (total > 0) document.getElementById('select-all').checked = (count === total)
}

// ==========================================
// 💡 單筆儲值/扣款邏輯
// ==========================================
let currentActionBalance = 0

window.openTransModal = (studentId, studentName, type, currentBalance) => {
  transForm.reset()
  currentActionBalance = currentBalance
  document.getElementById('trans-student-id').value = studentId
  document.getElementById('trans-type').value = type
  document.getElementById('trans-title').textContent = `${studentName} - 餐費${type}`
  document.getElementById('trans-title').style.color = type === '儲值' ? '#16a34a' : '#ea580c'
  document.getElementById('trans-current-balance').textContent = `$${currentBalance}`
  document.getElementById('trans-amount-label').innerHTML = `${type}金額 <span style="color:red">*</span>`
  transModal.style.display = 'flex'
}

window.closeTransactionModal = () => transModal.style.display = 'none'

transForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('btn-submit-trans'); btn.disabled = true; btn.textContent = '處理中...'
  
  try {
    const studentId = document.getElementById('trans-student-id').value
    const type = document.getElementById('trans-type').value
    const amount = parseInt(document.getElementById('trans-amount').value)
    const note = document.getElementById('trans-note').value

    // 計算異動後餘額
    const balanceAfter = type === '儲值' ? currentActionBalance + amount : currentActionBalance - amount

    // 1. 寫入異動明細
    const { error: logErr } = await supabase.from('meal_logs').insert([{ student_id: studentId, log_type: type, amount: amount, balance_after: balanceAfter, note: note || null }])
    if (logErr) throw logErr

    // 2. 更新學生主檔的餘額
    const { error: updateErr } = await supabase.from('students').update({ meal_balance: balanceAfter }).eq('id', studentId)
    if (updateErr) throw updateErr

    window.closeTransactionModal(); await fetchStudents()
  } catch (err) { alert('操作失敗：' + err.message) } finally { btn.disabled = false; btn.textContent = '確認送出' }
})

// ==========================================
// 💡 批次扣款邏輯
// ==========================================
window.openBatchModal = () => {
  const count = document.querySelectorAll('.student-cb:checked').length
  if (count === 0) return
  document.getElementById('batch-count').textContent = count
  batchForm.reset(); document.getElementById('batch-amount').value = 100 // 預設扣款100
  batchModal.style.display = 'flex'
}

window.closeBatchModal = () => batchModal.style.display = 'none'

batchForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('btn-submit-batch'); btn.disabled = true; btn.textContent = '批次處理中...'
  
  try {
    const amount = parseInt(document.getElementById('batch-amount').value)
    const note = document.getElementById('batch-note').value
    const selectedIds = Array.from(document.querySelectorAll('.student-cb:checked')).map(cb => cb.value)

    // 取得這些學生當前的餘額
    const targetStudents = allStudents.filter(s => selectedIds.includes(s.id))

    // 準備批次寫入的 Log 資料與更新資料
    const logPayloads = []
    
    // 💡 使用 Promise.all 併發更新所有學生的餘額 (速度極快)
    const updatePromises = targetStudents.map(s => {
      const balanceAfter = (s.meal_balance || 0) - amount
      logPayloads.push({ student_id: s.id, log_type: '扣款', amount: amount, balance_after: balanceAfter, note: note })
      return supabase.from('students').update({ meal_balance: balanceAfter }).eq('id', s.id)
    })

    // 1. 執行更新餘額
    await Promise.all(updatePromises)
    // 2. 批次寫入 Log
    const { error } = await supabase.from('meal_logs').insert(logPayloads)
    if (error) throw error

    window.closeBatchModal(); await fetchStudents()
    alert(`✅ 已成功扣除 ${selectedIds.length} 位學生的餐費！`)
  } catch (err) { alert('批次處理失敗：' + err.message) } finally { btn.disabled = false; btn.textContent = '確認批次扣款' }
})

// ==========================================
// 💡 歷史明細邏輯
// ==========================================
window.openHistoryModal = async (studentId, studentName) => {
  document.getElementById('history-name').textContent = `${studentName} 的餐費明細`
  const listContainer = document.getElementById('history-list')
  listContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-light);">載入中...</div>'
  historyModal.style.display = 'flex'

  try {
    const { data, error } = await supabase.from('meal_logs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    if (error) throw error

    listContainer.innerHTML = ''
    if (!data || data.length === 0) { listContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-light);">尚無餐費異動紀錄</div>'; return }

    data.forEach(log => {
      const dateStr = new Date(log.created_at).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
      const isAdd = log.log_type === '儲值'
      const typeClass = isAdd ? 'log-type-add' : 'log-type-sub'
      const sign = isAdd ? '+' : '-'

      listContainer.innerHTML += `
        <div class="history-item">
          <div>
            <div style="font-weight: 600; color: var(--text-main);">${log.note || log.log_type}</div>
            <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">${dateStr} | 異動後餘額: $${log.balance_after}</div>
          </div>
          <div class="${typeClass}" style="font-size: 18px;">${sign}$${log.amount}</div>
        </div>
      `
    })
  } catch (err) { listContainer.innerHTML = `<div style="padding:20px; color:red; text-align:center;">讀取失敗: ${err.message}</div>` }
}
window.closeHistoryModal = () => historyModal.style.display = 'none'

// 啟動
loadBranches().then(fetchStudents)

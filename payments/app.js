import { supabase } from '../config.js'

// 視圖
const viewAllPayments = document.getElementById('view-all-payments')
const viewStudentBilling = document.getElementById('view-student-billing')
const tabBtns = document.querySelectorAll('.tab-btn')

// 總覽列表
const paymentList = document.getElementById('payment-list')
const searchInput = document.getElementById('search-input')
const statusFilter = document.getElementById('status-filter')

// 表單
const formModal = document.getElementById('form-modal')
const paymentForm = document.getElementById('payment-form')
const batchModal = document.getElementById('batch-modal')
const batchForm = document.getElementById('batch-form')

// 收據設定
const branchSettingsModal = document.getElementById('branch-settings-modal')
const branchSettingsForm = document.getElementById('branch-settings-form')

// 學生帳單視圖
const billingStudentSelect = document.getElementById('billing-student-select')
const billingContent = document.getElementById('billing-content')
const billingEmptyState = document.getElementById('billing-empty-state')

// 下拉選單元素
const studentSelect = document.getElementById('student_id')
const classSelect = document.getElementById('class_id')
const batchClassSelect = document.getElementById('batch-class-id')
const settingBranchSelect = document.getElementById('setting-branch-id')
const statusSelect = document.getElementById('status')

let allPayments = []; let allStudents = []; let allBranches = []

// 💡 1. 全域客製化彈跳視窗 (取代 alert/confirm)
window.showCustomDialog = (title, message, type = 'alert', icon = 'info') => {
  return new Promise((resolve) => {
    const dialog = document.getElementById('custom-dialog')
    document.getElementById('dialog-title').textContent = title
    document.getElementById('dialog-message').innerHTML = message.replace(/\n/g, '<br>')
    
    const iconColor = type === 'confirm' ? '#f59e0b' : '#3b82f6'
    document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor};">${icon}</span>`

    const btnCancel = document.getElementById('dialog-btn-cancel')
    const btnConfirm = document.getElementById('dialog-btn-confirm')

    btnCancel.style.display = type === 'confirm' ? 'block' : 'none'

    const cleanup = () => { dialog.style.display = 'none'; btnConfirm.onclick = null; btnCancel.onclick = null }

    btnConfirm.onclick = () => { cleanup(); resolve(true) }
    btnCancel.onclick = () => { cleanup(); resolve(false) }

    dialog.style.display = 'flex'
  })
}

// 2. 視圖切換
window.switchTab = (viewName) => {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'))
  tabBtns.forEach(btn => btn.classList.remove('active'))
  if (viewName === 'all-payments') { viewAllPayments.classList.add('active'); tabBtns[0].classList.add('active') }
  if (viewName === 'student-billing') { viewStudentBilling.classList.add('active'); tabBtns[1].classList.add('active') }
}

// 3. 初始化載入基礎資料
async function loadDropdowns() {
  const { data: branches } = await supabase.from('branches').select('*').order('created_at', { ascending: true })
  if (branches) {
    allBranches = branches
    settingBranchSelect.innerHTML = '<option value="" disabled selected>請選擇分校...</option>'
    branches.forEach(b => settingBranchSelect.appendChild(new Option(b.name, b.id)))
  }

  const { data: students } = await supabase.from('students').select('id, name, student_number, branch_id').order('name', { ascending: true })
  if (students) {
    allStudents = students
    studentSelect.innerHTML = '<option value="" disabled selected>請選擇繳費學生</option>'
    billingStudentSelect.innerHTML = '<option value="" disabled selected>請選擇學生查看個人帳單...</option>'
    students.forEach(s => {
      const display = s.student_number ? `${s.name} (${s.student_number})` : s.name
      studentSelect.appendChild(new Option(display, s.id))
      billingStudentSelect.appendChild(new Option(display, s.id))
    })
  }

  const { data: classes } = await supabase.from('classes').select('id, name, semester').order('created_at', { ascending: false })
  if (classes) {
    classSelect.innerHTML = '<option value="">-- 無關聯班級 (獨立收費項目) --</option>'
    batchClassSelect.innerHTML = '<option value="" disabled selected>請選擇要開單的班級</option>'
    classes.forEach(c => {
      const sem = c.semester ? `[${c.semester}] ` : ''
      classSelect.appendChild(new Option(`${sem}${c.name}`, c.id)); batchClassSelect.appendChild(new Option(`${sem}${c.name}`, c.id))
    })
  }
}

// 4. 載入所有繳費列表
async function fetchPayments() {
  const { data, error } = await supabase.from('payments').select('*, students(name, student_number), classes(name)').order('created_at', { ascending: false })
  if (error) { paymentList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`; return }
  allPayments = data || []
  renderTable(allPayments)
  if (billingStudentSelect.value) window.loadStudentBilling()
}

function renderTable(data) {
  paymentList.innerHTML = ''
  if (data.length === 0) { paymentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有繳費紀錄</td></tr>'; return }

  data.forEach(p => {
    const studentName = p.students ? `<strong>${p.students.name}</strong> <span style="font-size:12px; color:#6b7280;">${p.students.student_number || ''}</span>` : '<span style="color:red;">未知學生</span>'
    const className = p.classes ? p.classes.name : '<span style="color:#6b7280;">(無)</span>'
    const isPaid = p.status === '已繳款'
    const statusIcon = isPaid ? 'check_circle' : 'error'
    const statusClass = isPaid ? 'status-paid' : 'status-unpaid'
    const payDetail = isPaid ? `${p.payment_method || '-'} <br><span style="font-size:12px; color:#6b7280;">${p.payment_date || ''}</span>` : '<span style="color:#9ca3af;">-</span>'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${studentName}</td>
      <td><div style="display:flex; flex-direction:column; gap:4px;"><span>${p.title}</span><span style="font-size: 12px; color: var(--primary);">${className}</span></div></td>
      <td class="amount-text" style="color: #d97706;">$${p.amount.toLocaleString()}</td>
      <td><span class="status-badge ${statusClass}"><span class="material-symbols-outlined" style="font-size:14px;">${statusIcon}</span>${p.status}</span></td>
      <td>${payDetail}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="列印單據" onclick="window.printSingleSlip('${p.id}')"><span class="material-symbols-outlined" style="font-size:18px;">print</span></button>
          <button class="btn-icon" title="修改內容" onclick="window.openFormModal('${p.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除單據" onclick="window.deletePayment('${p.id}', '${p.title}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    paymentList.appendChild(row)
  })
}

function filterData() {
  const keyword = searchInput.value.toLowerCase(); const statusVal = statusFilter.value
  const filtered = allPayments.filter(p => {
    const sMatch = p.students && p.students.name.toLowerCase().includes(keyword)
    const tMatch = p.title.toLowerCase().includes(keyword); const cMatch = p.classes && p.classes.name.toLowerCase().includes(keyword)
    const matchStatus = statusVal === 'all' || p.status === statusVal
    return (sMatch || tMatch || cMatch) && matchStatus
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); statusFilter.addEventListener('change', filterData)

// ==========================================
// 💡 分校收據設定邏輯
// ==========================================
window.openBranchSettingsModal = () => {
  if (allBranches.length > 0) {
    settingBranchSelect.value = allBranches[0].id
    window.loadBranchSettings()
  }
  branchSettingsModal.style.display = 'flex'
}
window.closeBranchSettingsModal = () => branchSettingsModal.style.display = 'none'

window.loadBranchSettings = () => {
  const b = allBranches.find(x => x.id === settingBranchSelect.value)
  if (b) {
    document.getElementById('setting-header').value = b.receipt_header || '補習班 繳費憑單'
    document.getElementById('setting-footer').value = b.receipt_footer || '退費須知：依據短期補習班設立及管理準則辦理退費。'
  }
}

branchSettingsForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-settings-btn'); btn.disabled = true; btn.textContent = '儲存中...'
  try {
    const id = settingBranchSelect.value
    const updates = { receipt_header: document.getElementById('setting-header').value, receipt_footer: document.getElementById('setting-footer').value }
    const { error } = await supabase.from('branches').update(updates).eq('id', id)
    if (error) throw error
    await showCustomDialog('成功', '分校收據設定已更新！', 'alert', 'check_circle')
    // 重新載入分校資料
    const { data } = await supabase.from('branches').select('*')
    if (data) allBranches = data
    window.closeBranchSettingsModal()
  } catch (err) { await showCustomDialog('錯誤', '儲存失敗：' + err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '儲存設定' }
})


// ==========================================
// 💡 單筆新增/編輯邏輯
// ==========================================
window.togglePaymentDetails = () => {
  const isPaid = statusSelect.value === '已繳款'
  document.getElementById('method-group').style.display = isPaid ? 'flex' : 'none'
  document.getElementById('date-group').style.display = isPaid ? 'flex' : 'none'
  if (isPaid && !document.getElementById('payment_date').value) document.getElementById('payment_date').value = new Date().toISOString().split('T')[0]
}

window.openFormModal = (id = null) => {
  paymentForm.reset(); document.getElementById('payment-id').value = id || ''
  if (id) {
    document.getElementById('form-title').textContent = '修改收費單'
    const p = allPayments.find(x => x.id === id)
    if (p) {
      document.getElementById('student_id').value = p.student_id || ''; document.getElementById('title').value = p.title || ''; document.getElementById('class_id').value = p.class_id || ''
      document.getElementById('amount').value = p.amount || 0; document.getElementById('status').value = p.status || '未繳'
      document.getElementById('payment_method').value = p.payment_method || '現金'; document.getElementById('payment_date').value = p.payment_date || ''
    }
  } else { document.getElementById('form-title').textContent = '開立新收費單'; document.getElementById('status').value = '未繳' }
  window.togglePaymentDetails(); formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-btn'); btn.disabled = true; btn.textContent = '處理中...'
  try {
    const id = document.getElementById('payment-id').value; const isPaid = document.getElementById('status').value === '已繳款'
    const paymentData = {
      student_id: document.getElementById('student_id').value, title: document.getElementById('title').value, class_id: document.getElementById('class_id').value || null,
      amount: parseInt(document.getElementById('amount').value) || 0, status: document.getElementById('status').value,
      payment_method: isPaid ? document.getElementById('payment_method').value : null, payment_date: isPaid ? document.getElementById('payment_date').value : null
    }
    const { error } = id ? await supabase.from('payments').update(paymentData).eq('id', id) : await supabase.from('payments').insert([paymentData])
    if (error) throw error
    window.closeFormModal(); fetchPayments()
  } catch (err) { await showCustomDialog('錯誤', '儲存失敗：' + err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '儲存收費單' }
})

window.deletePayment = async (id, title) => {
  const confirmDel = await showCustomDialog('確認刪除', `確定要刪除「${title}」這筆收費單嗎？此動作無法復原。`, 'confirm', 'help')
  if (!confirmDel) return
  await supabase.from('payments').delete().eq('id', id); fetchPayments()
}

// ==========================================
// 💡 班級批次開單邏輯
// ==========================================
window.openBatchModal = () => { batchForm.reset(); batchModal.style.display = 'flex' }
window.closeBatchModal = () => batchModal.style.display = 'none'

batchForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = document.getElementById('submit-batch-btn'); btn.disabled = true; btn.textContent = '批次建檔中...'
  try {
    const targetClassId = batchClassSelect.value; const title = document.getElementById('batch-title').value; const amount = parseInt(document.getElementById('batch-amount').value)
    const { data: roster } = await supabase.from('class_students').select('student_id').eq('class_id', targetClassId)
    if (!roster || roster.length === 0) { await showCustomDialog('提示', '該班級目前沒有學生，無法開單。', 'alert', 'info'); btn.disabled = false; btn.textContent = '確認批次開單'; return }

    const payloads = roster.map(r => ({ student_id: r.student_id, class_id: targetClassId, title: title, amount: amount, status: '未繳' }))
    const { error } = await supabase.from('payments').insert(payloads)
    if (error) throw error

    await showCustomDialog('成功', `已為該班級的 ${payloads.length} 位學生開立「${title}」待繳費單。`, 'alert', 'check_circle')
    window.closeBatchModal(); fetchPayments()
  } catch (err) { await showCustomDialog('錯誤', '批次開單失敗：' + err.message, 'alert', 'error') } 
  finally { btn.disabled = false; btn.textContent = '確認批次開單' }
})

// ==========================================
// 💡 學生個人帳單總覽邏輯
// ==========================================
window.loadStudentBilling = () => {
  const studentId = billingStudentSelect.value
  if (!studentId) { billingContent.style.display = 'none'; billingEmptyState.style.display = 'block'; return }
  
  billingContent.style.display = 'block'; billingEmptyState.style.display = 'none'
  
  const myPayments = allPayments.filter(p => p.student_id === studentId)
  const unpaid = myPayments.filter(p => p.status === '未繳')
  const paid = myPayments.filter(p => p.status === '已繳款')

  const totalPending = unpaid.reduce((sum, p) => sum + p.amount, 0)
  document.getElementById('billing-total-amount').textContent = `$${totalPending.toLocaleString()}`

  const unpaidList = document.getElementById('billing-unpaid-list'); unpaidList.innerHTML = ''
  if (unpaid.length === 0) unpaidList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light); padding:15px;">目前沒有待繳費項目</td></tr>'
  unpaid.forEach(p => {
    const dateStr = new Date(p.created_at).toLocaleDateString('zh-TW')
    unpaidList.innerHTML += `
      <tr>
        <td style="color:var(--text-light); font-size:13px;">${dateStr}</td>
        <td><strong>${p.title}</strong></td>
        <td><span style="font-size:12px; color:var(--text-light);">${p.classes ? p.classes.name : '-'}</span></td>
        <td style="text-align:right; font-family:monospace; font-weight:bold; font-size:16px; color:#b91c1c;">$${p.amount.toLocaleString()}</td>
        <td><button class="btn btn-primary" onclick="window.quickPay('${p.id}')" style="padding:4px 10px; font-size:13px; background:#10b981; border:none;">收款結清</button></td>
      </tr>`
  })

  const paidList = document.getElementById('billing-paid-list'); paidList.innerHTML = ''
  if (paid.length === 0) paidList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light); padding:15px;">無近期繳費紀錄</td></tr>'
  paid.forEach(p => {
    paidList.innerHTML += `
      <tr>
        <td style="color:var(--text-light); font-size:13px;">${p.payment_date || '-'}</td>
        <td><strong>${p.title}</strong></td>
        <td><span style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:12px;">${p.payment_method || '-'}</span></td>
        <td style="text-align:right; font-family:monospace; font-weight:bold; font-size:16px; color:#15803d;">$${p.amount.toLocaleString()}</td>
        <td><button class="btn-icon" title="列印收據" onclick="window.printSingleSlip('${p.id}')"><span class="material-symbols-outlined" style="font-size:18px;">print</span></button></td>
      </tr>`
  })
}

window.quickPay = async (paymentId) => {
  const confirmPay = await showCustomDialog('確認收款', '確定以「現金」方式於今日結清此筆款項嗎？', 'confirm', 'payments')
  if (!confirmPay) return
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('payments').update({ status: '已繳款', payment_method: '現金', payment_date: today }).eq('id', paymentId)
  fetchPayments()
}

// ==========================================
// 🖨️ 列印引擎：動態抓取分校設定
// ==========================================
function getBranchSettings(studentId) {
  const student = allStudents.find(s => s.id === studentId)
  let branchId = student ? student.branch_id : null
  const branch = allBranches.find(b => b.id === branchId)
  
  return {
    header: branch?.receipt_header || '補習班 繳費憑單',
    footer: branch?.receipt_footer || '退費須知：依據各縣市短期補習班設立及管理準則辦理退費。'
  }
}

function generatePrintHTML(title, contentHTML, footerHTML) {
  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: "Microsoft JhengHei", sans-serif; padding: 20px; color: #333; }
        .bill-container { max-width: 700px; margin: 0 auto; border: 2px dashed #94a3b8; padding: 30px; border-radius: 12px; position: relative; }
        .cut-line { text-align: center; color: #94a3b8; margin-bottom: 20px; font-size: 12px; letter-spacing: 2px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .header-title { text-align: center; font-size: 24px; font-weight: bold; margin: 0 0 5px 0; color: #1e3a8a; }
        .sub-title { text-align: center; font-size: 14px; color: #64748b; margin-bottom: 30px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
        .total-box { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; background: #eff6ff; padding: 15px; border-radius: 8px; color: #1e3a8a; margin-bottom: 20px; }
        .footer { display: flex; justify-content: space-between; font-size: 14px; margin-top: 20px; }
        .sign-line { border-bottom: 1px solid #333; width: 150px; display: inline-block; }
        .policy-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; font-size: 12px; color: #475569; border-radius: 6px; line-height: 1.6; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; }
        th { background: #f8fafc; }
        @media print { body { padding: 0; } .bill-container { border: none; padding: 0; } .cut-line { display: none; } }
      </style>
    </head>
    <body>
      <div class="cut-line">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
        -------------- 請沿虛線剪下 -------------- 
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
      </div>
      <div class="bill-container">
        ${contentHTML}
        <div class="policy-box">${footerHTML}</div>
        <div class="footer">
          <div>開立日期：${new Date().toLocaleDateString('zh-TW')}</div>
          <div>經辦人簽章：<span class="sign-line"></span></div>
        </div>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
    </body>
    </html>
  `
}

window.printSingleSlip = (paymentId) => {
  const p = allPayments.find(x => x.id === paymentId)
  if (!p) return
  const isPaid = p.status === '已繳款'
  const typeStr = isPaid ? '【收據】' : '【繳費通知】'
  
  // 💡 動態抓取分校設定
  const settings = getBranchSettings(p.student_id)

  const content = `
    <h1 class="header-title">${settings.header}</h1>
    <div class="sub-title">感謝您的支持與配合，請憑此單據至櫃檯繳費。</div>
    <div style="font-weight:bold; font-size:18px; margin-bottom:15px; text-align:center; color:${isPaid?'#15803d':'#b91c1c'};">${typeStr}</div>
    <div class="info-row"><span>學生姓名：<b>${p.students?.name || '未知'}</b></span><span>學號：${p.students?.student_number || '-'}</span></div>
    <div class="info-row"><span>關聯班級：${p.classes?.name || '無'}</span><span>單據狀態：${p.status}</span></div>
    ${isPaid ? `<div class="info-row"><span>繳款日期：${p.payment_date}</span><span>繳費方式：${p.payment_method}</span></div>` : ''}
    
    <table>
      <tr><th>收費項目名稱</th><th>應繳金額</th></tr>
      <tr><td>${p.title}</td><td style="font-family:monospace; font-size:16px;">$${p.amount.toLocaleString()}</td></tr>
    </table>
    <div class="total-box">總計：$${p.amount.toLocaleString()}</div>
  `
  const printWin = window.open('', '_blank')
  printWin.document.write(generatePrintHTML(`${p.students?.name}_${p.title}`, content, settings.footer))
  printWin.document.close()
}

window.printConsolidatedBill = () => {
  const studentId = billingStudentSelect.value
  if (!studentId) return
  const student = allStudents.find(s => s.id === studentId)
  const unpaid = allPayments.filter(p => p.student_id === studentId && p.status === '未繳')
  if (unpaid.length === 0) { showCustomDialog('提示', '此學生目前沒有待繳費項目。', 'alert', 'info'); return }

  // 💡 動態抓取分校設定
  const settings = getBranchSettings(studentId)
  const total = unpaid.reduce((sum, p) => sum + p.amount, 0)
  
  let tableRows = ''
  unpaid.forEach((p, idx) => {
    tableRows += `<tr><td>${idx+1}</td><td style="text-align:left;">${p.title} <span style="font-size:12px;color:#666;">(${p.classes?.name||'無班級'})</span></td><td style="font-family:monospace;">$${p.amount.toLocaleString()}</td></tr>`
  })

  const content = `
    <h1 class="header-title">${settings.header}</h1>
    <div class="sub-title">感謝您的支持與配合，請憑此單據至櫃檯繳費。</div>
    <div style="font-weight:bold; font-size:18px; margin-bottom:15px; text-align:center; color:#b91c1c;">【合併繳費單】</div>
    <div class="info-row"><span>學生姓名：<b>${student?.name || '未知'}</b></span><span>學號：${student?.student_number || '-'}</span></div>
    
    <table>
      <tr><th width="10%">項次</th><th>收費項目名稱</th><th width="25%">金額</th></tr>
      ${tableRows}
    </table>
    <div class="total-box">本期應繳總計：$${total.toLocaleString()}</div>
  `
  const printWin = window.open('', '_blank')
  printWin.document.write(generatePrintHTML(`${student?.name}_合併帳單`, content, settings.footer))
  printWin.document.close()
}

// 啟動
loadDropdowns().then(fetchPayments)

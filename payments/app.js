import { supabase } from '../config.js'

const paymentList = document.getElementById('payment-list')
const searchInput = document.getElementById('search-input')
const statusFilter = document.getElementById('status-filter')

const formModal = document.getElementById('form-modal')
const paymentForm = document.getElementById('payment-form')
const formTitle = document.getElementById('form-title')
const submitBtn = document.getElementById('submit-btn')

const studentSelect = document.getElementById('student_id')
const classSelect = document.getElementById('class_id')
const statusSelect = document.getElementById('status')

let allPayments = []

// 1. 載入學生與班級下拉選單
async function loadDropdowns() {
  // 抓取學生
  const { data: students } = await supabase.from('students').select('id, name, student_number').order('name', { ascending: true })
  if (students) {
    studentSelect.innerHTML = '<option value="" disabled selected>請選擇繳費學生</option>'
    students.forEach(s => {
      const display = s.student_number ? `${s.name} (${s.student_number})` : s.name
      studentSelect.appendChild(new Option(display, s.id))
    })
  }

  // 抓取班級
  const { data: classes } = await supabase.from('classes').select('id, name').order('created_at', { ascending: false })
  if (classes) {
    classSelect.innerHTML = '<option value="">-- 無關聯班級 (獨立收費項目) --</option>'
    classes.forEach(c => classSelect.appendChild(new Option(c.name, c.id)))
  }
}

// 2. 載入繳費列表 (關聯學生與班級名稱)
async function fetchPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      students(name, student_number),
      classes(name)
    `)
    .order('created_at', { ascending: false })

  if (error) { paymentList.innerHTML = `<tr><td colspan="6" style="color:red; text-align: center;">載入失敗: ${error.message}</td></tr>`; return }
  allPayments = data || []
  renderTable(allPayments)
}

function renderTable(data) {
  paymentList.innerHTML = ''
  if (data.length === 0) { paymentList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 30px;">目前沒有繳費紀錄</td></tr>'; return }

  data.forEach(p => {
    const studentName = p.students ? `${p.students.name} <span style="font-size:12px; color:#6b7280;">${p.students.student_number || ''}</span>` : '<span style="color:red;">未知學生</span>'
    const className = p.classes ? p.classes.name : '<span style="color:#6b7280;">(無)</span>'
    const statusClass = p.status === '已繳款' ? 'status-paid' : 'status-unpaid'
    const payDetail = p.status === '已繳款' ? `${p.payment_method || '-'} <br><span style="font-size:12px; color:#6b7280;">${p.payment_date || ''}</span>` : '<span style="color:#9ca3af;">-</span>'

    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${studentName}</strong></td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span>${p.title}</span>
          <span style="font-size: 12px; color: var(--primary);">${className}</span>
        </div>
      </td>
      <td class="amount-text" style="color: #d97706;">$${p.amount.toLocaleString()}</td>
      <td><span class="status-badge ${statusClass}">${p.status}</span></td>
      <td>${payDetail}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="修改內容" onclick="window.openFormModal('${p.id}')"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
          <button class="btn-icon" style="color:var(--danger);" title="刪除單據" onclick="window.deletePayment('${p.id}', '${p.title}')"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
        </div>
      </td>
    `
    paymentList.appendChild(row)
  })
}

// 3. 搜尋與狀態篩選
function filterData() {
  const keyword = searchInput.value.toLowerCase(); const statusVal = statusFilter.value
  const filtered = allPayments.filter(p => {
    const studentMatch = p.students && p.students.name.toLowerCase().includes(keyword)
    const titleMatch = p.title.toLowerCase().includes(keyword)
    const classMatch = p.classes && p.classes.name.toLowerCase().includes(keyword)
    const matchKeyword = studentMatch || titleMatch || classMatch
    const matchStatus = statusVal === 'all' || p.status === statusVal
    return matchKeyword && matchStatus
  })
  renderTable(filtered)
}
searchInput.addEventListener('input', filterData); statusFilter.addEventListener('change', filterData)

// 4. 表單邏輯：切換繳款狀態時，顯示或隱藏「繳費方式」與「日期」
window.togglePaymentDetails = () => {
  const isPaid = statusSelect.value === '已繳款'
  document.getElementById('method-group').style.display = isPaid ? 'flex' : 'none'
  document.getElementById('date-group').style.display = isPaid ? 'flex' : 'none'
  
  // 自動帶入今天日期
  if (isPaid && !document.getElementById('payment_date').value) {
    document.getElementById('payment_date').value = new Date().toISOString().split('T')[0]
  }
}

// 5. 開啟新增/修改表單
window.openFormModal = (id = null) => {
  paymentForm.reset(); document.getElementById('payment-id').value = id || ''
  
  if (id) {
    formTitle.textContent = '修改收費單'
    const p = allPayments.find(x => x.id === id)
    if (p) {
      document.getElementById('student_id').value = p.student_id || ''
      document.getElementById('title').value = p.title || ''
      document.getElementById('class_id').value = p.class_id || ''
      document.getElementById('amount').value = p.amount || 0
      document.getElementById('status').value = p.status || '未繳'
      document.getElementById('payment_method').value = p.payment_method || '現金'
      document.getElementById('payment_date').value = p.payment_date || ''
    }
  } else { 
    formTitle.textContent = '開立新收費單' 
    document.getElementById('status').value = '未繳'
  }
  
  window.togglePaymentDetails()
  formModal.style.display = 'flex'
}
window.closeFormModal = () => formModal.style.display = 'none'

// 6. 表單送出
paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = '處理中...'
  
  try {
    const id = document.getElementById('payment-id').value
    const isPaid = document.getElementById('status').value === '已繳款'
    
    const paymentData = {
      student_id: document.getElementById('student_id').value,
      title: document.getElementById('title').value,
      class_id: document.getElementById('class_id').value || null,
      amount: parseInt(document.getElementById('amount').value) || 0,
      status: document.getElementById('status').value,
      payment_method: isPaid ? document.getElementById('payment_method').value : null,
      payment_date: isPaid ? document.getElementById('payment_date').value : null
    }

    const { error } = id ? await supabase.from('payments').update(paymentData).eq('id', id) : await supabase.from('payments').insert([paymentData])
    if (error) throw new Error(error.message)
    
    window.closeFormModal(); fetchPayments()
  } catch (err) { alert('儲存失敗：' + err.message) } finally { submitBtn.disabled = false; submitBtn.textContent = '儲存收費單' }
})

// 7. 刪除
window.deletePayment = async (id, title) => {
  if (!confirm(`確定要刪除「${title}」這筆收費單嗎？此動作無法復原！`)) return
  await supabase.from('payments').delete().eq('id', id); fetchPayments()
}

// 初始化
loadDropdowns().then(fetchPayments)

let currentMode = 'INVOICE';
let items = [
    { id: 1, description: 'Premium Web Design Package', qty: 1, rate: 25000 }
];

// Local Storage Functions
function saveData() {
    const data = {
        mode: currentMode,
        docNumber: document.getElementById('docNumber').value,
        docDate: document.getElementById('docDate').value,
        clientName: document.getElementById('clientName').value,
        clientAddress: document.getElementById('clientAddress').value,
        clientContact: document.getElementById('clientContact').value,
        docNotes: document.getElementById('docNotes').value,
        paymentInfo: document.getElementById('paymentInfo').value,
        items: items
    };
    localStorage.setItem('chittortech_bill_draft', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('chittortech_bill_draft');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            if (data.docNumber !== undefined) document.getElementById('docNumber').value = data.docNumber;
            if (data.docDate) document.getElementById('docDate').value = data.docDate;
            if (data.clientName !== undefined) document.getElementById('clientName').value = data.clientName;
            if (data.clientAddress !== undefined) document.getElementById('clientAddress').value = data.clientAddress;
            if (data.clientContact !== undefined) document.getElementById('clientContact').value = data.clientContact;
            if (data.docNotes !== undefined) document.getElementById('docNotes').value = data.docNotes;
            if (data.paymentInfo !== undefined) document.getElementById('paymentInfo').value = data.paymentInfo;
            
            if (data.items && data.items.length > 0) {
                items = data.items;
            }
            if (data.mode) {
                currentMode = data.mode;
            }
            
            document.getElementById('invoiceToggle').classList.toggle('active', currentMode === 'INVOICE');
            document.getElementById('quotationToggle').classList.toggle('active', currentMode === 'QUOTATION');
            document.getElementById('previewType').innerText = currentMode;
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('docDate').value = today;

    loadData();

    renderItems();
    updatePreview();
});

function setMode(mode) {
    currentMode = mode;
    
    // UI Update
    document.getElementById('invoiceToggle').classList.toggle('active', mode === 'INVOICE');
    document.getElementById('quotationToggle').classList.toggle('active', mode === 'QUOTATION');
    
    // Preview Update
    document.getElementById('previewType').innerText = mode;
    updatePreview();
}

function addItem() {
    const newItem = {
        id: Date.now(),
        description: '',
        qty: 1,
        rate: 0
    };
    items.push(newItem);
    renderItems();
    updatePreview();
}

function removeItem(id) {
    if (items.length <= 1) {
        alert("At least one item is required.");
        return;
    }
    items = items.filter(item => item.id !== id);
    renderItems();
    updatePreview();
}

function updateItem(id, field, value) {
    const item = items.find(i => i.id === id);
    if (item) {
        if (field === 'qty' || field === 'rate') {
            item[field] = parseFloat(value) || 0;
        } else {
            item[field] = value;
        }
    }
    updatePreview();
}

function renderItems() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-row';
        div.innerHTML = `
            <input type="text" placeholder="Description" value="${item.description}" 
                oninput="updateItem(${item.id}, 'description', this.value)">
            <input type="number" placeholder="Qty" value="${item.qty}" 
                oninput="updateItem(${item.id}, 'qty', this.value)">
            <input type="number" placeholder="Rate" value="${item.rate}" 
                oninput="updateItem(${item.id}, 'rate', this.value)">
            <button class="icon-btn" onclick="removeItem(${item.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function updatePreview() {
    // Basic Details
    const docNum = document.getElementById('docNumber').value || 'CT/24/001';
    let docDate = document.getElementById('docDate').value || '---';
    const clientName = document.getElementById('clientName').value || 'Client Name';
    const clientAddr = document.getElementById('clientAddress').value || 'Client Address';
    const clientCont = document.getElementById('clientContact').value || 'Contact Info';
    const notes = document.getElementById('docNotes').value || 'Thank you for choosing ChittorTech. We appreciate your business.';
    const paymentInfo = document.getElementById('paymentInfo').value || 'Add bank or check details here...';

    if (docDate !== '---') {
        const d = new Date(docDate);
        if (!isNaN(d.getTime())) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            docDate = d.toLocaleDateString('en-IN', options);
        }
    }

    document.getElementById('prevDocNumber').innerText = docNum;
    document.getElementById('prevDocDate').innerText = docDate;
    document.getElementById('prevClientName').innerText = clientName;
    document.getElementById('prevClientAddress').innerText = clientAddr;
    document.getElementById('prevClientContact').innerText = clientCont;
    document.getElementById('prevNotes').innerText = notes;
    document.getElementById('prevPaymentInfo').innerText = paymentInfo;

    // Items Table
    const tableBody = document.getElementById('previewItems');
    tableBody.innerHTML = '';
    
    let subtotal = 0;

    items.forEach(item => {
        const amount = item.qty * item.rate;
        subtotal += amount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.description || '<i>New Service/Item</i>'}</td>
            <td class="text-right">${item.qty}</td>
            <td class="text-right">₹${item.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="text-right">₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Totals
    document.getElementById('prevSubtotal').innerText = `₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('prevGrandTotal').innerText = `₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    // Auto-save draft
    saveData();
}

// Interactive Sync (Edit on Preview)
function syncInput(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
        updatePreview();
    }
}

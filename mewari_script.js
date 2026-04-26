let currentMode = 'INVOICE';
let items = [
    { id: 1, description: 'Mango Achar', weight: '500g', rate: 400, amount: 200 }
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
        paymentMode: document.getElementById('paymentMode').value,
        paymentInfo: document.getElementById('paymentInfo').value,
        items: items
    };
    localStorage.setItem('mewari_bill_draft', JSON.stringify(data));
}

function resetDraft() {
    if (confirm("Are you sure you want to reset all fields to defaults? This will clear your current draft.")) {
        localStorage.removeItem('mewari_bill_draft');
        window.location.reload();
    }
}

function loadData() {
    const saved = localStorage.getItem('mewari_bill_draft');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            if (data.docNumber !== undefined) document.getElementById('docNumber').value = data.docNumber;
            if (data.docDate) document.getElementById('docDate').value = data.docDate;
            if (data.clientName !== undefined) document.getElementById('clientName').value = data.clientName;
            if (data.clientAddress !== undefined) document.getElementById('clientAddress').value = data.clientAddress;
            if (data.clientContact !== undefined) document.getElementById('clientContact').value = data.clientContact;
            if (data.docNotes !== undefined) document.getElementById('docNotes').value = data.docNotes;
            if (data.paymentMode !== undefined) document.getElementById('paymentMode').value = data.paymentMode;
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

    // Set dynamic year in prefix
    const currentYear = new Date().getFullYear();
    const docPrefixEl = document.getElementById('docPrefix');
    if (docPrefixEl) {
        docPrefixEl.innerText = `MA/${currentYear}/`;
    }

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
        weight: '',
        rate: 0,
        amount: 0
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
        if (field === 'rate' || field === 'amount') {
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
        div.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 40px";
        div.innerHTML = `
            <input type="text" placeholder="Pickle Name" value="${item.description}" 
                oninput="updateItem(${item.id}, 'description', this.value)">
            <input type="text" placeholder="Weight" value="${item.weight || ''}" 
                oninput="updateItem(${item.id}, 'weight', this.value)">
            <input type="number" placeholder="Rate/Kg" value="${item.rate}" 
                oninput="updateItem(${item.id}, 'rate', this.value)">
            <input type="number" placeholder="Total Amount" value="${item.amount || 0}" 
                oninput="updateItem(${item.id}, 'amount', this.value)">
            <button class="icon-btn" onclick="removeItem(${item.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function updatePreview() {
    // Basic Details
    const currentYear = new Date().getFullYear();
    const prefix = `MA/${currentYear}/`;
    const inputNum = document.getElementById('docNumber').value || '001';
    const docNum = prefix + inputNum;
    let docDate = document.getElementById('docDate').value || '---';
    const clientName = document.getElementById('clientName').value || 'Client Name';
    const clientAddr = document.getElementById('clientAddress').value || 'Client Address';
    const clientCont = document.getElementById('clientContact').value || 'Contact Info';
    const notes = document.getElementById('docNotes').value || 'GST not applicable.';
    const paymentMode = document.getElementById('paymentMode').value || 'Bank Transfer';
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
    document.getElementById('prevPaymentMode').innerText = paymentMode;
    document.getElementById('prevPaymentInfo').innerText = paymentInfo;

    // Items Table
    const tableBody = document.getElementById('previewItems');
    tableBody.innerHTML = '';
    
    let subtotal = 0;

    items.forEach(item => {
        const amount = item.amount || 0;
        subtotal += amount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.description || '<i>New Pickle</i>'}</td>
            <td>${item.weight || '-'}</td>
            <td class="text-right">₹${item.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="text-right">₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Totals (Auto-Calculated)
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

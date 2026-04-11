let currentMode = 'INVOICE';
let items = [
    { id: 1, description: 'Premium Web Design Package', qty: 1, rate: 25000 }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('docDate').value = today;

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
// Interactive Sync (Edit on Preview)
function syncInput(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
        updatePreview();
    }
}

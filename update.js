const fs = require('fs');

try {
    let content = fs.readFileSync('index.html', 'utf8');

    // 1. Replace the entire <style> block
    const newStyle = `<style>
        /* ============================================================
           INVOICE PREVIEW STYLES (NEW FORMAT)
           ============================================================ */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

        :root {
            --navy:  #1d3372;
            --navy-dark: #15275e;
            --text-main: #333333;
            --text-muted: #666666;
            --border-light: #e5e7eb;
            --accent-green: #00b050;
            --bg-light-blue: #f0f4f8;
        }

        #invoice-preview {
            font-family: 'Inter', Arial, sans-serif;
            background: #fff;
            color: var(--text-main);
            width: 210mm;
            min-height: 297mm;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            padding: 40px;
            font-size: 11px;
            line-height: 1.5;
            position: relative;
        }

        /* ─── Header ─── */
        .inv-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        .inv-header-left h1 {
            font-family: 'Times New Roman', serif;
            font-size: 32px;
            color: var(--navy);
            margin: 0 0 5px 0;
            font-weight: normal;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .inv-header-left p {
            font-size: 13px;
            color: var(--text-muted);
            margin: 0;
        }
        .inv-header-right {
            text-align: right;
        }
        .inv-header-right h2 {
            font-size: 26px;
            color: #000;
            margin: 0 0 5px 0;
            font-weight: 800;
            text-transform: uppercase;
        }
        .inv-header-right p {
            color: var(--accent-green);
            font-weight: 600;
            font-size: 12px;
            margin: 0;
        }

        hr.solid-hr {
            border: none;
            border-top: 1px solid var(--border-light);
            margin: 0 0 20px 0;
        }

        /* ─── Company & Invoice Info ─── */
        .inv-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .inv-info-left {
            flex: 0 0 65%;
        }
        .inv-info-left h3 {
            font-size: 12px;
            font-weight: 700;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            color: #000;
        }
        .inv-info-left p {
            margin: 0 0 3px 0;
            color: var(--text-muted);
        }
        .inv-info-right {
            flex: 0 0 35%;
            text-align: right;
        }
        .inv-info-right p {
            margin: 0 0 5px 0;
            color: var(--text-muted);
        }
        .inv-info-right span {
            color: #000;
            font-weight: 600;
        }

        /* ─── Billed To & Store Info ─── */
        .inv-parties-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            gap: 20px;
        }
        .inv-party-box {
            flex: 1;
            border-left: 3px solid var(--navy);
            padding-left: 10px;
        }
        .inv-party-box h4 {
            font-size: 11px;
            color: var(--navy);
            margin: 0 0 8px 0;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .inv-party-box h5 {
            font-size: 13px;
            color: #000;
            margin: 0 0 4px 0;
            font-weight: 700;
        }
        .inv-party-box p {
            margin: 0 0 3px 0;
            color: var(--text-muted);
        }

        /* ─── Table ─── */
        .inv-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .inv-table th {
            background: var(--navy);
            color: #fff;
            font-weight: 600;
            padding: 10px;
            text-align: right;
            font-size: 11px;
        }
        .inv-table th:nth-child(1), .inv-table th:nth-child(2), .inv-table th:nth-child(3) {
            text-align: left;
        }
        .inv-table th:nth-child(4) {
            text-align: center;
        }
        .inv-table td {
            padding: 12px 10px;
            border-bottom: 1px solid var(--border-light);
            text-align: right;
            color: var(--text-main);
            vertical-align: top;
        }
        .inv-table td:nth-child(1), .inv-table td:nth-child(2), .inv-table td:nth-child(3) {
            text-align: left;
        }
        .inv-table td:nth-child(4) {
            text-align: center;
        }
        .inv-table td.desc {
            font-weight: 600;
            color: #000;
        }

        /* ─── Bottom Section ─── */
        .inv-bottom-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            gap: 20px;
        }
        
        .inv-gst-box {
            flex: 0 0 48%;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: #fafafa;
        }
        .inv-gst-header {
            padding: 10px;
            font-size: 11px;
            color: var(--navy);
            font-weight: 700;
            text-transform: uppercase;
        }
        .inv-gst-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            border-top: 1px solid var(--border-light);
            color: var(--text-muted);
        }
        .inv-gst-row strong {
            color: #000;
        }
        
        .inv-totals-box {
            flex: 0 0 48%;
        }
        .inv-totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: var(--text-muted);
        }
        .inv-totals-row span:last-child {
            color: #000;
            font-weight: 600;
        }
        .inv-grand-total {
            background: var(--navy);
            color: #fff !important;
            padding: 12px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 4px;
            margin-top: 8px;
        }
        .inv-grand-total span:first-child {
            font-size: 14px;
            font-weight: 700;
        }
        .inv-grand-total span:last-child {
            font-size: 18px;
            font-weight: 700;
            color: #fff !important;
        }

        /* ─── Amount in Words ─── */
        .inv-words-box {
            background: var(--bg-light-blue);
            border: 1px solid #d0dfec;
            border-radius: 4px;
            padding: 12px 15px;
            margin-bottom: 30px;
        }
        .inv-words-box span {
            color: var(--navy);
            font-weight: 700;
        }
        .inv-words-box strong {
            color: #000;
        }

        /* ─── Footer ─── */
        .inv-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 20px;
        }
        .inv-terms {
            flex: 0 0 60%;
            color: var(--text-muted);
            font-size: 10px;
        }
        .inv-terms ol {
            padding-left: 15px;
            margin: 5px 0 0 0;
        }
        .inv-terms li {
            margin-bottom: 2px;
        }
        .inv-sign {
            flex: 0 0 35%;
            text-align: right;
        }
        .inv-sign h4 {
            margin: 0 0 40px 0;
            font-size: 11px;
            color: #000;
        }
        .inv-sign p {
            margin: 0;
            color: var(--text-muted);
            font-size: 10px;
        }

        .inv-very-bottom {
            text-align: center;
            padding-top: 15px;
            border-top: 1px solid var(--border-light);
            color: var(--text-muted);
            font-size: 10px;
            background: #fafafa;
            margin: 0 -40px -40px -40px;
            padding-bottom: 15px;
        }

        /* Override style.css for proper preview scrolling */
        @media screen {
            .preview-panel {
                display: block !important;
                overflow: auto !important;
                text-align: center !important;
            }
            #print-area {
                display: inline-block;
                text-align: left;
                margin: 0 auto;
            }
        }

        /* ─── Print rules ─── */
        @media print {
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            .no-print { display: none !important; }
            .editor-grid { display: block !important; height: auto !important; }
            .preview-panel {
                background: #fff !important;
                padding: 0 !important;
                overflow: visible !important;
                display: block !important;
                width: 100% !important;
            }
            #print-area { padding: 0 !important; box-shadow: none !important; width: 100% !important; }
            #invoice-preview {
                width: 100% !important;
                min-height: 100vh !important;
                padding: 10mm !important;
            }
            tr { page-break-inside: avoid; }
        }
    </style>`;

    // 2. Replace the HTML inside #invoice-preview
    const newHtml = `<div id="invoice-preview">
                        <!-- 1. HEADER -->
                        <div class="inv-header">
                            <div class="inv-header-left">
                                <h1 id="prevCompanyName">CHITTORTECH</h1>
                                <p>Premium IT Services</p>
                            </div>
                            <div class="inv-header-right">
                                <h2 id="previewType">INVOICE</h2>
                                <p>Original for Recipient</p>
                            </div>
                        </div>

                        <hr class="solid-hr">

                        <!-- 2. INFO ROW -->
                        <div class="inv-info-row">
                            <div class="inv-info-left">
                                <h3 id="prevCompanyTitle">CHITTORTECH</h3>
                                <p id="prevCompanyAddress">Chittorgarh, Rajasthan – 312001</p>
                                <p>GSTIN: <span id="prevCompGst">08AAAAA0000A1Z5</span> | PAN: <span id="prevCompPan">AAAAA0000A</span></p>
                                <p>Phone: <span id="prevCompanyPhone">+91 7597451057</span> | Email: <span id="prevCompanyEmail">business@chittortech.in</span></p>
                            </div>
                            <div class="inv-info-right">
                                <p>Invoice No: <span id="prevDocNumber">CT/2026/001</span></p>
                                <p>Date: <span id="prevDocDate">29 Sept 2026</span></p>
                                <p>Payment: <span id="prevPaymentMode">UPI</span></p>
                            </div>
                        </div>

                        <hr class="solid-hr">

                        <!-- 3. PARTIES ROW -->
                        <div class="inv-parties-row">
                            <div class="inv-party-box">
                                <h4>BILLED TO</h4>
                                <h5 id="prevClientName">Customer Name</h5>
                                <p>Mobile: <span id="prevClientPhone">—</span></p>
                                <p>Address: <span id="prevClientAddress">—</span></p>
                                <p>GSTIN: <span id="prevClientGst">Unregistered (Consumer)</span></p>
                            </div>
                            <div class="inv-party-box">
                                <h4>STORE & SALES INFO</h4>
                                <h5>ChittorTech – Main Store</h5>
                                <p>Salesperson: <span id="prevSalesperson">Online Store Counter 01</span></p>
                                <p>Customer Type: <span id="prevCustomerType">Retail Consumer</span></p>
                                <p>Channel: <span id="prevChannel">Chittor Web Store</span></p>
                            </div>
                        </div>

                        <!-- 4. TABLE -->
                        <table class="inv-table">
                            <thead>
                                <tr>
                                    <th style="width:5%;">S.No</th>
                                    <th style="width:35%;">Item / Description</th>
                                    <th style="width:10%;">HSN</th>
                                    <th style="width:5%;">Qty</th>
                                    <th style="width:12%;">Rate (<span class="prevCurrencySymbol">₹</span>)</th>
                                    <th style="width:8%;">GST</th>
                                    <th style="width:12%;">Tax (<span class="prevCurrencySymbol">₹</span>)</th>
                                    <th style="width:13%;">Total (<span class="prevCurrencySymbol">₹</span>)</th>
                                </tr>
                            </thead>
                            <tbody id="previewItems">
                                <!-- JS INJECTED -->
                            </tbody>
                        </table>

                        <!-- 5. BOTTOM SECTION -->
                        <div class="inv-bottom-row">
                            <div class="inv-gst-box">
                                <div class="inv-gst-header">GST BREAKDOWN</div>
                                <div class="inv-gst-row">
                                    <span id="prevGstLabel">18% GST (CGST 9% + SGST 9%)</span>
                                    <strong>+ <span class="prevCurrencySymbol">₹</span><span id="prevTaxAmtBreakdown">0.00</span></strong>
                                </div>
                                <div class="inv-gst-row" style="border-top: none; padding-top: 0;">
                                    <span style="font-weight: 700; color:#000;">Total Tax</span>
                                    <strong style="font-weight: 700;"> <span class="prevCurrencySymbol">₹</span><span id="prevTotalTaxBreakdown">0.00</span></strong>
                                </div>
                            </div>
                            <div class="inv-totals-box">
                                <div class="inv-totals-row">
                                    <span>Taxable Value</span>
                                    <span><span class="prevCurrencySymbol">₹</span><span id="prevSubtotal">0.00</span></span>
                                </div>
                                <div class="inv-totals-row">
                                    <span>Total Tax</span>
                                    <span>+ <span class="prevCurrencySymbol">₹</span><span id="prevTaxAmt">0.00</span></span>
                                </div>
                                <div class="inv-grand-total">
                                    <span>Grand Total</span>
                                    <span><span class="prevCurrencySymbol">₹</span><span id="prevGrandTotal">0.00</span></span>
                                </div>
                            </div>
                        </div>

                        <!-- 6. AMOUNT IN WORDS -->
                        <div class="inv-words-box">
                            <span>Amount in Words:</span> <strong id="prevAmountWords">Rupees Zero Only</strong>
                        </div>

                        <!-- 7. FOOTER -->
                        <div class="inv-footer">
                            <div class="inv-terms">
                                <ol id="prevTermsList">
                                    <li>Goods once sold are subject to store return/exchange policy.</li>
                                    <li>Please check items carefully before leaving store.</li>
                                    <li>This is a computer-generated tax receipt.</li>
                                </ol>
                            </div>
                            <div class="inv-sign">
                                <h4>For CHITTORTECH</h4>
                                <p>Authorised Signatory</p>
                            </div>
                        </div>
                        
                        <div class="inv-very-bottom">
                            Powered by ChittorTech • Premium IT Services
                        </div>

                    </div>`;

    content = content.replace(/<style>[\s\S]*?<\/style>/, newStyle);
    content = content.replace(/<div id="invoice-preview">[\s\S]*?<\/div><!-- \/#invoice-preview -->/, newHtml);

    const companyAdd = `<div class="form-group">
                        <label>GSTIN</label>
                        <input type="text" id="compGst" value="08AAAAA0000A1Z5" oninput="updatePreview()">
                    </div>
                    <div class="form-group">
                        <label>PAN</label>
                        <input type="text" id="compPan" value="AAAAA0000A" oninput="updatePreview()">
                    </div>`;
    content = content.replace('id="companyEmail" value="business@chittortech.in" oninput="updatePreview()">\n                    </div>', 'id="companyEmail" value="business@chittortech.in" oninput="updatePreview()">\n                    </div>\n                    ' + companyAdd);

    const clientAdd = `<div class="form-group">
                        <label>GSTIN</label>
                        <input type="text" id="clientGst" placeholder="Unregistered (Consumer)" oninput="updatePreview()">
                    </div>`;
    content = content.replace('id="clientContact" placeholder="Email Address" oninput="updatePreview()">\n                    </div>', 'id="clientContact" placeholder="Email Address" oninput="updatePreview()">\n                    </div>\n                    ' + clientAdd);

    const storeInfoCard = `<div class="card">
                    <h3><i class="fa-solid fa-store"></i> Store & Sales Info</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Salesperson</label>
                            <input type="text" id="salesperson" value="Online Store Counter 01" oninput="updatePreview()">
                        </div>
                        <div class="form-group">
                            <label>Customer Type</label>
                            <input type="text" id="customerType" value="Retail Consumer" oninput="updatePreview()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Channel</label>
                        <input type="text" id="channel" value="Chittor Web Store" oninput="updatePreview()">
                    </div>
                </div>`;
    content = content.replace('<div class="card">\n                    <div class="card-header" style="align-items:flex-end;">\n                        <div>\n                            <h3><i class="fa-solid fa-list"></i> Service Details</h3>', storeInfoCard + '\n\n                <div class="card">\n                    <div class="card-header" style="align-items:flex-end;">\n                        <div>\n                            <h3><i class="fa-solid fa-list"></i> Service Details</h3>');

    const itemRenderRepl = `d.innerHTML = \`
                    <input type="text"   placeholder="Description" value="\${item.description}" style="flex:2"
                        oninput="updateItem(\${item.id},'description',this.value)">
                    <input type="text"   placeholder="HSN" value="\${item.hsn || ''}" style="flex:1"
                        oninput="updateItem(\${item.id},'hsn',this.value)">
                    <input type="number" placeholder="Qty"  value="\${item.qty}" style="flex:0.8"
                        oninput="updateItem(\${item.id},'qty',this.value)">
                    <input type="number" placeholder="Rate" value="\${item.rate}" style="flex:1"
                        oninput="updateItem(\${item.id},'rate',this.value)">
                    <button class="icon-btn" onclick="removeItem(\${item.id})">
                        <i class="fa-solid fa-trash"></i></button>\`;`;
    content = content.replace(/d\.innerHTML = `[\s\S]*?<button class="icon-btn"[\s\S]*?<\/i><\/button>`;/, itemRenderRepl);

    content = content.replace("items.push({ id: Date.now(), description: '', qty: 1, rate: 0 });", "items.push({ id: Date.now(), description: '', hsn: '', qty: 1, rate: 0 });");
    content = content.replace("{ id: 1, description: 'Premium Web Design Package', qty: 1, rate: 25000 }", "{ id: 1, description: 'Premium Web Design Package', hsn: '998314', qty: 1, rate: 25000 }");

    const updatePreviewRepl = `function numberToWords(num) {
            if(num === 0) return 'Zero';
            const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
            const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
            const inWords = (n) => {
                if ((n = n.toString()).length > 9) return 'overflow';
                n = ('000000000' + n).substr(-9).match(/^(\\d{2})(\\d{2})(\\d{2})(\\d{1})(\\d{2})$/);
                if (!n) return; var str = '';
                str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
                str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
                str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
                str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
                str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
                return str;
            };
            const parts = num.toString().split('.');
            let words = inWords(parseInt(parts[0]));
            if (parts.length > 1 && parseInt(parts[1]) > 0) {
                let p = parts[1];
                if (p.length === 1) p = p + '0';
                words += 'and ' + inWords(parseInt(p)) + 'Paise ';
            }
            return words.trim();
        }

        function updatePreview() {
            const year   = new Date().getFullYear();
            const prefix = \`CT/\${year}/\`;
            const pfxEl  = document.getElementById('docPrefix');
            if (pfxEl) pfxEl.innerText = prefix;
            
            _st('prevDocNumber', prefix + (_v('docNumber') || '001'));
            _st('prevDocDate',   _fmtDate(_v('docDate'))   || '—');
            
            _st('prevCompanyName', (_v('companyName') || 'CHITTORTECH').toUpperCase());
            _st('prevCompanyTitle', (_v('companyName') || 'CHITTORTECH').toUpperCase());
            _st('prevCompanyAddress', _v('companyAddress') || '—');
            _st('prevCompanyPhone', _v('companyPhone') || '—');
            _st('prevCompanyEmail', _v('companyEmail') || '—');
            _st('prevCompGst', _v('compGst') || '—');
            _st('prevCompPan', _v('compPan') || '—');
            
            _st('prevClientName',    _v('clientName') || 'Customer Name');
            _st('prevClientAddress', _v('clientAddress') || '—');
            _st('prevClientPhone',   _v('clientPhone') || '—');
            _st('prevClientGst', _v('clientGst') || 'Unregistered (Consumer)');
            _st('prevPaymentMode',   _v('paymentMode'));
            
            _st('prevSalesperson', _v('salesperson') || '—');
            _st('prevCustomerType', _v('customerType') || '—');
            _st('prevChannel', _v('channel') || '—');

            const tl = document.getElementById('prevTermsList');
            if (tl) {
                tl.innerHTML = (_v('termsText') || '')
                    .split('\\n').filter(t => t.trim())
                    .map(t => \`<li>\${t.replace(/^[\\d\\.\\-\\*•]+\\s*/,'')}\</li>\`).join('');
            }

            const sym = _v('currencySymbol') || '₹';
            document.querySelectorAll('.prevCurrencySymbol').forEach(el => el.innerText = sym);

            const tbody = document.getElementById('previewItems');
            tbody.innerHTML = '';
            let subtotal = 0;
            const taxPct  = parseFloat(_v('salesTaxPct')) || 0;
            let totalTaxAmt = 0;

            items.forEach((item, idx) => {
                const amt = item.qty * item.rate;
                const itemTax = amt * taxPct / 100;
                const itemTotal = amt + itemTax;
                subtotal += amt;
                totalTaxAmt += itemTax;
                
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td>\${idx + 1}</td>
                    <td class="desc">\${item.description || '<em style="color:#bbb">New Service / Item</em>'}</td>
                    <td>\${item.hsn || '—'}</td>
                    <td class="c">\${item.qty}</td>
                    <td class="r">\${_fmt(item.rate)}</td>
                    <td class="r">\${taxPct}%</td>
                    <td class="r">\${_fmt(itemTax)}</td>
                    <td class="r" style="font-weight:700;">\${_fmt(itemTotal)}</td>\`;
                tbody.appendChild(tr);
            });

            const grand   = subtotal + totalTaxAmt;
            _st('prevSubtotal',  _fmt(subtotal));
            _st('prevTaxAmt',    _fmt(totalTaxAmt));
            _st('prevGrandTotal',_fmt(grand));
            
            _st('prevTaxAmtBreakdown', _fmt(totalTaxAmt));
            _st('prevTotalTaxBreakdown', _fmt(totalTaxAmt));
            
            const gstLabel = \`\${taxPct}% GST (CGST \${taxPct/2}% + SGST \${taxPct/2}%)\`;
            _st('prevGstLabel', gstLabel);

            const words = numberToWords(grand);
            _st('prevAmountWords', \`Rupees \${words} Only\`);

            document.getElementById('previewType').innerText = currentMode === 'INVOICE' ? 'INVOICE' : 'QUOTATION';

            saveData();
        }`;
    content = content.replace(/function updatePreview\(\) \{[\s\S]*?saveData\(\);\n        \}/, updatePreviewRepl);

    const saveDataRepl = `function saveData() {
            const data = {
                mode: currentMode,
                docNumber: _v('docNumber'), docDate: _v('docDate'), dueDate: _v('dueDate'),
                salesTaxPct: _v('salesTaxPct'), currencySymbol: _v('currencySymbol'),
                companyName: _v('companyName'), companyAddress: _v('companyAddress'),
                companyPhone: _v('companyPhone'), companyEmail: _v('companyEmail'),
                compGst: _v('compGst'), compPan: _v('compPan'),
                clientName: _v('clientName'), clientAddress: _v('clientAddress'),
                clientPhone: _v('clientPhone'), clientContact: _v('clientContact'),
                clientGst: _v('clientGst'),
                paymentMode: _v('paymentMode'), paymentInfo: _v('paymentInfo'),
                termsText: _v('termsText'), salesperson: _v('salesperson'),
                customerType: _v('customerType'), channel: _v('channel'),
                items: items
            };
            localStorage.setItem('chittortech_bill_draft', JSON.stringify(data));
        }`;
    content = content.replace(/function saveData\(\) \{[\s\S]*?localStorage\.setItem\('chittortech_bill_draft', JSON\.stringify\(data\)\);\n        \}/, saveDataRepl);

    const loadDataRepl = `function loadData() {
            const saved = localStorage.getItem('chittortech_bill_draft');
            if (!saved) return;
            try {
                const d = JSON.parse(saved);
                _set('docNumber', d.docNumber); _set('docDate', d.docDate);
                _set('dueDate', d.dueDate); _set('salesTaxPct', d.salesTaxPct);
                if (d.currencySymbol) _set('currencySymbol', d.currencySymbol);
                if (d.companyName) _set('companyName', d.companyName);
                if (d.companyAddress) _set('companyAddress', d.companyAddress);
                if (d.companyPhone) _set('companyPhone', d.companyPhone);
                if (d.companyEmail) _set('companyEmail', d.companyEmail);
                if (d.compGst) _set('compGst', d.compGst);
                if (d.compPan) _set('compPan', d.compPan);
                _set('clientName', d.clientName); _set('clientAddress', d.clientAddress);
                _set('clientPhone', d.clientPhone); _set('clientContact', d.clientContact);
                if (d.clientGst) _set('clientGst', d.clientGst);
                _set('paymentMode', d.paymentMode); _set('paymentInfo', d.paymentInfo);
                _set('termsText', d.termsText);
                if (d.salesperson) _set('salesperson', d.salesperson);
                if (d.customerType) _set('customerType', d.customerType);
                if (d.channel) _set('channel', d.channel);
                if (d.items && d.items.length) items = d.items;
                if (d.mode) currentMode = d.mode;
                _syncModeUI();
            } catch(e) { console.error('Load error', e); }
        }`;
    content = content.replace(/function loadData\(\) \{[\s\S]*?\} catch\(e\) \{ console\.error\('Load error', e\); \}\n        \}/, loadDataRepl);

    fs.writeFileSync('index.html', content, 'utf8');
    console.log("Update complete");
} catch (err) {
    console.error("Error:", err);
}

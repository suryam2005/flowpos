import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Generate HTML template for invoice
 */
export const generateInvoiceHTML = (invoiceData) => {
  if (!invoiceData) {
    throw new Error('Invoice data is required');
  }

  const {
    storeName = 'FlowPOS Store',
    storeAddress = 'Store Address',
    storeContact = '+91 XXXXXXXXXX',
    storeGSTIN = '',
    invoiceNumber = 'INV-001',
    date = new Date().toLocaleDateString('en-IN'),
    time = new Date().toLocaleTimeString('en-IN'),
    customerName = 'Walk-in Customer',
    phoneNumber = '',
    items = [],
    subtotal = 0,
    tax = 0,
    grandTotal = 0,
  } = invoiceData;

  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
          color: #1f2937;
          line-height: 1.5;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .store-name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .store-details {
          font-size: 14px;
          opacity: 0.9;
        }
        .invoice-info {
          padding: 20px 30px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }
        .invoice-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .invoice-label {
          font-weight: 600;
          color: #374151;
        }
        .invoice-value {
          color: #1f2937;
        }
        .items-section {
          padding: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background: #f3f4f6;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
          text-align: right;
        }
        .totals-section {
          background: #f8fafc;
          padding: 20px 30px;
          border-top: 1px solid #e5e7eb;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .total-label {
          font-weight: 500;
          color: #374151;
        }
        .total-value {
          font-weight: 600;
          color: #1f2937;
        }
        .grand-total {
          border-top: 2px solid #2563eb;
          padding-top: 12px;
          margin-top: 12px;
        }
        .grand-total .total-label,
        .grand-total .total-value {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
        }
        .footer {
          padding: 30px;
          text-align: center;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }
        .thank-you {
          font-size: 16px;
          color: #2563eb;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .footer-note {
          font-size: 14px;
          color: #6b7280;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .invoice-container { border: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="store-name">${storeName}</div>
          <div class="store-details">
            ${storeAddress}<br>
            Contact: ${storeContact}
            ${storeGSTIN ? `<br>GSTIN: ${storeGSTIN}` : ''}
          </div>
        </div>

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="invoice-row">
            <span class="invoice-label">Invoice Number:</span>
            <span class="invoice-value">${invoiceNumber}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">Date:</span>
            <span class="invoice-value">${date}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">Time:</span>
            <span class="invoice-value">${time}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">Customer:</span>
            <span class="invoice-value">${customerName}</span>
          </div>
          ${phoneNumber && phoneNumber.trim() ? `
          <div class="invoice-row">
            <span class="invoice-label">Phone:</span>
            <span class="invoice-value">+91 ${phoneNumber}</span>
          </div>
          ` : ''}
        </div>

        <!-- Items Section -->
        <div class="items-section">
          <div class="section-title">Items Purchased</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">₹${subtotal.toFixed(2)}</span>
          </div>
          ${tax > 0 ? `
          <div class="total-row">
            <span class="total-label">Tax (GST):</span>
            <span class="total-value">₹${tax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row grand-total">
            <span class="total-label">Grand Total Payable:</span>
            <span class="total-value">₹${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="thank-you">Thank you for your business!</div>
          <div class="footer-note">
            Generated by FlowPOS • Visit again soon!
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate PDF from invoice data
 */
export const generateInvoicePDF = async (invoiceData) => {
  try {
    if (!invoiceData) {
      throw new Error('Invoice data is required');
    }

    const html = generateInvoiceHTML(invoiceData);
    
    if (!html || html.trim() === '') {
      throw new Error('Failed to generate HTML content');
    }
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 612, // A4 width in points
      height: 792, // A4 height in points
    });

    if (!uri) {
      throw new Error('Failed to generate PDF file');
    }

    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Share PDF invoice
 */
export const shareInvoicePDF = async (pdfUri, invoiceNumber) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

/**
 * Save PDF to device downloads
 */
export const saveInvoicePDF = async (pdfUri, invoiceNumber) => {
  try {
    const fileName = `Invoice_${invoiceNumber}_${Date.now()}.pdf`;
    const downloadDir = FileSystem.documentDirectory + 'invoices/';
    
    // Create invoices directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }
    
    const newPath = downloadDir + fileName;
    await FileSystem.copyAsync({
      from: pdfUri,
      to: newPath,
    });
    
    return newPath;
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw error;
  }
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = Date.now().toString().slice(-4);
  
  return `INV-${year}${month}${day}-${time}`;
};
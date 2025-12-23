/**
 * DEPRECATED: This file is being replaced by InvoiceService.js
 * 
 * Invoice Generator Utility - Legacy Support
 * 
 * This file now delegates to the new unified InvoiceService for backward compatibility.
 * New code should use InvoiceService directly.
 */

import InvoiceService from '../services/InvoiceService';

/**
 * @deprecated Use InvoiceService.generateInvoiceHTML() instead
 */
export const generateInvoiceHTML = (invoiceData) => {
  console.warn('⚠️ generateInvoiceHTML is deprecated. Use InvoiceService.generateInvoiceHTML() instead.');
  return InvoiceService.generateInvoiceHTML(invoiceData);
};

/**
 * @deprecated Use InvoiceService.generateInvoicePDF() instead
 */
export const generateInvoicePDF = async (invoiceData) => {
  console.warn('⚠️ generateInvoicePDF is deprecated. Use InvoiceService.generateInvoicePDF() instead.');
  return await InvoiceService.generateInvoicePDF(invoiceData);
};

/**
 * @deprecated Use InvoiceService.shareInvoicePDF() instead
 */
export const shareInvoicePDF = async (pdfUri, invoiceNumber) => {
  console.warn('⚠️ shareInvoicePDF is deprecated. Use InvoiceService.shareInvoicePDF() instead.');
  return await InvoiceService.shareInvoicePDF(pdfUri, invoiceNumber);
};

/**
 * @deprecated Use InvoiceService.saveInvoicePDF() instead
 */
export const saveInvoicePDF = async (pdfUri, invoiceNumber) => {
  console.warn('⚠️ saveInvoicePDF is deprecated. Use InvoiceService.saveInvoicePDF() instead.');
  return await InvoiceService.saveInvoicePDF(pdfUri, invoiceNumber);
};

/**
 * @deprecated Use InvoiceService.generateInvoiceNumber() instead
 */
export const generateInvoiceNumber = () => {
  console.warn('⚠️ generateInvoiceNumber is deprecated. Use InvoiceService.generateInvoiceNumber() instead.');
  return InvoiceService.generateInvoiceNumber();
};
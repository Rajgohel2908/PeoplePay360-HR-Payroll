// server/services/pdfService.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../database/connection');

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generates an official, high-fidelity PDF payslip matching the UI card.
 * @param {number} payslipId
 * @returns {Promise<PDFDocument>}
 */
async function generatePayslipPdf(payslipId) {
  const payslip = await db('payslips as ps')
    .join('employees as e', 'ps.employee_id', 'e.id')
    .leftJoin('departments as d', 'e.department_id', 'd.id')
    .leftJoin('job_positions as jp', 'e.job_position_id', 'jp.id')
    .leftJoin('payruns as pr', 'ps.payrun_id', 'pr.id')
    .select(
      'ps.*',
      'e.employee_id as emp_code',
      'e.first_name',
      'e.last_name',
      'e.email',
      'e.pan_number',
      'e.uan_number',
      'e.bank_name',
      'e.account_number',
      'e.ifsc_code',
      'e.joining_date',
      'd.name as department_name',
      'jp.title as position_title',
      'pr.payrun_number',
      'pr.title as payrun_title'
    )
    .where('ps.id', payslipId)
    .first();

  if (!payslip) {
    throw new Error('Payslip not found.');
  }

  const lines = await db('payslip_lines')
    .where('payslip_id', payslipId)
    .orderBy('sequence', 'asc');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Register Arial / Arial Bold for full Unicode INR symbol support (₹)
  const fontRegularPath = path.join(__dirname, '../assets/fonts/arial.ttf');
  const fontBoldPath = path.join(__dirname, '../assets/fonts/arialbd.ttf');

  let fontRegular = 'Helvetica';
  let fontBold = 'Helvetica-Bold';

  if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
    doc.registerFont('AppFont', fontRegularPath);
    doc.registerFont('AppFont-Bold', fontBoldPath);
    fontRegular = 'AppFont';
    fontBold = 'AppFont-Bold';
  }

  // 1. Dark Header Container (slate-900)
  doc.roundedRect(40, 40, 515, 74, 10).fill('#0f172a');

  // Logo & Company Information
  const logoPath = path.resolve(__dirname, '../../client/public/logo-dark.png');
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 52, 48, { height: 26 });
    } catch (e) {
      doc.font(fontBold).fontSize(14).fillColor('#ffffff').text('PEOPLEPAY', 52, 50);
    }
  } else {
    doc.font(fontBold).fontSize(14).fillColor('#ffffff').text('PEOPLEPAY', 52, 50);
  }

  doc.font(fontRegular).fontSize(8).fillColor('#cbd5e1').text('PeoplePay Global Technologies Ltd.', 52, 79);
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Level 14, Prestige Tech Park, Outer Ring Road, Bengaluru • GST: 29ABCDE1234F1Z5', 52, 92);

  // Right Header: Confidential badge, Reference, Status
  doc.roundedRect(390, 48, 150, 18, 4).fill('#1e293b');
  doc.roundedRect(390, 48, 150, 18, 4).strokeColor('#334155').lineWidth(0.8).stroke();
  doc.font(fontBold).fontSize(7.5).fillColor('#38bdf8').text('CONFIDENTIAL PAYSLIP', 390, 53, { width: 150, align: 'center' });

  doc.font(fontRegular).fontSize(8).fillColor('#cbd5e1').text(`Ref: ${payslip.payslip_number}`, 340, 75, { width: 200, align: 'right' });
  doc.font(fontBold).fontSize(7.5).fillColor('#34d399').text(`Payment Status: ${payslip.payment_status}`, 340, 90, { width: 200, align: 'right' });

  // 2. Employee & Payroll Period Summary Grid
  const summaryY = 124;
  doc.roundedRect(40, summaryY, 515, 80, 8).fill('#f8fafc');
  doc.roundedRect(40, summaryY, 515, 80, 8).strokeColor('#e2e8f0').lineWidth(1).stroke();

  const colWidth = 118;
  const colGap = 8;
  const startX = 52;
  const col1X = startX;
  const col2X = startX + colWidth + colGap;
  const col3X = startX + (colWidth + colGap) * 2;
  const col4X = startX + (colWidth + colGap) * 3;

  // Row 1 (y = summaryY + 10)
  const r1LabelY = summaryY + 10;
  const r1ValueY = summaryY + 22;

  // Col 1: Employee Name
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Employee Name', col1X, r1LabelY);
  doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(`${payslip.first_name} ${payslip.last_name}`, col1X, r1ValueY, { width: colWidth, ellipsis: true });

  // Col 2: Employee ID
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Employee ID', col2X, r1LabelY);
  doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(payslip.emp_code, col2X, r1ValueY);

  // Col 3: Department
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Department', col3X, r1LabelY);
  doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(payslip.department_name || 'N/A', col3X, r1ValueY, { width: colWidth, ellipsis: true });

  // Col 4: Designation
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Designation', col4X, r1LabelY);
  doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(payslip.position_title || 'N/A', col4X, r1ValueY, { width: colWidth, ellipsis: true });

  // Row 2 (y = summaryY + 44)
  const r2LabelY = summaryY + 44;
  const r2ValueY = summaryY + 56;

  // Col 1: Payroll Period
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Payroll Period', col1X, r2LabelY);
  doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(`${formatDate(payslip.period_start)} – ${formatDate(payslip.period_end)}`, col1X, r2ValueY, { width: colWidth });

  // Col 2: Bank Account
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Bank Account', col2X, r2LabelY);
  const bankAcc = `${payslip.bank_name || 'N/A'} ${payslip.account_number ? '(••••' + payslip.account_number.slice(-4) + ')' : ''}`;
  doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(bankAcc, col2X, r2ValueY, { width: colWidth, ellipsis: true });

  // Col 3: PAN / UAN
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('PAN / UAN', col3X, r2LabelY);
  doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(`${payslip.pan_number || 'N/A'} / ${payslip.uan_number || 'N/A'}`, col3X, r2ValueY, { width: colWidth, ellipsis: true });

  // Col 4: Worked / Paid Days
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('Worked / Paid Days', col4X, r2LabelY);
  doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(`${payslip.worked_days} / ${payslip.paid_days} Days (LOP: ${payslip.unpaid_days})`, col4X, r2ValueY, { width: colWidth });

  // 3. Earnings & Deductions Tables Side-by-Side
  const earnings = lines.filter(l => l.category === 'basic' || l.category === 'allowance');
  const deductions = lines.filter(l => l.category === 'deduction');

  const tableStartY = 216;
  const tableWidth = 248;
  const tableGap = 19;
  const leftTableX = 40;
  const rightTableX = leftTableX + tableWidth + tableGap; // 307

  const maxRows = Math.max(earnings.length, deductions.length, 4);
  const rowHeight = 22;
  const headerHeight = 24;
  const totalRowHeight = 26;
  const tableContentHeight = maxRows * rowHeight;
  const totalTableHeight = headerHeight + tableContentHeight + totalRowHeight;

  // Background card for Left Table (Earnings)
  doc.roundedRect(leftTableX, tableStartY, tableWidth, totalTableHeight, 8).fill('#ffffff');
  doc.roundedRect(leftTableX, tableStartY, tableWidth, totalTableHeight, 8).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Header Left (Blue)
  doc.roundedRect(leftTableX, tableStartY, tableWidth, headerHeight, 8).fill('#0284c7');
  doc.rect(leftTableX, tableStartY + headerHeight - 6, tableWidth, 6).fill('#0284c7'); // square off bottom corners of header
  doc.font(fontBold).fontSize(7.5).fillColor('#ffffff').text('EARNINGS COMPONENT', leftTableX + 12, tableStartY + 7);
  doc.text('AMOUNT (₹)', leftTableX, tableStartY + 7, { width: tableWidth - 12, align: 'right' });

  // Background card for Right Table (Deductions)
  doc.roundedRect(rightTableX, tableStartY, tableWidth, totalTableHeight, 8).fill('#ffffff');
  doc.roundedRect(rightTableX, tableStartY, tableWidth, totalTableHeight, 8).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Header Right (Red)
  doc.roundedRect(rightTableX, tableStartY, tableWidth, headerHeight, 8).fill('#dc2626');
  doc.rect(rightTableX, tableStartY + headerHeight - 6, tableWidth, 6).fill('#dc2626');
  doc.font(fontBold).fontSize(7.5).fillColor('#ffffff').text('DEDUCTIONS COMPONENT', rightTableX + 12, tableStartY + 7);
  doc.text('AMOUNT (₹)', rightTableX, tableStartY + 7, { width: tableWidth - 12, align: 'right' });

  // Rows
  let curRowY = tableStartY + headerHeight + 8;
  for (let i = 0; i < maxRows; i++) {
    const earnItem = earnings[i];
    if (earnItem) {
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(earnItem.rule_name, leftTableX + 12, curRowY, { width: 140, ellipsis: true });
      doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(formatCurrency(earnItem.amount), leftTableX, curRowY, { width: tableWidth - 12, align: 'right' });
    }

    const dedItem = deductions[i];
    if (dedItem) {
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(dedItem.rule_name, rightTableX + 12, curRowY, { width: 140, ellipsis: true });
      doc.font(fontBold).fontSize(8).fillColor('#dc2626').text(formatCurrency(dedItem.amount), rightTableX, curRowY, { width: tableWidth - 12, align: 'right' });
    }

    if (i < maxRows - 1) {
      doc.moveTo(leftTableX + 12, curRowY + 16).lineTo(leftTableX + tableWidth - 12, curRowY + 16).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      doc.moveTo(rightTableX + 12, curRowY + 16).lineTo(rightTableX + tableWidth - 12, curRowY + 16).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
    }

    curRowY += rowHeight;
  }

  // Totals Bottom Bar
  const totalBarY = tableStartY + headerHeight + tableContentHeight;
  doc.roundedRect(leftTableX, totalBarY, tableWidth, totalRowHeight, 8).fill('#f8fafc');
  doc.rect(leftTableX, totalBarY, tableWidth, 6).fill('#f8fafc'); // square off top corners of footer
  doc.moveTo(leftTableX, totalBarY).lineTo(leftTableX + tableWidth, totalBarY).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.font(fontBold).fontSize(7.5).fillColor('#0f172a').text('TOTAL GROSS EARNINGS', leftTableX + 12, totalBarY + 8);
  doc.font(fontBold).fontSize(8.5).fillColor('#0369a1').text(formatCurrency(payslip.gross_salary), leftTableX, totalBarY + 7, { width: tableWidth - 12, align: 'right' });

  doc.roundedRect(rightTableX, totalBarY, tableWidth, totalRowHeight, 8).fill('#f8fafc');
  doc.rect(rightTableX, totalBarY, tableWidth, 6).fill('#f8fafc');
  doc.moveTo(rightTableX, totalBarY).lineTo(rightTableX + tableWidth, totalBarY).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.font(fontBold).fontSize(7.5).fillColor('#0f172a').text('TOTAL DEDUCTIONS', rightTableX + 12, totalBarY + 8);
  doc.font(fontBold).fontSize(8.5).fillColor('#b91c1c').text(formatCurrency(payslip.total_deductions), rightTableX, totalBarY + 7, { width: tableWidth - 12, align: 'right' });

  // 4. Net Salary Payable Callout Banner (Emerald)
  const netCardY = totalBarY + totalRowHeight + 20;
  doc.roundedRect(40, netCardY, 515, 66, 12).fill('#ecfdf5');
  doc.roundedRect(40, netCardY, 515, 66, 12).strokeColor('#10b981').lineWidth(1.5).stroke();

  doc.font(fontBold).fontSize(8).fillColor('#065f46').text('NET SALARY PAYABLE (DIRECT BANK DEPOSIT)', 56, netCardY + 12);
  doc.font(fontBold).fontSize(18).fillColor('#022c22').text(formatCurrency(payslip.net_salary), 56, netCardY + 25);
  doc.font(fontRegular).fontSize(7.5).fillColor('#047857').text(`Disbursed via Electronic Fund Transfer to ${payslip.bank_name || 'HDFC Bank'}`, 56, netCardY + 50);

  // Status Badge on the right
  doc.roundedRect(440, netCardY + 16, 95, 20, 10).fill('#d1fae5');
  doc.roundedRect(440, netCardY + 16, 95, 20, 10).strokeColor('#a7f3d0').lineWidth(1).stroke();
  doc.font(fontBold).fontSize(8).fillColor('#065f46').text(payslip.payment_status, 440, netCardY + 22, { width: 95, align: 'center' });
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text('System Generated Receipt', 440, netCardY + 42, { width: 95, align: 'center' });

  // 5. Legal Disclaimer & Footer
  const footerY = 735;
  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
  doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text(
    'This is a computer-generated confidential payslip issued by PeoplePay360 HR & Payroll Engine and requires no physical signature.',
    40,
    footerY + 10,
    { width: 515, align: 'center' }
  );
  doc.text('Corporate ID: 29ABCDE1234F1Z5 • Bengaluru, India', 40, footerY + 21, { width: 515, align: 'center' });

  return doc;
}

module.exports = { generatePayslipPdf };


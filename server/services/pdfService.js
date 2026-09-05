// server/services/pdfService.js
const PDFDocument = require('pdfkit');
const db = require('../database/connection');

/**
 * Generates a clean, professional PDF payslip stream for an employee.
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

  // Company Header
  doc.rect(40, 40, 515, 65).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('PEOPLEPAY360', 55, 52);
  doc.fontSize(9).font('Helvetica').text('Global HR & Payroll Management Platform', 55, 74);
  doc.fontSize(8).fillColor('#94a3b8').text('Level 14, Prestige Tech Park, Bengaluru | GST: 29ABCDE1234F1Z5', 55, 88);
  
  doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold').text('CONFIDENTIAL PAYSLIP', 360, 55, { align: 'right' });
  doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica').text(`Ref: ${payslip.payslip_number}`, 360, 74, { align: 'right' });

  // Employee & Pay Summary Card
  let y = 120;
  doc.rect(40, y, 515, 85).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.rect(40, y, 515, 20).fill('#f8fafc');
  doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('EMPLOYEE & PERIOD DETAILS', 50, y + 6);

  y += 28;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('Employee Name:', 50, y);
  doc.font('Helvetica').fillColor('#0f172a').text(`${payslip.first_name} ${payslip.last_name}`, 130, y);

  doc.font('Helvetica-Bold').fillColor('#64748b').text('Employee ID:', 320, y);
  doc.font('Helvetica').fillColor('#0f172a').text(payslip.emp_code, 400, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor('#64748b').text('Department:', 50, y);
  doc.font('Helvetica').fillColor('#0f172a').text(payslip.department_name || 'N/A', 130, y);

  doc.font('Helvetica-Bold').fillColor('#64748b').text('Designation:', 320, y);
  doc.font('Helvetica').fillColor('#0f172a').text(payslip.position_title || 'N/A', 400, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor('#64748b').text('Pay Period:', 50, y);
  doc.font('Helvetica').fillColor('#0f172a').text(`${payslip.period_start} to ${payslip.period_end}`, 130, y);

  doc.font('Helvetica-Bold').fillColor('#64748b').text('Bank Account:', 320, y);
  doc.font('Helvetica').fillColor('#0f172a').text(`${payslip.bank_name || 'N/A'} - ${payslip.account_number ? '••••' + payslip.account_number.slice(-4) : 'N/A'}`, 400, y);

  y += 14;
  doc.font('Helvetica-Bold').fillColor('#64748b').text('PAN / Tax ID:', 50, y);
  doc.font('Helvetica').fillColor('#0f172a').text(payslip.pan_number || 'N/A', 130, y);

  doc.font('Helvetica-Bold').fillColor('#64748b').text('Worked / Paid Days:', 320, y);
  doc.font('Helvetica').fillColor('#0f172a').text(`${payslip.worked_days} / ${payslip.paid_days} Days (LOP: ${payslip.unpaid_days})`, 400, y);

  // Earnings & Deductions Tables
  y += 35;
  const earnings = lines.filter(l => l.category === 'basic' || l.category === 'allowance');
  const deductions = lines.filter(l => l.category === 'deduction');

  // Headers
  doc.rect(40, y, 250, 20).fill('#0ea5e9');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('EARNINGS', 50, y + 6);
  doc.text('AMOUNT (₹)', 220, y + 6, { align: 'right' });

  doc.rect(305, y, 250, 20).fill('#ef4444');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS', 315, y + 6);
  doc.text('AMOUNT (₹)', 485, y + 6, { align: 'right' });

  y += 24;
  const startLineY = y;
  const maxRows = Math.max(earnings.length, deductions.length, 5);

  let curEY = y;
  earnings.forEach((e) => {
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(e.rule_name, 50, curEY);
    doc.font('Helvetica-Bold').text(parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 220, curEY, { align: 'right' });
    curEY += 16;
  });

  let curDY = y;
  deductions.forEach((d) => {
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(d.rule_name, 315, curDY);
    doc.font('Helvetica-Bold').text(parseFloat(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 485, curDY, { align: 'right' });
    curDY += 16;
  });

  const bottomY = Math.max(curEY, curDY) + 10;
  doc.rect(40, bottomY, 250, 22).fill('#f1f5f9');
  doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('TOTAL GROSS EARNINGS:', 50, bottomY + 7);
  doc.text(`₹${parseFloat(payslip.gross_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 220, bottomY + 7, { align: 'right' });

  doc.rect(305, bottomY, 250, 22).fill('#f1f5f9');
  doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('TOTAL DEDUCTIONS:', 315, bottomY + 7);
  doc.text(`₹${parseFloat(payslip.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 485, bottomY + 7, { align: 'right' });

  // Net Pay Callout
  const netY = bottomY + 35;
  doc.rect(40, netY, 515, 55).fill('#ecfdf5');
  doc.rect(40, netY, 515, 55).strokeColor('#10b981').lineWidth(1.5).stroke();

  doc.fillColor('#047857').fontSize(11).font('Helvetica-Bold').text('NET SALARY PAYABLE:', 60, netY + 14);
  doc.fillColor('#065f46').fontSize(18).font('Helvetica-Bold').text(`₹${parseFloat(payslip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, netY + 12, { align: 'right' });

  doc.fillColor('#059669').fontSize(8).font('Helvetica').text(`Disbursement Mode: Direct Bank Transfer | Status: ${payslip.payment_status}`, 60, netY + 34);

  // Footer & Disclaimer
  const footY = 740;
  doc.rect(40, footY, 515, 1).fill('#cbd5e1');
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Note: This is a system generated payslip generated by PeoplePay360 HR & Payroll Platform and does not require a physical signature.', 40, footY + 10, { align: 'center' });

  return doc;
}

module.exports = { generatePayslipPdf };

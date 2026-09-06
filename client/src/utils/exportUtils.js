// client/src/utils/exportUtils.js
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element as a pixel-perfect high-DPI PDF.
 * Supports multi-page content that exceeds a single A4 page.
 *
 * @param {HTMLElement|string} elementOrId - DOM element or its ID
 * @param {string} filename - PDF file name (without .pdf extension)
 * @param {object} [options] - Optional overrides
 * @param {number} [options.scale=2.5] - Canvas scale for DPI
 * @param {number} [options.margin=10] - PDF margin in mm
 * @param {'portrait'|'landscape'} [options.orientation='portrait']
 * @returns {Promise<void>}
 */
export async function exportElementAsPdf(elementOrId, filename, options = {}) {
  const {
    scale = 2.5,
    margin = 10,
    orientation = 'portrait'
  } = options;

  const element =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) {
    throw new Error('Export element not found.');
  }

  // Wait for all images inside the element to finish loading
  const images = element.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        })
    )
  );

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc) => {
      // Remove box shadows for cleaner PDF
      const cloned = typeof elementOrId === 'string'
        ? clonedDoc.getElementById(elementOrId)
        : clonedDoc.querySelector(`[data-export-id]`) || clonedDoc.body;
      if (cloned) {
        cloned.style.boxShadow = 'none';
      }
    }
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const printWidth = pageWidth - margin * 2;
  const printHeight = (canvas.height * printWidth) / canvas.width;

  // If content fits on a single page
  if (printHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight, undefined, 'FAST');
  } else {
    // Multi-page: slice the canvas into A4-sized vertical strips
    const availableHeight = pageHeight - margin * 2;
    const totalPages = Math.ceil(printHeight / availableHeight);
    const sliceHeight = Math.floor(canvas.height / totalPages);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(sliceHeight, canvas.height - i * sliceHeight);

      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        0, i * sliceHeight,                               // source x, y
        canvas.width, sliceCanvas.height,                  // source width, height
        0, 0,                                              // dest x, y
        sliceCanvas.width, sliceCanvas.height              // dest width, height
      );

      const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
      const slicePrintHeight = (sliceCanvas.height * printWidth) / sliceCanvas.width;
      pdf.addImage(sliceData, 'PNG', margin, margin, printWidth, slicePrintHeight, undefined, 'FAST');
    }
  }

  pdf.save(`${filename}.pdf`);
}


/**
 * Exports tabular data to a properly formatted, UTF-8 BOM CSV file.
 * Handles Indian currency formatting, date formatting, and Excel compatibility.
 *
 * @param {Array<object>} data - Raw data rows
 * @param {Array<{key: string, header: string, format?: function}>} columns - Column definitions
 * @param {string} filename - CSV file name (without .csv extension)
 */
export function exportTableAsCsv(data, columns, filename) {
  if (!data || data.length === 0) {
    throw new Error('No data available to export.');
  }

  const headers = columns.map((col) => `"${col.header}"`).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        let val = row[col.key];

        // Apply custom formatter if provided
        if (col.format) {
          val = col.format(val, row);
        }

        // Escape double quotes and wrap in quotes
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  // UTF-8 BOM for Excel compatibility (ensures ₹ symbol renders correctly)
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers, ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/**
 * Helper: format a number as Indian Rupee currency string.
 * @param {number|string} val
 * @returns {string} e.g. "₹1,20,000.00"
 */
export function formatINR(val) {
  const num = parseFloat(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Helper: format a date string to DD/MM/YYYY.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatExportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

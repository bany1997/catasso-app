/**
 * Export and Print service for CATASSO ERP
 * Generates true Excel-compatible CSVs (with BOM and proper locale formatting)
 * and formal printable industrial PDF views with Angolan legal/industrial headers.
 */

export function exportToExcel(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  // UTF-8 BOM so Excel opens with correct characters (á, ç, õ, etc.)
  let csvContent = '\uFEFF';
  
  // Format headers
  csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';') + '\r\n';

  // Format rows
  rows.forEach(row => {
    const rowStr = row
      .map(cell => {
        if (cell === null || cell === undefined) return '""';
        return `"${String(cell).replace(/"/g, '""')}"`;
      })
      .join(';');
    csvContent += rowStr + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface PrintableReportConfig {
  title: string;
  documentNumber: string;
  warehouseName: string;
  warehouseProvince: string;
  date: string;
  authorName: string;
  role: string;
  metadata?: { label: string; value: string }[];
  tables: {
    title?: string;
    headers: string[];
    rows: (string | number)[][];
  }[];
  notes?: string;
  signatures?: string[];
}

export function printFormalDocument(config: PrintableReportConfig): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, autorize popups para gerar e imprimir o documento em PDF.');
    return;
  }

  const metadataHtml = config.metadata
    ? `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px;">
        ${config.metadata.map(m => `<div><strong>${m.label}:</strong> ${m.value}</div>`).join('')}
       </div>`
    : '';

  const tablesHtml = config.tables
    .map(t => `
      ${t.title ? `<h3 style="margin-top: 20px; margin-bottom: 8px; font-size: 15px; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">${t.title}</h3>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            ${t.headers.map(h => `<th style="border: 1px solid #334155; padding: 8px; text-align: left; font-weight: 600;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(t.rows as any[])
            .map(
              (row: any[]) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              ${row.map(cell => `<td style="border: 1px solid #e2e8f0; padding: 7px 8px;">${cell}</td>`).join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `)
    .join('');

  const signaturesHtml = config.signatures
    ? `
      <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(${config.signatures.length}, 1fr); gap: 20px; text-align: center; font-size: 12px;">
        ${config.signatures
          .map(
            sig => `
          <div>
            <div style="border-top: 1px solid #000; margin-bottom: 6px; padding-top: 4px;"><strong>${sig}</strong></div>
            <div style="color: #64748b; font-size: 11px;">Assinatura & Carimbo Oficial</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <title>${config.title} - ${config.documentNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 40px;
          background: #fff;
        }
        @media print {
          body { margin: 15mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #0284c7; color: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>CATASSO ERP Industrial:</strong> Documento pronto para impressão ou salvar em PDF.</span>
        <button onclick="window.print()" style="background: white; color: #0284c7; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>

      <header style="border-bottom: 3px double #0f172a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a;">CATASSO LOGÍSTICA INDUSTRIAL</div>
          <div style="font-size: 12px; color: #475569; margin-top: 3px;">República de Angola · Gestão Integrada de Cadeia de Suprimentos & Frotas</div>
          <div style="font-size: 12px; color: #475569;">Unidade: <strong>${config.warehouseName} (${config.warehouseProvince})</strong></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: #0369a1;">${config.documentNumber}</div>
          <div style="font-size: 11px; color: #64748b;">Emissão: ${config.date}</div>
          <div style="font-size: 11px; color: #64748b;">Responsável: ${config.authorName} (${config.role})</div>
        </div>
      </header>

      <h1 style="font-size: 20px; font-weight: 700; text-align: center; text-transform: uppercase; margin: 25px 0 15px 0; color: #0f172a;">
        ${config.title}
      </h1>

      ${metadataHtml}
      ${tablesHtml}

      ${config.notes ? `<div style="margin-top: 15px; padding: 10px; background: #fffbeb; border-left: 4px solid #f59e0b; font-size: 12px;"><strong>Observações Importantes:</strong> ${config.notes}</div>` : ''}

      ${signaturesHtml}

      <footer style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>Documento oficial gerado eletronicamente por CATASSO ERP de Logística Industrial</span>
        <span>Autor: Albano Luana do Nascimento Catasso · alncatasso@gmail.com</span>
      </footer>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export interface ProductLabelData {
  sku: string;
  name: string;
  category: string;
  warehouseName: string;
  locationBin?: string;
  originRef?: string; // N° Fatura, Embarque, Fornecedor
  supplierName?: string;
  batchNumber?: string;
  isChemical?: boolean;
  fispqNumber?: string;
  isCalibrated?: boolean;
  calibrationCert?: string;
  quantity?: number;
  unit?: string;
}

export function printProductLabels(labels: ProductLabelData[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, autorize popups para imprimir as etiquetas.');
    return;
  }

  const labelsHtml = labels
    .map(
      (l, idx) => `
      <div style="border: 2px solid #0f172a; padding: 12px; border-radius: 4px; page-break-inside: avoid; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; height: 210px; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">CATASSO INDUSTRIAL</div>
            <div style="font-size: 16px; font-weight: 900; color: #0f172a; font-family: monospace;">${l.sku}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #475569;">${l.warehouseName}</div>
            <div style="font-size: 12px; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 3px;">${l.locationBin || 'LOCAL: PADRÃO'}</div>
          </div>
        </div>

        <div style="margin: 6px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.2; max-height: 28px; overflow: hidden;">${l.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Cat: ${l.category} ${l.quantity ? `· <strong>Qtd: ${l.quantity} ${l.unit || 'UN'}</strong>` : ''}</div>
        </div>

        <div style="font-size: 9.5px; background: #f8fafc; padding: 6px; border-radius: 4px; border: 1px dashed #cbd5e1;">
          <div><strong>Origem / Doc:</strong> ${l.originRef || 'Entrada Almoxarifado Geral'}</div>
          <div><strong>Fornecedor:</strong> ${l.supplierName || 'Fornecedor Homologado'}</div>
          ${l.batchNumber ? `<div><strong>Lote:</strong> ${l.batchNumber}</div>` : ''}
          ${l.isChemical && l.fispqNumber ? `<div style="color: #b91c1c; font-weight: bold;">FISPQ: ${l.fispqNumber}</div>` : ''}
          ${l.isCalibrated && l.calibrationCert ? `<div style="color: #15803d; font-weight: bold;">EIMES Cert: ${l.calibrationCert}</div>` : ''}
        </div>

        <!-- Simulated industrial barcode representation -->
        <div style="margin-top: 6px; text-align: center;">
          <div style="letter-spacing: 4px; font-family: monospace; font-size: 16px; font-weight: 900; color: #1e293b; background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); height: 26px; border-radius: 2px;"></div>
          <div style="font-size: 9px; font-family: monospace; color: #475569; margin-top: 2px;">*${l.sku}*</div>
        </div>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <title>Etiquetas de Produtos - CATASSO</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 20px;
          background: #f1f5f9;
        }
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        @media print {
          body { margin: 8mm; background: #fff; }
          .no-print { display: none; }
          .labels-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #0f172a; color: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>${labels.length} Etiquetas Geradas:</strong> Formato pronto para impressora térmica ou folha A4.</span>
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">Imprimir Etiquetas / PDF</button>
      </div>

      <div class="labels-grid">
        ${labelsHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

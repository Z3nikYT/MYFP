import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { Spesa } from '../types';

/**
 * Esporta le spese in formato CSV compatibile con Excel
 */
export async function esportaSpeseCSV(spese: Spesa[], nomeTarget: string = 'Tutti_i_Mesi') {
  if (!spese || spese.length === 0) {
    if (Platform.OS === 'web') alert('Nessuna spesa presente da esportare per la selezione.');
    return;
  }

  let csvContent = 'ID;Data;Mese;Categoria;Descrizione;Importo\n';

  spese.forEach((s) => {
    csvContent += `"${s.id}";"${s.data}";"${s.meseId}";"${s.categoria}";"${s.descrizione.replace(/"/g, '""')}";"${s.importo.toFixed(2)}"\n`;
  });

  const fileName = `MYFP_Spese_${nomeTarget.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fileUri = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Esporta CSV (${nomeTarget})` });
    }
  }
}

/**
 * Genera il Report PDF eliminando qualsiasi intestazione del browser (localhost, data, url)
 */
export async function generaReportPDF(
  titoloReport: string,
  datiMetriche: { entrate: number; risparmio: number; spese: number; margine: number; isMedia?: boolean },
  speseMese: Spesa[],
  valuta: string = '€'
) {
  const righeSpeseHtml = speseMese
    .map(
      (s) => `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px;">${s.data}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600;">${s.descrizione}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">${s.meseId} • ${s.categoria}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; color: #DC2626; font-weight: 700;">- ${valuta} ${s.importo.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const htmlDocument = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MYFP Report - ${titoloReport}</title>
    <style>
      /* RIMUOVE INTESTAZIONI E PIÈ DI PAGINA DEL BROWSER (LOCALHOST:8081, DATA, ETC.) */
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #FFFFFF !important;
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: #0F172A;
        background-color: #FFFFFF;
        margin: 0;
        padding: 15px;
      }
      .header-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0F172A;
        padding-bottom: 14px;
        margin-bottom: 20px;
      }
      .brand-title {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }
      .brand-sub {
        font-size: 12px;
        color: #64748B;
        margin-top: 3px;
      }
      .badge-status {
        background: #0F172A;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
      }
      .metrics-grid {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
      }
      .card {
        flex: 1;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 12px;
      }
      .card-title {
        font-size: 10px;
        font-weight: 700;
        color: #64748B;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .card-value {
        font-size: 18px;
        font-weight: 800;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      th {
        background: #F1F5F9;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 9px 12px;
        border-bottom: 2px solid #CBD5E1;
        text-align: left;
      }
      .empty-row {
        text-align: center;
        padding: 24px;
        color: #94A3B8;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="header-box">
      <div>
        <div class="brand-title">MYFP • Report Finanziario</div>
        <div class="brand-sub">${titoloReport} • Documento generato il ${new Date().toLocaleDateString('it-IT')}</div>
      </div>
      <div class="badge-status">CONFERMATO</div>
    </div>

    <div class="metrics-grid">
      <div class="card">
        <div class="card-title">${datiMetriche.isMedia ? 'Entrate Medie / Totali' : 'Entrate Totali'}</div>
        <div class="card-value" style="color: #0F172A;">${valuta} ${datiMetriche.entrate.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-title">${datiMetriche.isMedia ? 'Fondo Accantonato' : 'Fondo Risparmio'}</div>
        <div class="card-value" style="color: #059669;">${valuta} ${datiMetriche.risparmio.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-title">${datiMetriche.isMedia ? 'Spese Totali Effettuate' : 'Spese Effettive'}</div>
        <div class="card-value" style="color: #DC2626;">${valuta} ${datiMetriche.spese.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-title">${datiMetriche.isMedia ? 'Margine Totale Residuo' : 'Margine Rimanente'}</div>
        <div class="card-value" style="color: #2563EB;">${valuta} ${datiMetriche.margine.toFixed(2)}</div>
      </div>
    </div>

    <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">Dettaglio Movimenti Spesa (${speseMese.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrizione</th>
          <th>Mese / Categoria</th>
          <th style="text-align: right;">Importo</th>
        </tr>
      </thead>
      <tbody>
        ${righeSpeseHtml || '<tr><td colspan="4" class="empty-row">Nessun movimento registrato.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;

  if (Platform.OS === 'web') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlDocument);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 300);
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html: htmlDocument });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Report ${titoloReport}` });
  }
}
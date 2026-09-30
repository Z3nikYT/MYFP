import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { Alert, Platform } from 'react-native';
import { Spesa, StatisticheMese, UserProfile } from '../types/index';

interface GeneraReportParams {
  user: UserProfile;
  mese: string;
  stats: StatisticheMese;
  spese: Spesa[];
  inviaEmailSubito?: boolean;
}

export async function generaReportPDF({
  user,
  mese,
  stats,
  spese,
  inviaEmailSubito = false,
}: GeneraReportParams) {
  const valuta = user.valuta || '€';
  const speseMese = spese.filter((s) => s.meseId === mese);
  const dataStampa = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dataOraISO = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const codiceDocumento = `EC-${mese.toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`;
  const nomeCliente = user.nome?.trim() || user.email.split('@')[0];
  const nomeFileDownload = `Estratto_Conto_MYFP_${mese.replace(/\s+/g, '_')}.html`;

  // Righe contabili
  const righeTabella = speseMese.length > 0
    ? speseMese
        .map(
          (s, idx) => `
          <tr style="border-bottom: 1px solid #1E293B; background-color: ${idx % 2 === 1 ? '#111827' : '#0B0F19'};">
            <td style="padding: 10px 14px; font-size: 12px; color: #94A3B8; font-family: monospace;">${s.data}</td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #F8FAFC;">${s.descrizione}</td>
            <td style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase;">${s.categoria}</td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #EF4444; text-align: right; font-family: monospace;">- ${valuta} ${s.importo.toFixed(2)}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="4" style="text-align: center; padding: 30px; color: #64748B; font-style: italic;">Nessuna transazione contabile registrata nel periodo.</td></tr>`;

  // Template Documento Ufficiale Dark Mode
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="utf-8">
        <title>Estratto Conto - ${mese}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0B0F19;
            color: #F8FAFC;
            margin: 0;
            padding: 24px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1E293B;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .brand {
            font-size: 26px;
            font-weight: 900;
            color: #38BDF8;
            letter-spacing: 1px;
          }
          .brand span { color: #F8FAFC; }
          .brand-sub {
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .doc-info { text-align: right; }
          .doc-badge {
            display: inline-block;
            background: #1E293B;
            color: #38BDF8;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-id {
            font-size: 11px;
            color: #94A3B8;
            margin-top: 4px;
            font-family: monospace;
          }
          .client-grid {
            display: flex;
            justify-content: space-between;
            background-color: #151D2F;
            border: 1px solid #1E293B;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
          }
          .client-col p { margin: 2px 0; font-size: 13px; }
          .col-label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .kpi-row {
            display: flex;
            gap: 12px;
            margin-bottom: 26px;
          }
          .kpi-card {
            flex: 1;
            background-color: #151D2F;
            border: 1px solid #1E293B;
            border-radius: 12px;
            padding: 14px;
          }
          .kpi-card.green { border-color: rgba(16, 185, 129, 0.3); background-color: rgba(16, 185, 129, 0.05); }
          .kpi-card.blue { border-color: rgba(56, 189, 248, 0.3); background-color: rgba(56, 189, 248, 0.05); }
          .kpi-num {
            font-size: 20px;
            font-weight: 800;
            margin-top: 6px;
            font-family: monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: #151D2F;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #1E293B;
          }
          th {
            background-color: #1E293B;
            color: #94A3B8;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 12px 14px;
            text-align: left;
          }
          .footer-note {
            margin-top: 36px;
            border-top: 1px solid #1E293B;
            padding-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748B;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="brand">MY<span>FP</span></div>
            <div class="brand-sub">Financial Intelligence Platform</div>
          </div>
          <div class="doc-info">
            <div class="doc-badge">Estratto Conto Ufficiale</div>
            <div class="doc-id">${codiceDocumento}</div>
          </div>
        </div>

        <div class="client-grid">
          <div class="client-col">
            <div class="col-label">Intestatario Posizione</div>
            <p style="font-weight: 700; color: #F8FAFC;">${nomeCliente}</p>
            <p style="color: #94A3B8;">${user.email}</p>
          </div>
          <div class="client-col" style="text-align: right;">
            <div class="col-label">Riferimento Contabile</div>
            <p style="font-weight: 700; color: #38BDF8;">${mese}</p>
            <p style="color: #94A3B8;">Emesso il ${dataStampa}</p>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card blue">
            <div class="col-label">Entrate Totali</div>
            <div class="kpi-num" style="color: #38BDF8;">+ ${valuta} ${stats.totaleEntrate.toFixed(2)}</div>
          </div>
          <div class="kpi-card green">
            <div class="col-label">Fondo Blindato (${user.percentualeRisparmio || 40}%)</div>
            <div class="kpi-num" style="color: #10B981;">${valuta} ${stats.quota40.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="col-label">Totale Uscite</div>
            <div class="kpi-num" style="color: #EF4444;">- ${valuta} ${stats.speseEffettive.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="col-label">Saldo Spendibile</div>
            <div class="kpi-num" style="color: ${stats.rimanente60 >= 0 ? '#F8FAFC' : '#EF4444'};">${valuta} ${stats.rimanente60.toFixed(2)}</div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #CBD5E1; margin-bottom: 8px; letter-spacing: 0.5px;">
          Registro Movimenti del Periodo
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Data</th>
              <th style="width: 44%;">Descrizione</th>
              <th style="width: 20%;">Categoria</th>
              <th style="width: 18%; text-align: right;">Importo</th>
            </tr>
          </thead>
          <tbody>
            ${righeTabella}
          </tbody>
        </table>

        <div class="footer-note">
          <div>Documento contabile certificato ad uso personale generato tramite MYFP.</div>
          <div>Audit: ${dataOraISO}</div>
        </div>
      </body>
    </html>
  `;

  const oggettoEmail = `Estratto Conto MYFP - ${mese} - ${nomeCliente}`;
  const corpoEmail = 
`Gentile ${nomeCliente},

in allegato Le trasmettiamo l'Estratto Conto Ufficiale relativo al periodo contabile di ${mese}.

RIEPILOGO POSIZIONE:
• Entrate Totali Registrate:    ${valuta} ${stats.totaleEntrate.toFixed(2)}
• Risparmio Blindato (${user.percentualeRisparmio || 40}%):     ${valuta} ${stats.quota40.toFixed(2)}
• Totale Spese ed Uscite:       ${valuta} ${stats.speseEffettive.toFixed(2)}
• Saldo Rimanente Spendibile:   ${valuta} ${stats.rimanente60.toFixed(2)}
• Stato Contabile:              ${stats.stato}

Riferimento Documento: ${codiceDocumento}
Data Generazione: ${dataStampa}

Distinti saluti,
MYFP Financial Intelligence System`;

  try {
    // ---------------------------------------------------------
    // 1. INVIA AD ACCOUNT (EMAIL CON ALLEGATO AUTOMATICO)
    // ---------------------------------------------------------
    if (inviaEmailSubito) {
      if (Platform.OS === 'web') {
        // Sul Web: scarica il file del report nei download e apre Gmail
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = nomeFileDownload;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        const corpoConIstruzione = `${corpoEmail}\n\n[Il documento ufficiale è stato scaricato nei tuoi download con nome: ${nomeFileDownload}]`;
        const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(user.email)}&su=${encodeURIComponent(oggettoEmail)}&body=${encodeURIComponent(corpoConIstruzione)}`;
        window.open(gmailWebUrl, '_blank');
        return;
      }

      // Su Smartphone (Android / iOS): genera il PDF e allega automaticamente
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const canCompose = await MailComposer.isAvailableAsync();

      if (canCompose) {
        // Allega fisicamente il PDF generato al messaggio email
        await MailComposer.composeAsync({
          recipients: [user.email],
          subject: oggettoEmail,
          body: corpoEmail,
          attachments: [uri],
        });
        return;
      }

      // Se non c'è MailComposer (o fallback Android), usa lo share sheet nativo con allegato PDF già inserito
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Invia Estratto Conto tramite Email',
        });
      }
      return;
    }

    // ---------------------------------------------------------
    // 2. SCARICA PDF
    // ---------------------------------------------------------
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Salva o Esporta Estratto Conto',
        });
      } else {
        Alert.alert('PDF Generato', `File salvato in: ${uri}`);
      }
    }
  } catch (err: any) {
    Alert.alert('Errore', err.message || 'Operazione non completata.');
  }
}
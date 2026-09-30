import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Spesa, CategoriaSpesa } from '../types/index';

const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

function mappaCategoria(val: string): CategoriaSpesa {
  const v = (val || '').toLowerCase().trim();
  if (v.includes('affitt') || v.includes('mutuo') || v.includes('casa')) return 'Affitto/Mutuo';
  if (v.includes('bollett') || v.includes('luce') || v.includes('gas') || v.includes('utenze')) return 'Bollette';
  if (v.includes('spesa') || v.includes('alimentar') || v.includes('supermercat') || v.includes('cibo')) return 'Spesa Alimentare';
  if (v.includes('trasport') || v.includes('benzin') || v.includes('carburant') || v.includes('treno') || v.includes('bus')) return 'Trasporti';
  if (v.includes('salut') || v.includes('farmac') || v.includes('medic')) return 'Salute';
  if (v.includes('ristorant') || v.includes('bar') || v.includes('pizza') || v.includes('cena') || v.includes('pranzo')) return 'Ristoranti';
  if (v.includes('shopping') || v.includes('abbigliamento') || v.includes('vestit')) return 'Shopping';
  if (v.includes('abbonament') || v.includes('netflix') || v.includes('spotify') || v.includes('icloud') || v.includes('prime')) return 'Abbonamenti';
  if (v.includes('rat') || v.includes('finanziament')) return 'Rate';
  if (v.includes('svago') || v.includes('hobby') || v.includes('gioch') || v.includes('cinema')) return 'Svago';
  return 'Altro';
}

function ricavaMeseDaData(dataStr: string, meseFallback: string): string {
  if (!dataStr) return meseFallback;
  
  // Prova a parsare formati come YYYY-MM-DD o DD/MM/YYYY o DD-MM-YYYY
  let anno = '';
  let meseNum = -1;

  if (dataStr.includes('-')) {
    const parts = dataStr.split('-');
    if (parts[0].length === 4) {
      anno = parts[0];
      meseNum = parseInt(parts[1], 10) - 1;
    } else if (parts[2]?.length === 4) {
      anno = parts[2];
      meseNum = parseInt(parts[1], 10) - 1;
    }
  } else if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    if (parts[2]?.length === 4) {
      anno = parts[2];
      meseNum = parseInt(parts[1], 10) - 1;
    }
  }

  if (meseNum >= 0 && meseNum < 12) {
    const nomeMese = NOMI_MESI[meseNum];
    return anno ? `${nomeMese} ${anno}` : nomeMese;
  }

  return meseFallback;
}

export async function selezionaFileCSV(): Promise<string | null> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return null;
    }

    const asset = res.assets[0];

    if (Platform.OS === 'web') {
      if ((asset as any).file) {
        return await (asset as any).file.text();
      }
      const response = await fetch(asset.uri);
      return await response.text();
    } else {
      return await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
  } catch (err) {
    console.error('Errore selezione file CSV:', err);
    return null;
  }
}

export function analizzaContenutoCSV(contenuto: string, meseCorrente: string): Spesa[] {
  if (!contenuto) return [];

  const righe = contenuto.split(/\r?\n/).filter((r) => r.trim().length > 0);
  if (righe.length === 0) return [];

  // Rileva separatore (virgola, punto e virgola o tab)
  const primaRiga = righe[0];
  let sep = ',';
  if ((primaRiga.match(/;/g) || []).length > (primaRiga.match(/,/g) || []).length) sep = ';';
  else if ((primaRiga.match(/\t/g) || []).length > (primaRiga.match(/,/g) || []).length) sep = '\t';

  const parseCampi = (line: string) => {
    const res: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === sep && !inQuotes) {
        res.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur.trim().replace(/^"|"$/g, ''));
    return res;
  };

  const header = parseCampi(primaRiga).map((h) => h.toLowerCase());
  let idxData = header.findIndex((h) => h.includes('data') || h.includes('date'));
  let idxDesc = header.findIndex((h) => h.includes('desc') || h.includes('nome') || h.includes('titolo') || h.includes('causale'));
  let idxImporto = header.findIndex((h) => h.includes('importo') || h.includes('prezzo') || h.includes('valore') || h.includes('cifra') || h.includes('amount'));
  let idxCat = header.findIndex((h) => h.includes('categ') || h.includes('tipo'));
  let idxMese = header.findIndex((h) => h.includes('mese') || h.includes('month'));

  const startIndex = (idxDesc !== -1 || idxImporto !== -1) ? 1 : 0;
  if (idxData === -1) idxData = 0;
  if (idxDesc === -1) idxDesc = 1;
  if (idxImporto === -1) idxImporto = 2;
  if (idxCat === -1) idxCat = 3;

  const speseTrovate: Spesa[] = [];

  for (let i = startIndex; i < righe.length; i++) {
    const col = parseCampi(righe[i]);
    if (col.length < 2) continue;

    const dataRaw = col[idxData] || new Date().toISOString().split('T')[0];
    const descRaw = col[idxDesc] || 'Spesa importata';
    const importoStr = (col[idxImporto] || '0').replace('€', '').replace(/\s/g, '').replace(',', '.');
    const importoVal = Math.abs(parseFloat(importoStr));

    if (isNaN(importoVal) || importoVal <= 0) continue;

    const catRaw = col[idxCat] ? mappaCategoria(col[idxCat]) : mappaCategoria(descRaw);
    
    // Assegna il mese: o dalla colonna Mese specifica, oppure calcolato dalla Data!
    let meseAssegnato = col[idxMese]?.trim();
    if (!meseAssegnato) {
      meseAssegnato = ricavaMeseDaData(dataRaw, meseCorrente);
    }

    speseTrovate.push({
      id: Math.random().toString(36).substring(2, 9),
      data: dataRaw,
      descrizione: descRaw,
      importo: Number(importoVal.toFixed(2)),
      categoria: catRaw,
      meseId: meseAssegnato,
    });
  }

  return speseTrovate;
}
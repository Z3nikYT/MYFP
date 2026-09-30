import { CategoriaSpesa } from '../types';

export interface ParsedReceipt {
  descrizione: string;
  importo: number;
  categoria: CategoriaSpesa;
  isRicorrente: boolean;
}

// Database di parole chiave note
const REGOLE_SERVIZI: {
  pattern: RegExp;
  nome: string;
  categoria: CategoriaSpesa;
  ricorrente: boolean;
}[] = [
  // Dispositivi & Elettronica
  { pattern: /iphone/i, nome: 'iPhone', categoria: 'Shopping', ricorrente: false },
  { pattern: /macbook|mac/i, nome: 'Mac', categoria: 'Rate', ricorrente: true },
  { pattern: /ipad/i, nome: 'iPad', categoria: 'Shopping', ricorrente: false },
  { pattern: /airpods/i, nome: 'AirPods', categoria: 'Shopping', ricorrente: false },

  // Apple / Cloud
  { pattern: /icloud/i, nome: 'iCloud', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /apple(\.com|\s+distribution|\s+services)?/i, nome: 'Apple Services', categoria: 'Abbonamenti', ricorrente: true },
  
  // Streaming Video & Musica
  { pattern: /netflix/i, nome: 'Netflix', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /spotify/i, nome: 'Spotify', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /prime(\s+video)?|amazon\s+prime/i, nome: 'Amazon Prime', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /disney(\+|plus)?/i, nome: 'Disney+', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /dazn/i, nome: 'DAZN', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /youtube(\s+premium)?/i, nome: 'YouTube Premium', categoria: 'Abbonamenti', ricorrente: true },
  
  // Storage & Telefonia
  { pattern: /google\s+one/i, nome: 'Google One', categoria: 'Abbonamenti', ricorrente: true },
  { pattern: /iliad|vodafone|tim|windtre|fastweb/i, nome: 'Ricarica Telefono', categoria: 'Abbonamenti', ricorrente: true },

  // Rate & Finanziamenti
  { pattern: /rata(\s+mac|\s+apple|\s+iphone)?/i, nome: 'Rata Finanziamento', categoria: 'Rate', ricorrente: true },
  { pattern: /findomestic|compass|klarna|scalapay/i, nome: 'Rata BNPL', categoria: 'Rate', ricorrente: true },

  // Svago & Gaming
  { pattern: /brawl(\s+pass)?|supercell/i, nome: 'Brawl Pass', categoria: 'Svago', ricorrente: false },
  { pattern: /playstation|ps\s*plus|xbox|game\s*pass|steam/i, nome: 'Gaming / Store', categoria: 'Svago', ricorrente: true },

  // Cibo & Ristoranti
  { pattern: /glovo|deliveroo|just\s*eat|uber\s*eats|mcdonald/i, nome: 'Cibo Asporto', categoria: 'Cibo', ricorrente: false },
  
  // Shopping
  { pattern: /amazon|zalando|shein|zara/i, nome: 'Shopping Online', categoria: 'Shopping', ricorrente: false },
];

export function analizzaTestoRicevuta(testo: string): ParsedReceipt | null {
  if (!testo || testo.trim().length === 0) return null;

  // 1. Estrazione Importo: riconosce sia cifre intere (es. 500€, €500, 500 EUR) sia con decimali (es. 500,00€, 5.98)
  const regexPrezzo = /(?:€|EUR|\$)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:€|EUR|\$)?/i;
  
  // Cerca prima se c'è un numero con il simbolo di valuta accanto
  const matchConSimbolo = testo.match(/(?:€|EUR|\$)\s*([0-9]+(?:[.,][0-9]{1,2})?)|([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:€|EUR|\$)/i);
  
  let importo = 0;
  if (matchConSimbolo) {
    const rawVal = matchConSimbolo[1] || matchConSimbolo[2];
    importo = parseFloat(rawVal.replace(',', '.')) || 0;
  } else {
    // Altrimenti prende il primo numero valido trovato nel testo
    const matchGenerico = testo.match(regexPrezzo);
    if (matchGenerico && matchGenerico[1]) {
      importo = parseFloat(matchGenerico[1].replace(',', '.')) || 0;
    }
  }

  // 2. Riconoscimento del Servizio / Categoria
  let descrizione = '';
  let categoria: CategoriaSpesa = 'Altro';
  let isRicorrente = false;

  for (const regola of REGOLE_SERVIZI) {
    if (regola.pattern.test(testo)) {
      descrizione = regola.nome;
      categoria = regola.categoria;
      isRicorrente = regola.ricorrente;
      break;
    }
  }

  // Se non corrisponde a un servizio noto, estrae il testo rimuovendo la cifra e il simbolo €
  if (!descrizione) {
    const testoPulito = testo
      .replace(/(?:€|EUR|\$)/gi, '')
      .replace(/[0-9]+(?:[.,][0-9]{1,2})?/g, '')
      .trim();

    descrizione = testoPulito.length > 0 ? testoPulito : 'Nuova Spesa';
  }

  return {
    descrizione,
    importo: Number(importo.toFixed(2)),
    categoria,
    isRicorrente,
  };
}
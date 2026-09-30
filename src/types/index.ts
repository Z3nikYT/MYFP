export type CategoriaSpesa =
  | 'Affitto/Mutuo'
  | 'Bollette'
  | 'Spesa Alimentare'
  | 'Trasporti'
  | 'Salute'
  | 'Svago'
  | 'Ristoranti'
  | 'Shopping'
  | 'Abbonamenti'
  | 'Rate'
  | 'Altro';

export interface Spesa {
  id: string;
  data: string;
  meseId: string;
  categoria: CategoriaSpesa;
  descrizione: string;
  importo: number;
}

export interface EntrateMese {
  meseId: string;
  stipendio: number;
  paghetta: number;
  extra: number;
}

// Alias per evitare conflitti singolare/plurale
export type EntrataMese = EntrateMese;

export interface StatisticheMese {
  totaleEntrate: number;
  quota40: number;
  budget60: number;
  speseEffettive: number;
  rimanente60: number;
  fondoCumulato: number;
  stato: 'VERDE' | 'GIALLO' | 'ARANCIONE' | 'ROSSO';
}

export interface UserProfile {
  email: string;
  nome?: string;
  isLoggedIn: boolean;
  theme: 'dark' | 'light';
  valuta: string;
  percentualeRisparmio: number;
  autoEmailReport?: boolean;
  customEmailSubject?: string;
  customEmailBody?: string;
}
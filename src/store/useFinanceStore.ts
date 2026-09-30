import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spesa, EntrateMese, StatisticheMese, UserProfile } from '../types/index';

interface FinanceState {
  user: UserProfile;
  spese: Spesa[];
  entrate: Record<string, EntrateMese>;
  meseAttivo: string;

  loadData: () => Promise<void>;
  loginUser: (email: string, nome?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  
  addSpesa: (spesa: Omit<Spesa, 'id'>) => void;
  addSpeseMultiple: (spese: Spesa[]) => void;
  updateSpesa: (id: string, spesa: Partial<Spesa>) => void;
  deleteSpesa: (id: string) => void;
  
  setEntrateMese: (dati: EntrateMese) => void;
  creaNuovoMese: () => void;
  setMeseAttivo: (mese: string) => void;
  
  getStatisticheMese: (mese: string) => StatisticheMese;
}

const defaultUser: UserProfile = {
  email: '',
  isLoggedIn: false,
  theme: 'dark',
  valuta: '€',
  percentualeRisparmio: 40,
  autoEmailReport: false,
  customEmailSubject: '',
  customEmailBody: '',
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  user: defaultUser,
  spese: [],
  entrate: { 'Mese 1': { meseId: 'Mese 1', stipendio: 0, paghetta: 0, extra: 0 } },
  meseAttivo: 'Mese 1',

  loadData: async () => {
    try {
      const storedUser = await AsyncStorage.getItem('myfp_user');
      const storedSpese = await AsyncStorage.getItem('myfp_spese');
      const storedEntrate = await AsyncStorage.getItem('myfp_entrate');
      const storedMese = await AsyncStorage.getItem('myfp_meseAttivo');

      set({
        user: storedUser ? JSON.parse(storedUser) : defaultUser,
        spese: storedSpese ? JSON.parse(storedSpese) : [],
        entrate: storedEntrate ? JSON.parse(storedEntrate) : { 'Mese 1': { meseId: 'Mese 1', stipendio: 0, paghetta: 0, extra: 0 } },
        meseAttivo: storedMese || 'Mese 1',
      });
    } catch (e) {
      console.error('Errore loadData:', e);
    }
  },

  loginUser: async (email, nome) => {
    const userObj = { ...get().user, email, nome: nome || get().user.nome, isLoggedIn: true };
    await AsyncStorage.setItem('myfp_user', JSON.stringify(userObj));
    set({ user: userObj });
    await get().loadData();
  },

  logoutUser: async () => {
    await AsyncStorage.removeItem('myfp_user');
    await AsyncStorage.removeItem('myfp_spese');
    await AsyncStorage.removeItem('myfp_entrate');
    await AsyncStorage.removeItem('myfp_meseAttivo');
    set({
      user: defaultUser,
      spese: [],
      entrate: { 'Mese 1': { meseId: 'Mese 1', stipendio: 0, paghetta: 0, extra: 0 } },
      meseAttivo: 'Mese 1',
    });
  },

  updateUserProfile: (data) => {
    set((state) => {
      const updatedUser = { ...state.user, ...data };
      AsyncStorage.setItem('myfp_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  addSpesa: (spesa) => {
    set((state) => {
      const newSpese = [...state.spese, { ...spesa, id: Math.random().toString(36).substring(2, 9) }];
      AsyncStorage.setItem('myfp_spese', JSON.stringify(newSpese));
      return { spese: newSpese };
    });
  },

  addSpeseMultiple: (nuoveSpese: Spesa[]) => {
    set((state) => {
      const nuoveEntrate = { ...state.entrate };
      nuoveSpese.forEach((s) => {
        if (!nuoveEntrate[s.meseId]) {
          nuoveEntrate[s.meseId] = { meseId: s.meseId, stipendio: 0, paghetta: 0, extra: 0 };
        }
      });

      const speseAggiornate = [...state.spese, ...nuoveSpese];
      AsyncStorage.setItem('myfp_spese', JSON.stringify(speseAggiornate));
      AsyncStorage.setItem('myfp_entrate', JSON.stringify(nuoveEntrate));
      return { spese: speseAggiornate, entrate: nuoveEntrate };
    });
  },

  updateSpesa: (id, spesa) => {
    set((state) => {
      const newSpese = state.spese.map((s) => (s.id === id ? { ...s, ...spesa } : s));
      AsyncStorage.setItem('myfp_spese', JSON.stringify(newSpese));
      return { spese: newSpese };
    });
  },

  deleteSpesa: (id) => {
    set((state) => {
      const newSpese = state.spese.filter((s) => s.id !== id);
      AsyncStorage.setItem('myfp_spese', JSON.stringify(newSpese));
      return { spese: newSpese };
    });
  },

  setEntrateMese: (dati) => {
    set((state) => {
      const newEntrate = { ...state.entrate, [dati.meseId]: dati };
      AsyncStorage.setItem('myfp_entrate', JSON.stringify(newEntrate));
      return { entrate: newEntrate };
    });
  },

  creaNuovoMese: () => {
    set((state) => {
      const mesiList = Object.keys(state.entrate);
      const nextNum = mesiList.length + 1;
      const newMese = `Mese ${nextNum}`;
      const newEntrate = { ...state.entrate, [newMese]: { meseId: newMese, stipendio: 0, paghetta: 0, extra: 0 } };
      AsyncStorage.setItem('myfp_entrate', JSON.stringify(newEntrate));
      AsyncStorage.setItem('myfp_meseAttivo', newMese);
      return { entrate: newEntrate, meseAttivo: newMese };
    });
  },

  setMeseAttivo: (mese) => {
    AsyncStorage.setItem('myfp_meseAttivo', mese);
    set({ meseAttivo: mese });
  },

  getStatisticheMese: (mese) => {
    const state = get();
    const entrateCorrenti = state.entrate[mese] || { stipendio: 0, paghetta: 0, extra: 0, meseId: mese };
    const totaleEntrate = entrateCorrenti.stipendio + entrateCorrenti.paghetta + entrateCorrenti.extra;
    
    const pctRisparmio = state.user.percentualeRisparmio || 40;
    const quota40 = (totaleEntrate * pctRisparmio) / 100;
    const budget60 = totaleEntrate - quota40;
    
    const speseMese = state.spese.filter((s) => s.meseId === mese);
    const speseEffettive = speseMese.reduce((acc, curr) => acc + curr.importo, 0);
    const rimanente60 = budget60 - speseEffettive;

    let fondoCumulato = 0;
    Object.values(state.entrate).forEach((e) => {
      const totE = e.stipendio + e.paghetta + e.extra;
      fondoCumulato += (totE * pctRisparmio) / 100;
    });

    let stato: 'VERDE' | 'GIALLO' | 'ARANCIONE' | 'ROSSO' = 'VERDE';
    if (speseEffettive > budget60) stato = 'ROSSO';
    else if (rimanente60 <= budget60 * 0.1) stato = 'ARANCIONE';
    else if (rimanente60 <= budget60 * 0.3) stato = 'GIALLO';

    return {
      totaleEntrate,
      quota40,
      budget60,
      speseEffettive,
      rimanente60,
      fondoCumulato,
      stato,
    };
  },
}));
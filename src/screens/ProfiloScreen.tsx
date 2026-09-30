import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useFinanceStore } from '../store/useFinanceStore';
import { esportaSpeseCSV, generaReportPDF } from '../utils/exportService';

interface OpzioneRegola {
  label: string;
  risparmio: number;
  spese: number;
  desc: string;
}

const OPZIONI_REGOLA: OpzioneRegola[] = [
  { label: '60 / 40 (Consigliata)', risparmio: 40, spese: 60, desc: '60% uscite quotidiane, 40% fondo blindato' },
  { label: '50 / 50 (Bilanciata)', risparmio: 50, spese: 50, desc: 'Metà uscite e metà risparmio accumulato' },
  { label: '70 / 30 (Flessibile)', risparmio: 30, spese: 70, desc: '70% per rate e spese, 30% salvadanaio' },
  { label: '80 / 20 (Leggera)', risparmio: 20, spese: 80, desc: '80% spese correnti, 20% risparmio' },
];

export default function ProfiloScreen() {
  const {
    user,
    spese,
    entrate,
    meseAttivo,
    getStatisticheMese,
    logoutUser,
    setPercentualeRisparmio,
    setTheme,
    setValuta,
    clearUserData,
  } = useFinanceStore();

  const [modalRegola, setModalRegola] = useState(false);
  const [modalValuta, setModalValuta] = useState(false);
  const [modalEsporta, setModalEsporta] = useState(false);

  // Selezione del mese nel modal di esportazione ('ALL' oppure ID del mese)
  const [targetExport, setTargetExport] = useState<string>('ALL');

  const isDark = user.theme === 'dark';
  const pctRisparmio = user.percentualeRisparmio || 40;
  const pctSpese = 100 - pctRisparmio;
  const valuta = user.valuta || '€';
  const listaMesi = Object.keys(entrate);

  const palette = {
    bg: isDark ? '#0B0F19' : '#F8FAFC',
    card: isDark ? '#151D2F' : '#FFFFFF',
    textPrimary: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    primary: isDark ? '#38BDF8' : '#1B365D',
    danger: '#EF4444',
  };

  const mostraMsg = (titolo: string, msg: string) => {
    if (Platform.OS === 'web') alert(`${titolo}: ${msg}`);
    else Alert.alert(titolo, msg);
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      mostraMsg('Link inviato', `Abbiamo spedito il link per resettare la password a ${user.email}`);
    } catch (e: any) {
      mostraMsg('Errore', e.message);
    }
  };

  const handleClearData = () => {
    const esegui = () => {
      clearUserData();
      mostraMsg('Completato', 'Tutte le spese del tuo account sono state azzerate.');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler azzerare tutte le spese di questo account?')) esegui();
    } else {
      Alert.alert('Azzera Dati', 'Questa azione cancellerà tutte le spese registrate. Continuare?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Azzera', style: 'destructive', onPress: esegui },
      ]);
    }
  };

  // Esecuzione Esportazione CSV
  const eseguiExportCSV = () => {
    setModalEsporta(false);
    setTimeout(() => {
      const speseDaEsportare = targetExport === 'ALL' ? spese : spese.filter((s) => s.meseId === targetExport);
      const etichetta = targetExport === 'ALL' ? 'Tutti_i_Mesi' : targetExport;
      esportaSpeseCSV(speseDaEsportare, etichetta);
    }, 200);
  };

  // Esecuzione Esportazione PDF
  const eseguiExportPDF = () => {
    setModalEsporta(false);
    setTimeout(() => {
      if (targetExport === 'ALL') {
        // Calcolo totale cumulativo e medie
        let totEntrate = 0;
        let totRisparmio = 0;
        let totSpese = 0;
        let totMargine = 0;

        listaMesi.forEach((m) => {
          const st = getStatisticheMese(m);
          totEntrate += st.totaleEntrate;
          totRisparmio += st.quota40;
          totSpese += st.speseEffettive;
          totMargine += st.rimanente60;
        });

        const numMesi = listaMesi.length || 1;
        generaReportPDF(
          `Rapporto Globale & Media (${numMesi} Mesi)`,
          {
            entrate: totEntrate,
            risparmio: totRisparmio,
            spese: totSpese,
            margine: totMargine,
            isMedia: true,
          },
          spese,
          valuta
        );
      } else {
        const stats = getStatisticheMese(targetExport);
        const speseDelMese = spese.filter((s) => s.meseId === targetExport);
        generaReportPDF(
          `Rendiconto di ${targetExport}`,
          {
            entrate: stats.totaleEntrate,
            risparmio: stats.quota40,
            spese: stats.speseEffettive,
            margine: stats.rimanente60,
            isMedia: false,
          },
          speseDelMese,
          valuta
        );
      }
    }, 200);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logoutUser();
    } catch (e: any) {
      mostraMsg('Errore', e.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Scheda Utente Connesso */}
      <View style={[styles.userCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
          <Ionicons name="person" size={24} color={palette.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.userName, { color: palette.textPrimary }]}>{user.nome || 'Utente'}</Text>
          <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Dati Protetti & Sincronizzati</Text>
          </View>
        </View>
      </View>

      {/* SEZIONE 1: FINANZE & REGOLE */}
      <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>MODELLO FINANZIARIO</Text>
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <TouchableOpacity style={styles.rowItem} onPress={() => setModalRegola(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="pie-chart-outline" size={18} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Ripartizione Regola</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>{pctSpese}% Spese / {pctRisparmio}% Risparmio</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <TouchableOpacity style={styles.rowItem} onPress={() => setModalValuta(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="cash-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Valuta</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Simbolo: {valuta}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* SEZIONE 2: ASPETTO */}
      <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>ASPETTO</Text>
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#334155' : '#FEF3C7' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#F8FAFC' : '#D97706'} />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Tema Scuro</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>{isDark ? 'Attivo' : 'Disattivato'}</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
            trackColor={{ false: '#CBD5E1', true: palette.primary }}
          />
        </View>
      </View>

      {/* SEZIONE 3: GESTIONE DATI ED ESPORTAZIONE */}
      <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>GESTIONE DATI & ESPORTAZIONE</Text>
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        
        {/* TASTO MENU SCELTA CSV O PDF */}
        <TouchableOpacity style={styles.rowItem} onPress={() => setModalEsporta(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="share-outline" size={18} color="#16A34A" />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Esporta Dati & Report</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Scegli il mese o tutti e il formato (CSV/PDF)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Modifica Password */}
        <TouchableOpacity style={styles.rowItem} onPress={handleResetPassword}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="key-outline" size={18} color="#475569" />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Modifica Password</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Invia link via email</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Svuota Spese */}
        <TouchableOpacity style={styles.rowItem} onPress={handleClearData}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-bin-outline" size={18} color="#DC2626" />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: palette.danger }]}>Azzera Archivio Spese</Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Elimina tutti i movimenti</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: palette.card }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color={palette.danger} style={{ marginRight: 8 }} />
        <Text style={[styles.logoutText, { color: palette.danger }]}>Esci dall'Account</Text>
      </TouchableOpacity>

      <Text style={[styles.footerText, { color: palette.textSecondary }]}>MYFP • Versione 1.3.0</Text>

      {/* MODAL MENU SCELTA MESE & FORMATO */}
      <Modal visible={modalEsporta} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setModalEsporta(false)}>
          <View style={[styles.modalBox, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Esporta Dati</Text>

            {/* SELEZIONE RANGE / MESE */}
            <Text style={[styles.exportSubHeading, { color: palette.textSecondary }]}>1. COSA VUOI ESPORTARE?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.targetScroll}>
              <TouchableOpacity
                style={[
                  styles.targetPill,
                  { backgroundColor: targetExport === 'ALL' ? palette.primary : isDark ? '#1E293B' : '#E2E8F0' },
                ]}
                onPress={() => setTargetExport('ALL')}
              >
                <Text style={[styles.targetPillText, { color: targetExport === 'ALL' ? '#FFF' : palette.textPrimary }]}>
                  Tutti i Mesi (Globale)
                </Text>
              </TouchableOpacity>
              {listaMesi.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.targetPill,
                    { backgroundColor: targetExport === m ? palette.primary : isDark ? '#1E293B' : '#E2E8F0' },
                  ]}
                  onPress={() => setTargetExport(m)}
                >
                  <Text style={[styles.targetPillText, { color: targetExport === m ? '#FFF' : palette.textPrimary }]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.exportSubHeading, { color: palette.textSecondary, marginTop: 14 }]}>
              2. SELEZIONA FORMATO
            </Text>

            {/* Opzione 1: CSV / Excel */}
            <TouchableOpacity style={styles.modalOption} onPress={eseguiExportCSV}>
              <View style={[styles.iconBox, { backgroundColor: '#DCFCE7', marginRight: 12 }]}>
                <Ionicons name="grid-outline" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: palette.textPrimary }]}>Foglio Excel (.CSV)</Text>
                <Text style={[styles.modalOptionSub, { color: palette.textSecondary }]}>
                  {targetExport === 'ALL' ? 'Tutte le spese registrate di tutti i mesi' : `Tutte le spese relative a ${targetExport}`}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={palette.textSecondary} />
            </TouchableOpacity>

            {/* Opzione 2: Documento PDF */}
            <TouchableOpacity style={styles.modalOption} onPress={eseguiExportPDF}>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2', marginRight: 12 }]}>
                <Ionicons name="document-text-outline" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: palette.textPrimary }]}>Report Documento (.PDF)</Text>
                <Text style={[styles.modalOptionSub, { color: palette.textSecondary }]}>
                  {targetExport === 'ALL' ? 'Riepilogo totale e medie di tutti i mesi' : `Rendiconto pulito di ${targetExport}`}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL REGOLA */}
      <Modal visible={modalRegola} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setModalRegola(false)}>
          <View style={[styles.modalBox, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Seleziona Formula</Text>
            {OPZIONI_REGOLA.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.modalOption, pctRisparmio === item.risparmio && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => {
                  setPercentualeRisparmio(item.risparmio);
                  setModalRegola(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: palette.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.modalOptionSub, { color: palette.textSecondary }]}>{item.desc}</Text>
                </View>
                {pctRisparmio === item.risparmio && (
                  <Ionicons name="checkmark-circle" size={20} color={palette.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL VALUTA */}
      <Modal visible={modalValuta} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setModalValuta(false)}>
          <View style={[styles.modalBox, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Scegli Valuta</Text>
            {[
              { sign: '€', label: 'Euro (€)' },
              { sign: '$', label: 'Dollaro ($)' },
              { sign: '£', label: 'Sterlina (£)' },
            ].map((v) => (
              <TouchableOpacity
                key={v.sign}
                style={[styles.modalOption, valuta === v.sign && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => {
                  setValuta(v.sign as any);
                  setModalValuta(false);
                }}
              >
                <Text style={[styles.modalOptionTitle, { color: palette.textPrimary }]}>{v.label}</Text>
                {valuta === v.sign && <Ionicons name="checkmark-circle" size={20} color={palette.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  badgeText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, marginBottom: 18, overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 4, marginBottom: 20 },
  logoutText: { fontSize: 14, fontWeight: '600' },
  footerText: { textAlign: 'center', fontSize: 11, marginBottom: 35 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 20, elevation: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  exportSubHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  targetScroll: { maxHeight: 38, marginBottom: 4 },
  targetPill: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 16, marginRight: 8 },
  targetPillText: { fontSize: 12, fontWeight: '600' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 8 },
  modalOptionTitle: { fontSize: 14, fontWeight: '600' },
  modalOptionSub: { fontSize: 12, marginTop: 2 },
});
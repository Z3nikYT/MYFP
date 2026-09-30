import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

import { useFinanceStore } from './src/store/useFinanceStore';
import { CategoriaSpesa } from './src/types';
import { analizzaTestoRicevuta } from './src/utils/receiptParser';
import { scansionaFotoRicevuta } from './src/utils/ocrService';
import { selezionaFileCSV, analizzaContenutoCSV } from './src/utils/csvImporter';
import TabellaScreen from './src/screens/TabellaScreen';
import GraficiScreen from './src/screens/GraficiScreen';
import ProfiloScreen from './src/screens/ProfiloScreen';
import AuthScreen from './src/screens/AuthScreen';

function DashboardView() {
  const {
    user,
    meseAttivo,
    setMeseAttivo,
    entrate,
    setEntrateMese,
    creaNuovoMese,
    getStatisticheMese,
    addSpesa,
    loadData,
  } = useFinanceStore();

  const scrollViewRef = useRef<ScrollView>(null);

  const [modalSpesaVisible, setModalSpesaVisible] = useState(false);
  const [modalEntrateVisible, setModalEntrateVisible] = useState(false);
  const [modalSmartVisible, setModalSmartVisible] = useState(false);

  const [desc, setDesc] = useState('');
  const [importo, setImporto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaSpesa>('Svago');

  const [testoIncollato, setTestoIncollato] = useState('');
  const [applicaATuttiMesi, setApplicaATuttiMesi] = useState(false);
  const [loadingOCR, setLoadingOCR] = useState(false);

  const [stipendioInput, setStipendioInput] = useState('');
  const [paghettaInput, setPaghettaInput] = useState('');
  const [extraInput, setExtraInput] = useState('');

  const [prezzoSimulato, setPrezzoSimulato] = useState('');
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  useEffect(() => {
    loadData();

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardSpace(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardSpace(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isDark = user?.theme === 'dark';
  const valuta = user?.valuta || '€';
  const pctRisparmio = user?.percentualeRisparmio || 40;
  const pctSpese = 100 - pctRisparmio;
  const nomeUtente = user?.nome ? `${user.nome} ` : '';

  const themeColors = {
    bg: isDark ? '#0B0F19' : '#F8FAFC',
    card: isDark ? '#151D2F' : '#FFFFFF',
    textPrimary: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    primary: isDark ? '#38BDF8' : '#1B365D',
    pillBg: isDark ? '#1E293B' : '#E9ECEF',
    pillText: isDark ? '#CBD5E1' : '#495057',
    inputBg: isDark ? '#0B0F19' : '#F8FAFC',
  };

  const stats = getStatisticheMese(meseAttivo);
  const entrateCorrenti = entrate[meseAttivo] || { stipendio: 0, paghetta: 0, extra: 0, meseId: meseAttivo };
  const listaMesi = Object.keys(entrate);

  const getColoreSemaforo = () => {
    switch (stats.stato) {
      case 'VERDE': return '#10B981';
      case 'GIALLO': return '#F59E0B';
      case 'ARANCIONE': return '#F97316';
      case 'ROSSO': return '#EF4444';
    }
  };

  const processaRicevuta = () => {
    const res = analizzaTestoRicevuta(testoIncollato);
    if (!res || res.importo <= 0) {
      const msg = 'Non siamo riusciti a trovare un importo valido. Inseriscilo manualmente o controlla il testo.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Attenzione', msg);
      return;
    }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDesc(res.descrizione);
    setImporto(res.importo.toFixed(2));
    setCategoria(res.categoria);
    setApplicaATuttiMesi(res.isRicorrente);
    setModalSmartVisible(false);
    setModalSpesaVisible(true);
    setTestoIncollato('');
  };

  const gestisciCaricamentoFoto = async () => {
    try {
      setLoadingOCR(true);
      const datiEstratti = await scansionaFotoRicevuta();
      if (!datiEstratti || datiEstratti.importo <= 0) {
        const msg = 'Non siamo riusciti a leggere un importo nitido dallo screenshot. Prova a ritagliare meglio la cifra o inseriscila a mano.';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Attenzione', msg);
        return;
      }

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDesc(datiEstratti.descrizione);
      setImporto(datiEstratti.importo.toFixed(2));
      setCategoria(datiEstratti.categoria);
      setApplicaATuttiMesi(datiEstratti.isRicorrente);
      setModalSmartVisible(false);
      setModalSpesaVisible(true);
    } catch (err: any) {
      Alert.alert('Errore Lettura Immagine', err.message || 'Errore durante la scansione');
    } finally {
      setLoadingOCR(false);
    }
  };

  const salvaSpesaSmartOClassica = () => {
    const num = parseFloat(importo.replace(',', '.'));
    if (!desc || isNaN(num) || num <= 0) {
      Alert.alert('Errore', 'Inserisci una descrizione e un importo valido');
      return;
    }

    const importoPulito = Number(num.toFixed(2));
    const dataOggi = new Date().toISOString().split('T')[0];

    if (applicaATuttiMesi) {
      listaMesi.forEach((m) => {
        addSpesa({
          data: dataOggi,
          meseId: m,
          categoria,
          descrizione: desc,
          importo: importoPulito,
        });
      });
      const conferma = `Spesa registrata come ricorrente in tutti i ${listaMesi.length} mesi!`;
      if (Platform.OS === 'web') alert(conferma);
      else Alert.alert('Operazione completata', conferma);
    } else {
      addSpesa({
        data: dataOggi,
        meseId: meseAttivo,
        categoria,
        descrizione: desc,
        importo: importoPulito,
      });
    }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDesc('');
    setImporto('');
    setApplicaATuttiMesi(false);
    setModalSpesaVisible(false);
  };

  const apriModaleEntrate = () => {
    setStipendioInput(entrateCorrenti.stipendio ? entrateCorrenti.stipendio.toString() : '');
    setPaghettaInput(entrateCorrenti.paghetta ? entrateCorrenti.paghetta.toString() : '');
    setExtraInput(entrateCorrenti.extra ? entrateCorrenti.extra.toString() : '');
    setModalEntrateVisible(true);
  };

  const salvaEntrate = () => {
    const s = parseFloat(stipendioInput.replace(',', '.')) || 0;
    const p = parseFloat(paghettaInput.replace(',', '.')) || 0;
    const e = parseFloat(extraInput.replace(',', '.')) || 0;

    setEntrateMese({
      meseId: meseAttivo,
      stipendio: s,
      paghetta: p,
      extra: e,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalEntrateVisible(false);
  };

  const valSimulato = parseFloat(prezzoSimulato.replace(',', '.')) || 0;
  const margineDopoAcquisto = stats.rimanente60 - valSimulato;

  return (
    <ScrollView
      ref={scrollViewRef}
      automaticallyAdjustKeyboardInsets={true}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: keyboardSpace > 0 ? keyboardSpace + 80 : 60 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.responsiveContainer}>
        <View style={styles.welcomeBox}>
          <Text style={[styles.welcomeSub, { color: themeColors.textSecondary }]}>Panoramica Finanziaria</Text>
          <Text style={[styles.welcomeTitle, { color: themeColors.textPrimary }]}>
            Bentornato {nomeUtente}👋
          </Text>
        </View>

        <View style={styles.monthHeader}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            {listaMesi.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.pill,
                  { backgroundColor: themeColors.pillBg },
                  meseAttivo === m && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setMeseAttivo(m);
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: themeColors.pillText },
                    meseAttivo === m && styles.pillTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addMeseBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
              onPress={creaNuovoMese}
            >
              <Ionicons name="add" size={18} color={themeColors.primary} />
              <Text style={[styles.addMeseText, { color: themeColors.primary }]}>Mese</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* CARD ENTRATE */}
        <View style={[styles.incomeCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.incomeSub, { color: themeColors.textSecondary }]}>Entrate Totali {meseAttivo}</Text>
              <Text style={[styles.incomeAmount, { color: themeColors.textPrimary }]}>
                {valuta} {stats.totaleEntrate.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editIncomeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={apriModaleEntrate}
            >
              <Ionicons name="pencil" size={14} color={themeColors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.editIncomeText, { color: themeColors.primary }]}>Modifica</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.incomeDetailText, { color: themeColors.textSecondary }]}>
            {[
              entrateCorrenti.stipendio > 0 ? `Principale: ${valuta} ${entrateCorrenti.stipendio}` : null,
              entrateCorrenti.paghetta > 0 ? `Secondaria: ${valuta} ${entrateCorrenti.paghetta}` : null,
              entrateCorrenti.extra > 0 ? `Extra: ${valuta} ${entrateCorrenti.extra}` : null,
            ].filter(Boolean).join(' • ') || 'Nessuna voce inserita'}
          </Text>
        </View>

        {/* FONDO RISPARMIO BLINDATO */}
        <View style={[styles.savingCard, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="lock-closed" size={18} color={isDark ? '#6EE7B7' : '#065F46'} style={{ marginRight: 6 }} />
            <Text style={[styles.savingTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              Fondo Risparmio Blindato ({pctRisparmio}%)
            </Text>
          </View>
          <Text style={[styles.savingAmount, { color: isDark ? '#ECFDF5' : '#064E3B' }]}>
            {valuta} {stats.fondoCumulato.toFixed(2)}
          </Text>
          <Text style={[styles.savingSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
            + {valuta} {stats.quota40.toFixed(2)} accantonati in {meseAttivo}
          </Text>
        </View>

        {/* BUDGET SPENDIBILE */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
              borderLeftColor: getColoreSemaforo(),
              borderLeftWidth: 6,
            },
          ]}
        >
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>
            Budget Spendibile Rimanente ({pctSpese}%)
          </Text>
          <Text style={[styles.bigAmount, { color: getColoreSemaforo() }]}>
            {valuta} {stats.rimanente60.toFixed(2)}
          </Text>
          <Text style={[styles.subText, { color: themeColors.textSecondary }]}>
            Uscite effettuate: {valuta} {stats.speseEffettive.toFixed(2)} su un tetto di {valuta} {stats.budget60.toFixed(2)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getColoreSemaforo() + '20' }]}>
            <Text style={[styles.statusText, { color: getColoreSemaforo() }]}>
              {stats.stato === 'VERDE' && '🟢 Margine ampio disponibile'}
              {stats.stato === 'GIALLO' && '🟡 Attenzione alle prossime uscite'}
              {stats.stato === 'ARANCIONE' && '🟠 Limite quasi raggiunto'}
              {stats.stato === 'ROSSO' && `🔴 Tetto del ${pctSpese}% superato!`}
            </Text>
          </View>
        </View>

        {/* SIMULATORE */}
        <View style={[styles.simulatoreCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.simTitle, { color: themeColors.textPrimary }]}>Simulatore Acquisto</Text>
          <TextInput
            style={[styles.simInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
            placeholder={`Importo oggetto (${valuta})`}
            placeholderTextColor={themeColors.textSecondary}
            keyboardType="numeric"
            value={prezzoSimulato}
            onChangeText={setPrezzoSimulato}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 250);
            }}
          />
          {valSimulato > 0 && (
            <Text style={[styles.simResult, { color: margineDopoAcquisto >= 50 ? '#10B981' : '#EF4444' }]}>
              {margineDopoAcquisto >= 50
                ? `✅ Confermabile: ti resteranno ${valuta} ${margineDopoAcquisto.toFixed(2)}`
                : margineDopoAcquisto >= 0
                ? `⚠️ Al limite: ti rimarrebbero solo ${valuta} ${margineDopoAcquisto.toFixed(2)}`
                : `❌ Stop: saresti sotto budget di ${valuta} ${Math.abs(margineDopoAcquisto).toFixed(2)}`}
            </Text>
          )}
        </View>

        {keyboardSpace === 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                setDesc('');
                setImporto('');
                setApplicaATuttiMesi(false);
                setModalSpesaVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnActionText}>Nuova Spesa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnActionSmart, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF', borderColor: isDark ? '#334155' : '#C7D2FE' }]}
              onPress={() => setModalSmartVisible(true)}
            >
              <Ionicons name="sparkles" size={17} color="#4F46E5" style={{ marginRight: 6 }} />
              <Text style={styles.btnActionSmartText}>Importa Ricevuta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* MODAL SCANNER */}
      <Modal visible={modalSmartVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="sparkles" size={20} color="#4F46E5" style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTitle, { color: themeColors.textPrimary, marginBottom: 0 }]}>
                    Scanner Ricevuta / Mail
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalSmartVisible(false)}>
                  <Ionicons name="close" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.btnActionSmart, { marginBottom: 12, backgroundColor: isDark ? '#1E293B' : '#EEF2FF', borderColor: '#4F46E5', paddingVertical: 12 }]} 
                onPress={gestisciCaricamentoFoto}
                disabled={loadingOCR}
              >
                {loadingOCR ? (
                  <ActivityIndicator color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={18} color="#4F46E5" style={{ marginRight: 6 }} />
                    <Text style={styles.btnActionSmartText}>Carica Screenshot dalla Galleria</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: themeColors.border }} />
                <Text style={{ marginHorizontal: 8, fontSize: 10, color: themeColors.textSecondary, fontWeight: 'bold' }}>OPPURE INCOLLA IL TESTO</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: themeColors.border }} />
              </View>

              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border },
                ]}
                placeholder="Esempio: Spesa supermercato 45.20€..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={3}
                value={testoIncollato}
                onChangeText={setTestoIncollato}
              />

              <TouchableOpacity style={styles.btnEseguiParser} onPress={processaRicevuta}>
                <Ionicons name="flash" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnEseguiParserText}>Estrai da Testo Incollato</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL NUOVA SPESA */}
      <Modal visible={modalSpesaVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                {desc ? `Conferma Spesa: ${desc}` : `Nuova Spesa per ${meseAttivo}`}
              </Text>

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>DESCRIZIONE:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="es. Bolletta, Cena, Benzina"
                placeholderTextColor={themeColors.textSecondary}
                value={desc}
                onChangeText={setDesc}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>IMPORTO ({valuta}):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="0.00"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric"
                value={importo}
                onChangeText={setImporto}
              />

              <TouchableOpacity
                style={[
                  styles.recurringCheck,
                  { borderColor: applicaATuttiMesi ? themeColors.primary : themeColors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setApplicaATuttiMesi(!applicaATuttiMesi);
                }}
              >
                <Ionicons
                  name={applicaATuttiMesi ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={applicaATuttiMesi ? themeColors.primary : themeColors.textSecondary}
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.recurringCheckTitle, { color: themeColors.textPrimary }]}>
                    Spesa Ricorrente (Tutti i Mesi)
                  </Text>
                  <Text style={[styles.recurringCheckSub, { color: themeColors.textSecondary }]}>
                    Applica automaticamente ad ogni mese
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalSpesaVisible(false)}>
                  <Text style={{ color: themeColors.textSecondary }}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: themeColors.primary }]} onPress={salvaSpesaSmartOClassica}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salva Spesa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ENTRATE TOTALI */}
      <Modal visible={modalEntrateVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Entrate {meseAttivo}</Text>
                <TouchableOpacity onPress={() => setModalEntrateVisible(false)}>
                  <Ionicons name="close" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>ENTRATA PRINCIPALE ({valuta}):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="es. Stipendio, Fatturato, Borsa studio"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric"
                value={stipendioInput}
                onChangeText={setStipendioInput}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>ENTRATA SECONDARIA ({valuta}):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="es. Rendite, Lavoretti, Rimborsi"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric"
                value={paghettaInput}
                onChangeText={setPaghettaInput}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>EXTRA / BONUS ({valuta}):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="0"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric"
                value={extraInput}
                onChangeText={setExtraInput}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalEntrateVisible(false)}>
                  <Text style={{ color: themeColors.textSecondary }}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: themeColors.primary }]} onPress={salvaEntrate}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Aggiorna</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

export default function App() {
  const { user, addSpesa, meseAttivo } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'home' | 'spese' | 'grafici' | 'profilo'>('home');
  const [menuDrawerVisible, setMenuDrawerVisible] = useState(false);

  useEffect(() => {
    if (user?.isLoggedIn) {
      setActiveTab('home');
    }
  }, [user?.isLoggedIn]);

  useEffect(() => {
    const gestisciFileInIngresso = async (url: string | null) => {
      if (!url) return;
      try {
        if (url.endsWith('.csv') || url.includes('content://') || url.includes('file://')) {
          const content = await FileSystem.readAsStringAsync(url, { encoding: FileSystem.EncodingType.UTF8 });
          const speseTrovate = analizzaContenutoCSV(content, meseAttivo);
          if (speseTrovate.length > 0) {
            speseTrovate.forEach((s) => addSpesa(s));
            const msg = `Ricevute e importate con successo ${speseTrovate.length} spese in ${meseAttivo}!`;
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('File Condiviso Ricevuto', msg);
          }
        }
      } catch (err) {
        console.log('Errore apertura da intent esterno', err);
      }
    };

    Linking.getInitialURL().then(gestisciFileInIngresso);
    const sub = Linking.addEventListener('url', (e) => gestisciFileInIngresso(e.url));
    return () => sub.remove();
  }, [meseAttivo]);

  const gestisciImportaCSVManuale = async () => {
    setMenuDrawerVisible(false);
    const contenuto = await selezionaFileCSV();
    if (!contenuto) return;

    const speseTrovate = analizzaContenutoCSV(contenuto, meseAttivo);
    if (speseTrovate.length === 0) {
      const msg = 'Nessuna spesa valida trovata nel file selezionato.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Attenzione', msg);
      return;
    }

    // Aggiunge tutte le spese e genera automaticamente i mesi corrispondenti se mancanti
    const { addSpeseMultiple } = useFinanceStore.getState();
    addSpeseMultiple(speseTrovate);

    const mesiCoinvolti = Array.from(new Set(speseTrovate.map((s) => s.meseId)));
    const okMsg = `Importate correttamente ${speseTrovate.length} spese distribuite su ${mesiCoinvolti.length} mesi!`;
    if (Platform.OS === 'web') alert(okMsg);
    else Alert.alert('Importazione Completata', okMsg);
    setActiveTab('spese');
  };

  if (!user.isLoggedIn) {
    return <AuthScreen />;
  }

  const isDark = user?.theme === 'dark';

  const themeColors = {
    bg: isDark ? '#0B0F19' : '#F8FAFC',
    card: isDark ? '#151D2F' : '#FFFFFF',
    textPrimary: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    primary: isDark ? '#38BDF8' : '#1B365D',
  };

  const getTitoloSchermata = () => {
    switch (activeTab) {
      case 'home':
        return 'Dashboard';
      case 'spese':
        return 'Movimenti & Spese';
      case 'grafici':
        return 'Report & Grafici';
      case 'profilo':
        return 'Impostazioni';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.card}
        translucent={false}
      />
      <View style={[styles.topBarContainer, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => setMenuDrawerVisible(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="menu" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: themeColors.textPrimary }]}>
          {getTitoloSchermata()}
        </Text>

        <View style={styles.topBarRightSpacer} />
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <DashboardView />}
        {activeTab === 'spese' && <TabellaScreen />}
        {activeTab === 'grafici' && <GraficiScreen />}
        {activeTab === 'profilo' && <ProfiloScreen />}
      </View>

      {/* MENU DRAWER */}
      <Modal visible={menuDrawerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setMenuDrawerVisible(false)}
        >
          <View style={[styles.drawerContent, { backgroundColor: themeColors.card, borderRightColor: themeColors.border }]}>
            <View style={styles.drawerHeader}>
              <Image
                source={require('./assets/icon.png')}
                style={styles.drawerLogoImage}
                resizeMode="contain"
              />
              <Text style={[styles.drawerBrand, { color: themeColors.textPrimary }]}>MYFP</Text>
              <Text style={[styles.drawerSub, { color: themeColors.textSecondary }]}>Menu Principale</Text>
            </View>

            <View style={[styles.drawerDivider, { backgroundColor: themeColors.border }]} />

            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeTab === 'home' && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setActiveTab('home');
                setMenuDrawerVisible(false);
              }}
            >
              <Ionicons
                name="home-outline"
                size={20}
                color={activeTab === 'home' ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  { color: activeTab === 'home' ? themeColors.primary : themeColors.textPrimary },
                ]}
              >
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeTab === 'spese' && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setActiveTab('spese');
                setMenuDrawerVisible(false);
              }}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={activeTab === 'spese' ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  { color: activeTab === 'spese' ? themeColors.primary : themeColors.textPrimary },
                ]}
              >
                Movimenti & Spese
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeTab === 'grafici' && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setActiveTab('grafici');
                setMenuDrawerVisible(false);
              }}
            >
              <Ionicons
                name="bar-chart-outline"
                size={20}
                color={activeTab === 'grafici' ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  { color: activeTab === 'grafici' ? themeColors.primary : themeColors.textPrimary },
                ]}
              >
                Report & Grafici
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF', marginTop: 8 }]}
              onPress={gestisciImportaCSVManuale}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#4F46E5" />
              <Text style={[styles.drawerItemText, { color: '#4F46E5', fontWeight: '700' }]}>
                Importa File CSV
              </Text>
            </TouchableOpacity>

            <View style={[styles.drawerDivider, { backgroundColor: themeColors.border, marginVertical: 14 }]} />

            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeTab === 'profilo' && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setActiveTab('profilo');
                setMenuDrawerVisible(false);
              }}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={activeTab === 'profilo' ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  { color: activeTab === 'profilo' ? themeColors.primary : themeColors.textPrimary },
                ]}
              >
                Profilo & Impostazioni
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    alignItems: 'center',
    flexGrow: 1,
  },
  responsiveContainer: { width: '100%', maxWidth: 680 },
  welcomeBox: { marginBottom: 14 },
  welcomeSub: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  topBarContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  topBarRightSpacer: { width: 40, height: 40 },
  monthHeader: { marginBottom: 14 },
  selectorScroll: { flexDirection: 'row' },
  pill: { paddingVertical: 7, paddingHorizontal: 15, borderRadius: 20, marginRight: 8 },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#FFF' },
  addMeseBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  addMeseText: { fontWeight: '700', fontSize: 12, marginLeft: 2 },
  incomeCard: { padding: 16, borderRadius: 18, marginBottom: 14, borderWidth: 1 },
  incomeSub: { fontSize: 12, fontWeight: '600' },
  incomeAmount: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  incomeDetailText: { fontSize: 12, marginTop: 8 },
  editIncomeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  editIncomeText: { fontSize: 12, fontWeight: '700' },
  savingCard: { padding: 16, borderRadius: 18, marginBottom: 14 },
  savingTitle: { fontWeight: '600', fontSize: 13 },
  savingAmount: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  savingSub: { fontSize: 12, marginTop: 4 },
  card: { padding: 16, borderRadius: 18, marginBottom: 14, borderWidth: 1 },
  label: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6 },
  bigAmount: { fontSize: 30, fontWeight: '800', marginVertical: 4 },
  subText: { fontSize: 12 },
  statusBadge: { padding: 10, borderRadius: 10, marginTop: 10 },
  statusText: { fontWeight: '700', fontSize: 12 },
  simulatoreCard: { padding: 16, borderRadius: 18, marginBottom: 16, borderWidth: 1 },
  simTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  simInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  simResult: { marginTop: 10, fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 16 },
  btnAction: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14 },
  btnActionText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnActionSmart: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  btnActionSmartText: { color: '#4F46E5', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalContent: { padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 14, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top', height: 80, marginBottom: 14 },
  btnEseguiParser: { backgroundColor: '#4F46E5', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10 },
  btnEseguiParserText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  recurringCheck: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  recurringCheckTitle: { fontSize: 13, fontWeight: '700' },
  recurringCheckSub: { fontSize: 11, marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  btnSave: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', flexDirection: 'row' },
  drawerContent: { width: '75%', maxWidth: 300, height: '100%', padding: 20, paddingTop: 45, borderRightWidth: 1 },
  drawerHeader: { marginBottom: 15 },
  drawerLogoImage: { width: 48, height: 48, borderRadius: 12, marginBottom: 8 },
  drawerBrand: { fontSize: 18, fontWeight: '800' },
  drawerSub: { fontSize: 12, marginTop: 2 },
  drawerDivider: { height: 1, marginVertical: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  drawerItemText: { fontSize: 15, fontWeight: '600', marginLeft: 12 },
});
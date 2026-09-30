import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '../store/useFinanceStore';
import { Spesa, CategoriaSpesa } from '../types/index';

export default function TabellaScreen() {
  const { user, spese, meseAttivo, setMeseAttivo, entrate, deleteSpesa, updateSpesa } = useFinanceStore();

  const [filtroCategoria, setFiltroCategoria] = useState<string>('Tutte');
  const [ricerca, setRicerca] = useState('');
  const [spesaInModifica, setSpesaInModifica] = useState<Spesa | null>(null);

  const [editDesc, setEditDesc] = useState('');
  const [editImporto, setEditImporto] = useState('');
  const [editCategoria, setEditCategoria] = useState<CategoriaSpesa>('Svago');

  const [keyboardSpace, setKeyboardSpace] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardSpace(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardSpace(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isDark = user?.theme === 'dark';
  const valuta = user?.valuta || '€';

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

  const listaMesi = Object.keys(entrate);

  const speseMese = spese.filter((s) => s.meseId === meseAttivo);
  const speseFiltrate = speseMese.filter((s) => {
    const matchCat = filtroCategoria === 'Tutte' || s.categoria === filtroCategoria;
    const matchSearch = s.descrizione.toLowerCase().includes(ricerca.toLowerCase());
    return matchCat && matchSearch;
  });

  const totaleUscite = speseMese.reduce((acc, s) => acc + s.importo, 0);
  const categoriePresenti = Array.from(new Set(speseMese.map((s) => s.categoria)));

  const apriModaleModifica = (spesa: Spesa) => {
    setSpesaInModifica(spesa);
    setEditDesc(spesa.descrizione);
    setEditImporto(spesa.importo.toString());
    setEditCategoria(spesa.categoria);
  };

  const salvaModifica = () => {
    if (!spesaInModifica) return;
    const num = parseFloat(editImporto.replace(',', '.'));
    if (!editDesc.trim() || isNaN(num) || num <= 0) {
      Alert.alert('Errore', 'Inserisci una descrizione valida e un importo maggiore di zero.');
      return;
    }

    const payloadAggiornato: Spesa = {
      ...spesaInModifica,
      descrizione: editDesc.trim(),
      importo: Number(num.toFixed(2)),
      categoria: editCategoria,
    };

    try {
      (updateSpesa as any)(payloadAggiornato);
    } catch {
      (updateSpesa as any)(spesaInModifica.id, {
        descrizione: editDesc.trim(),
        importo: Number(num.toFixed(2)),
        categoria: editCategoria,
      });
    }

    setSpesaInModifica(null);
  };

  const confermaEliminazione = (id: string, descrizione: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Vuoi davvero eliminare "${descrizione}"?`)) {
        deleteSpesa(id);
      }
    } else {
      Alert.alert('Elimina Spesa', `Vuoi davvero eliminare "${descrizione}"?`, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => deleteSpesa(id) },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.topInfoRow}>
          <View>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>Movimenti</Text>
            <Text style={[styles.subTitle, { color: themeColors.textSecondary }]}>
              Gestione spese di {meseAttivo}
            </Text>
          </View>
          <View style={[styles.badgeTotale, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Text style={[styles.badgeLabel, { color: themeColors.textSecondary }]}>USCITE</Text>
            <Text style={[styles.badgeAmount, { color: '#EF4444' }]}>
              {valuta} {totaleUscite.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Mesi - contenitore senza altezze forzate */}
        <View style={styles.scrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {listaMesi.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.pill,
                  { backgroundColor: themeColors.pillBg },
                  meseAttivo === m && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => setMeseAttivo(m)}
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
          </ScrollView>
        </View>

        {/* Ricerca */}
        <View style={[styles.searchBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Ionicons name="search" size={18} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Cerca spesa per nome..."
            placeholderTextColor={themeColors.textSecondary}
            value={ricerca}
            onChangeText={setRicerca}
          />
          {ricerca.length > 0 && (
            <TouchableOpacity onPress={() => setRicerca('')}>
              <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorie filtri - contenitore senza altezze forzate */}
        <View style={styles.scrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            <TouchableOpacity
              style={[
                styles.catChip,
                { backgroundColor: themeColors.pillBg },
                filtroCategoria === 'Tutte' && { backgroundColor: themeColors.primary },
              ]}
              onPress={() => setFiltroCategoria('Tutte')}
            >
              <Text style={[styles.catChipText, { color: themeColors.pillText }, filtroCategoria === 'Tutte' && styles.pillTextActive]}>
                Tutte ({speseMese.length})
              </Text>
            </TouchableOpacity>
            {categoriePresenti.map((c) => {
              const count = speseMese.filter((s) => s.categoria === c).length;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.catChip,
                    { backgroundColor: themeColors.pillBg },
                    filtroCategoria === c && { backgroundColor: themeColors.primary },
                  ]}
                  onPress={() => setFiltroCategoria(c)}
                >
                  <Text style={[styles.catChipText, { color: themeColors.pillText }, filtroCategoria === c && styles.pillTextActive]}>
                    {c} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista movimenti */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: keyboardSpace > 0 ? keyboardSpace + 40 : 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {speseFiltrate.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={44} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                Nessuna spesa registrata per questi criteri.
              </Text>
            </View>
          ) : (
            speseFiltrate.map((item) => (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="card-outline" size={20} color={themeColors.primary} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.itemDesc, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {item.descrizione}
                    </Text>
                    <Text style={[styles.itemMeta, { color: themeColors.textSecondary }]}>
                      {item.categoria} • {item.data}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>
                    - {valuta} {item.importo.toFixed(2)}
                  </Text>
                  <View style={styles.actionBtns}>
                    <TouchableOpacity onPress={() => apriModaleModifica(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil-outline" size={17} color={themeColors.textSecondary} style={{ marginRight: 12 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confermaEliminazione(item.id, item.descrizione)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* MODALE MODIFICA SPESA */}
      <Modal visible={!!spesaInModifica} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Modifica Voce</Text>
                <TouchableOpacity onPress={() => setSpesaInModifica(null)}>
                  <Ionicons name="close" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>DESCRIZIONE</Text>
              <TextInput
                style={[
                  styles.inputField,
                  { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border },
                ]}
                value={editDesc}
                onChangeText={setEditDesc}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>IMPORTO ({valuta})</Text>
              <TextInput
                style={[
                  styles.inputField,
                  { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border },
                ]}
                value={editImporto}
                onChangeText={setEditImporto}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnAnnulla} onPress={() => setSpesaInModifica(null)}>
                  <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSalva, { backgroundColor: themeColors.primary }]} onPress={salvaModifica}>
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Salva Modifiche</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  topInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subTitle: { fontSize: 12, marginTop: 2 },
  badgeTotale: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'flex-end' },
  badgeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  badgeAmount: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  scrollWrapper: { marginBottom: 12 },
  chipsContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#FFF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, justifyContent: 'center' },
  catChipText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 14 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemDesc: { fontSize: 15, fontWeight: '700' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end', marginLeft: 8 },
  itemAmount: { fontSize: 15, fontWeight: '800', color: '#EF4444' },
  actionBtns: { flexDirection: 'row', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 15, marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 4 },
  btnAnnulla: { paddingVertical: 10, paddingHorizontal: 14 },
  btnSalva: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
});
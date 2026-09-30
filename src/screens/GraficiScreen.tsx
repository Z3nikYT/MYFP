import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useFinanceStore } from '../store/useFinanceStore';
import { generaReportPDF } from '../utils/pdfReportService';

const screenWidth = Dimensions.get('window').width;

export default function GraficiScreen() {
  const { user, spese, meseAttivo, setMeseAttivo, entrate, getStatisticheMese } = useFinanceStore();

  const isDark = user?.theme === 'dark';
  const valuta = user?.valuta || '€';
  const pctRisparmio = user?.percentualeRisparmio || 40;
  const pctSpese = 100 - pctRisparmio;

  const themeColors = {
    bg: isDark ? '#0B0F19' : '#F8FAFC',
    card: isDark ? '#151D2F' : '#FFFFFF',
    textPrimary: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    primary: isDark ? '#38BDF8' : '#1B365D',
    pillBg: isDark ? '#1E293B' : '#E9ECEF',
    pillText: isDark ? '#CBD5E1' : '#495057',
  };

  const listaMesi = Object.keys(entrate);
  const stats = getStatisticheMese(meseAttivo);
  const speseMese = spese.filter((s) => s.meseId === meseAttivo);
  const totaleUscite = speseMese.reduce((acc, s) => acc + s.importo, 0);

  // Calcolo dati per categorie
  const spesePerCategoria: { [key: string]: number } = {};
  speseMese.forEach((s) => {
    spesePerCategoria[s.categoria] = (spesePerCategoria[s.categoria] || 0) + s.importo;
  });

  const palette = [
    '#38BDF8', '#818CF8', '#34D399', '#FBBF24',
    '#F87171', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'
  ];

  const pieData = Object.keys(spesePerCategoria).map((cat, idx) => ({
    name: cat,
    population: Number(spesePerCategoria[cat].toFixed(2)),
    color: palette[idx % palette.length],
    legendFontColor: isDark ? '#CBD5E1' : '#334155',
    legendFontSize: 12,
  })).sort((a, b) => b.population - a.population);

  // Dati per il grafico a barre comparative
  const barChartData = {
    labels: ['Entrate', 'Risparmio', 'Spese'],
    datasets: [
      {
        data: [
          Math.max(0, Number(stats.totaleEntrate.toFixed(0))),
          Math.max(0, Number(stats.quota40.toFixed(0))),
          Math.max(0, Number(stats.speseEffettive.toFixed(0))),
        ],
      },
    ],
  };

  const chartConfig = {
    backgroundColor: themeColors.card,
    backgroundGradientFrom: themeColors.card,
    backgroundGradientTo: themeColors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
    fillShadowGradientFrom: '#38BDF8',
    fillShadowGradientTo: '#818CF8',
    fillShadowGradientOpacity: 0.9,
    barPercentage: 0.7,
  };

  const avviaEsportazione = async (inviaMail: boolean) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await generaReportPDF({
      user,
      mese: meseAttivo,
      stats,
      spese,
      inviaEmailSubito: inviaMail,
    });
  };

  const chartWidth = Math.min(screenWidth - 64, 580);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.responsiveContainer}>
        {/* Intestazione */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Report & Statistiche</Text>
          <Text style={[styles.subTitle, { color: themeColors.textSecondary }]}>
            Analisi grafica andamento di {meseAttivo}
          </Text>
        </View>

        {/* Selettore Mese */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
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
        </ScrollView>

        {/* Card Azioni Estratto Conto */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardLabel, { color: themeColors.textSecondary, marginBottom: 2 }]}>
            ESTRATTO CONTO UFFICIALE
          </Text>
          <Text style={[styles.actionCardSub, { color: themeColors.textPrimary, marginBottom: 14 }]}>
            Documento Contabile Mensile
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btnExport, { backgroundColor: themeColors.primary }]}
              onPress={() => avviaEsportazione(false)}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnExportText}>Scarica PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnExportMail, { borderColor: themeColors.primary }]}
              onPress={() => avviaEsportazione(true)}
            >
              <Ionicons name="mail-outline" size={18} color={themeColors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.btnExportMailText, { color: themeColors.primary }]}>Invia ad Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* GRAFICO 1: GRAFICO A BARRE COMPARATIVO REALE */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardLabel, { color: themeColors.textSecondary, marginBottom: 8 }]}>
            CONFRONTO VOLUMI ({valuta})
          </Text>
          <BarChart
            data={barChartData}
            width={chartWidth}
            height={200}
            yAxisLabel={`${valuta} `}
            yAxisSuffix=""
            chartConfig={chartConfig}
            showValuesOnTopOfBars
            fromZero
            style={styles.chartStyle}
          />
        </View>

        {/* GRAFICO 2: TORTA / PIE CHART A SETTORI */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardLabel, { color: themeColors.textSecondary, marginBottom: 8 }]}>
            RIPARTIZIONE CATEGORIE
          </Text>

          {pieData.length === 0 ? (
            <View style={styles.emptyCat}>
              <Ionicons name="pie-chart-outline" size={44} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                Nessuna voce di spesa registrata per {meseAttivo}.
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <PieChart
                data={pieData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="12"
                absolute={false}
              />

              <View style={styles.totalBadge}>
                <Text style={[styles.totalBadgeLabel, { color: themeColors.textSecondary }]}>TOTALE USCITE</Text>
                <Text style={[styles.totalBadgeValue, { color: '#EF4444' }]}>
                  {valuta} {totaleUscite.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 50, alignItems: 'center' },
  responsiveContainer: { width: '100%', maxWidth: 680 },
  header: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subTitle: { fontSize: 12, marginTop: 2 },
  monthScroll: { flexDirection: 'row', marginBottom: 14 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 36 },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#FFF' },
  card: { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  actionCardSub: { fontSize: 15, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnExport: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  btnExportText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  btnExportMail: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  btnExportMailText: { fontSize: 13, fontWeight: '700' },
  chartStyle: { marginVertical: 8, borderRadius: 12, alignSelf: 'center' },
  totalBadge: { marginTop: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 12 },
  totalBadgeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  totalBadgeValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  emptyCat: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, marginTop: 8 },
});
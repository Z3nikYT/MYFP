import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js';
import { analizzaTestoRicevuta, ParsedReceipt } from './receiptParser';

/**
 * Apre la galleria, fa scegliere una foto/screenshot ed estrae i dati della spesa
 */
export async function scansionaFotoRicevuta(): Promise<ParsedReceipt | null> {
  // 1. Chiede il permesso e apre la galleria
  const risultato = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (risultato.canceled || !risultato.assets || risultato.assets.length === 0) {
    return null;
  }

  const uriImmagine = risultato.assets[0].uri;

  // 2. OCR: Legge il testo dall'immagine in italiano
  const worker = await createWorker('ita');
  const ret = await worker.recognize(uriImmagine);
  await worker.terminate();

  const testoRiconosciuto = ret.data.text;

  // 3. Passa il testo estratto al parser intelligente
  return analizzaTestoRicevuta(testoRiconosciuto);
}
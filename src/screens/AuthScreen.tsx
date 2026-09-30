import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth, googleProvider } from '../../firebaseConfig';
import { useFinanceStore } from '../store/useFinanceStore';

const GOOGLE_WEB_CLIENT_ID = '537623015737-kfti8jf6pb2oeing80o19n8dcj2ph7g3.apps.googleusercontent.com';

export default function AuthScreen() {
  const { loginUser } = useFinanceStore();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistrazione, setIsRegistrazione] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostraPassword, setMostraPassword] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    }
  }, []);

  const mostraMessaggio = (titolo: string, msg: string) => {
    if (Platform.OS === 'web') alert(`${titolo}: ${msg}`);
    else Alert.alert(titolo, msg);
  };

  const handleAuth = async () => {
    if (isRegistrazione && !nome.trim()) {
      mostraMessaggio('Nome Richiesto', 'Inserisci il tuo nome per personalizzare la tua dashboard.');
      return;
    }
    if (!email.trim()) {
      mostraMessaggio('Attenzione', 'Inserisci il tuo indirizzo email.');
      return;
    }
    if (!password) {
      mostraMessaggio('Attenzione', 'Inserisci la password.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistrazione) {
        if (password.length < 6) {
          mostraMessaggio('Password Debole', 'La password deve avere almeno 6 caratteri.');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user) {
          await updateProfile(cred.user, { displayName: nome.trim() });
        }
        await loginUser(cred.user.email || email.trim(), nome.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const displayName = cred.user.displayName || undefined;
        await loginUser(cred.user.email || email.trim(), displayName);
      }
    } catch (err: any) {
      let msg = 'Errore durante l’accesso';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Email o password errati. Riprova.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Questa email è già registrata. Effettua il login!';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Formato email non valido.';
      } else {
        msg = err.message;
      }
      mostraMessaggio('Avviso', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      mostraMessaggio('Email Richiesta', 'Inserisci la tua email prima di richiedere il link di ripristino.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      mostraMessaggio('Email Spedita', `Abbiamo inviato le istruzioni di recupero a ${email.trim()}.`);
    } catch (err: any) {
      mostraMessaggio('Errore', err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user && res.user.email) {
          const nomeDaGoogle = res.user.displayName?.split(' ')[0] || undefined;
          await loginUser(res.user.email, nomeDaGoogle);
        }
      } else {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        
        const idToken = signInResult.data?.idToken || (signInResult as any).idToken;
        if (!idToken) {
          throw new Error('Impossibile ottenere il token Google.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const res = await signInWithCredential(auth, credential);
        if (res.user && res.user.email) {
          const nomeDaGoogle = res.user.displayName?.split(' ')[0] || undefined;
          await loginUser(res.user.email, nomeDaGoogle);
        }
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Utente ha semplicemente chiuso il popup
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Operazione già in corso
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        mostraMessaggio('Errore', 'Google Play Services non disponibili o non aggiornati.');
      } else {
        mostraMessaggio('Errore Accesso Google', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authWrapper}>
            <View style={styles.header}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>MYFP</Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>FINANCIAL INTELLIGENCE</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[styles.tabBtn, !isRegistrazione && styles.tabBtnActive]}
                  onPress={() => setIsRegistrazione(false)}
                >
                  <Text style={[styles.tabBtnText, !isRegistrazione && styles.tabBtnTextActive]}>
                    Accedi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, isRegistrazione && styles.tabBtnActive]}
                  onPress={() => setIsRegistrazione(true)}
                >
                  <Text style={[styles.tabBtnText, isRegistrazione && styles.tabBtnTextActive]}>
                    Registrati
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>
                {isRegistrazione ? 'Crea il tuo profilo' : 'Bentornato'}
              </Text>
              <Text style={styles.cardSub}>
                {isRegistrazione
                  ? 'Inserisci i tuoi dati per iniziare a gestire le tue finanze.'
                  : 'Inserisci le tue credenziali per sbloccare la dashboard.'}
              </Text>

              {isRegistrazione && (
                <>
                  <Text style={styles.inputLabel}>IL TUO NOME</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="es. Giovanni"
                      placeholderTextColor="#64748B"
                      value={nome}
                      onChangeText={setNome}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="nome@dominio.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                {!isRegistrazione && (
                  <TouchableOpacity onPress={handleResetPassword}>
                    <Text style={styles.forgotLink}>Password dimenticata?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Almeno 6 caratteri"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!mostraPassword}
                />
                <TouchableOpacity onPress={() => setMostraPassword(!mostraPassword)}>
                  <Ionicons
                    name={mostraPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0B0F19" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isRegistrazione ? 'Crea Account' : 'Accedi'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OPPURE CONTINUA CON</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Google Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.footerNote}>Crittografia Cloud Firebase & Protezione Dati</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0F19' },
  keyboardContainer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  authWrapper: { width: '100%', maxWidth: 420, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 72, height: 72, borderRadius: 18, marginBottom: 10 },
  appName: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', letterSpacing: 1.5 },
  tagBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  tagBadgeText: { fontSize: 10, fontWeight: '700', color: '#38BDF8', letterSpacing: 0.8 },
  formCard: {
    width: '100%',
    backgroundColor: '#151D2F',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#1E293B' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabBtnTextActive: { color: '#F8FAFC' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 20, lineHeight: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.6, marginBottom: 6 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 12, color: '#38BDF8', fontWeight: '600' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  textInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  primaryBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#0B0F19', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E293B' },
  dividerText: { marginHorizontal: 10, fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  googleBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  footerNote: { fontSize: 11, color: '#64748B', fontWeight: '500' },
});
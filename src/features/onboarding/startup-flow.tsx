import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSetting, SETTING_KEYS, setSetting } from '@/src/db/queries/settings';
import { needsOwnerName, normalizeOwnerName } from './owner-name';

const OwnerNameContext = createContext('Teman');

export function useOwnerName() {
  return useContext(OwnerNameContext);
}

export function StartupFlow({ children }: { children: ReactNode }) {
  const [ownerName, setOwnerName] = useState<string | null | undefined>(undefined);
  const [introFinished, setIntroFinished] = useState(false);
  const [startupError, setStartupError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSetting(SETTING_KEYS.ownerName)
      .then((storedName) => {
        if (cancelled) return;
        setOwnerName(normalizeOwnerName(storedName ?? ''));
      })
      .catch((error: Error) => !cancelled && setStartupError(error))
      .finally(() => {
        if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (startupError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color="#b95d4c" />
        <Text style={styles.errorTitle}>Gagal menyiapkan aplikasi</Text>
        <Text style={styles.errorCopy}>{startupError.message}</Text>
      </SafeAreaView>
    );
  }

  if (ownerName === undefined) return null;
  if (!introFinished) return <AnimatedLaunchScreen onFinished={() => setIntroFinished(true)} />;

  if (needsOwnerName(ownerName)) {
    return (
      <NameOnboarding
        onSave={(name) => setSetting(SETTING_KEYS.ownerName, name)}
        onFinished={setOwnerName}
      />
    );
  }

  return (
    <OwnerNameContext.Provider value={ownerName!}>
      <AppReveal>{children}</AppReveal>
    </OwnerNameContext.Provider>
  );
}

function AnimatedLaunchScreen({ onFinished }: { onFinished: () => void }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoOffset = useRef(new Animated.Value(12)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        logoScale.setValue(1);
        logoOpacity.setValue(1);
        logoOffset.setValue(0);
        copyOpacity.setValue(1);
        copyOffset.setValue(0);
        finishTimer = setTimeout(onFinished, 350);
        return;
      }

      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(logoOffset, { toValue: 0, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(copyOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(copyOffset, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.delay(520),
        Animated.timing(screenOpacity, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]);
      animation.start(({ finished }) => finished && onFinished());
    });

    return () => {
      cancelled = true;
      animation?.stop();
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [copyOffset, copyOpacity, glowOpacity, glowScale, logoOffset, logoOpacity, logoScale, onFinished, screenOpacity]);

  return (
    <Animated.View style={[splashStyles.page, { opacity: screenOpacity }]}>
      <Animated.View style={[splashStyles.glowGroup, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}>
        <View style={splashStyles.glowLarge} />
        <View style={splashStyles.glowSmall} />
      </Animated.View>
      <Animated.View style={[splashStyles.logo, { opacity: logoOpacity, transform: [{ translateY: logoOffset }, { scale: logoScale }] }]}>
        <Ionicons name="wallet-outline" size={44} color="#31584c" />
        <View style={splashStyles.leaf}><Ionicons name="leaf" size={13} color="#31584c" /></View>
      </Animated.View>
      <Animated.View style={{ opacity: copyOpacity, transform: [{ translateY: copyOffset }], alignItems: 'center' }}>
        <Text style={splashStyles.brand}>Keuanganku</Text>
        <Text style={splashStyles.tagline}>Lebih tenang mengatur hari esok</Text>
      </Animated.View>
    </Animated.View>
  );
}

function NameOnboarding({ onSave, onFinished }: { onSave: (name: string) => Promise<void>; onFinished: (name: string) => void }) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introOffset = useRef(new Animated.Value(14)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerOffset = useRef(new Animated.Value(10)).current;
  const orbsScale = useRef(new Animated.Value(0.92)).current;
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const normalizedName = normalizeOwnerName(input);

  function revealNameInput() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  }

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        introOpacity.setValue(1);
        introOffset.setValue(0);
        footerOpacity.setValue(1);
        footerOffset.setValue(0);
        orbsScale.setValue(1);
        inputRef.current?.focus();
        return;
      }

      animation = Animated.parallel([
        Animated.timing(orbsScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(90),
          Animated.parallel([
            Animated.timing(introOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(introOffset, { toValue: 0, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(280),
          Animated.parallel([
            Animated.timing(footerOpacity, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(footerOffset, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
      ]);
      animation.start();
      focusTimer = setTimeout(() => inputRef.current?.focus(), 650);
    });

    return () => {
      cancelled = true;
      animation?.stop();
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [footerOffset, footerOpacity, introOffset, introOpacity, orbsScale]);

  async function submit() {
    if (!normalizedName || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(normalizedName);
      Animated.timing(screenOpacity, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        .start(({ finished }) => finished && onFinished(normalizedName));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nama belum dapat disimpan.');
      setSubmitting(false);
    }
  }

  return (
    <Animated.View style={[onboardingStyles.safe, { opacity: screenOpacity }]}>
      <SafeAreaView style={onboardingStyles.safe}>
      <KeyboardAvoidingView
        style={onboardingStyles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={onboardingStyles.page}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View pointerEvents="none" style={[onboardingStyles.orbs, { transform: [{ scale: orbsScale }] }]}>
            <View style={onboardingStyles.orbTop} />
            <View style={onboardingStyles.orbBottom} />
          </Animated.View>

          <Animated.View style={{ opacity: introOpacity, transform: [{ translateY: introOffset }] }}>
            <View style={onboardingStyles.progressTrack}><View style={onboardingStyles.progressFill} /></View>
            <Text style={onboardingStyles.step}>LANGKAH 1 DARI 1</Text>
          </Animated.View>

          <Animated.View style={[onboardingStyles.content, { opacity: introOpacity, transform: [{ translateY: introOffset }] }]}>
            <View style={onboardingStyles.iconWrap}><Ionicons name="person-outline" size={32} color="#31584c" /></View>
            <Text style={onboardingStyles.title}>Boleh kenalan dulu?</Text>
            <Text style={onboardingStyles.copy}>Nama ini akan dipakai untuk menyapamu dan membuat Keuanganku terasa lebih personal.</Text>

            <Text style={onboardingStyles.label}>NAMA PANGGILAN</Text>
            <TextInput
              ref={inputRef}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={48}
              onChangeText={setInput}
              onFocus={revealNameInput}
              onSubmitEditing={submit}
              placeholder="Contoh: Takumi"
              placeholderTextColor="#a4aaa5"
              returnKeyType="done"
              style={onboardingStyles.input}
              value={input}
            />
            {error ? <Text style={onboardingStyles.error}>{error}</Text> : null}
          </Animated.View>

          <Animated.View style={{ opacity: footerOpacity, transform: [{ translateY: footerOffset }] }}>
            <View style={onboardingStyles.privacy}>
              <Ionicons name="shield-checkmark-outline" size={17} color="#6a7a72" />
              <Text style={onboardingStyles.privacyText}>Namamu hanya disimpan di perangkat ini.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!normalizedName || submitting}
              onPress={submit}
              style={({ pressed }) => [onboardingStyles.button, (!normalizedName || submitting) && onboardingStyles.buttonDisabled, pressed && normalizedName && onboardingStyles.buttonPressed]}>
              <Text style={onboardingStyles.buttonText}>{submitting ? 'Menyimpan…' : 'Mulai mengatur keuangan'}</Text>
              {!submitting ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

function AppReveal({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        opacity.setValue(1);
        offset.setValue(0);
        return;
      }
      animation = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);
      animation.start();
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [offset, opacity]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ translateY: offset }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: '#f7f7f1' },
  errorTitle: { color: '#2c332f', fontSize: 17, fontWeight: '700' },
  errorCopy: { color: '#7d857f', fontSize: 11, textAlign: 'center' },
});

const splashStyles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#31584c', overflow: 'hidden' },
  glowGroup: { position: 'absolute', width: 330, height: 330, alignItems: 'center', justifyContent: 'center' },
  glowLarge: { position: 'absolute', width: 330, height: 330, borderRadius: 180, backgroundColor: '#41695c', opacity: 0.55 },
  glowSmall: { width: 220, height: 220, borderRadius: 120, borderWidth: 1, borderColor: '#739488', opacity: 0.45 },
  logo: { width: 94, height: 94, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf2e8', marginBottom: 23 },
  leaf: { position: 'absolute', right: 15, top: 14, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#cfe2b8' },
  brand: { color: '#fffdf7', fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  tagline: { color: '#b9cdc5', fontSize: 11, marginTop: 8, letterSpacing: 0.2 },
});

const onboardingStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' },
  page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20, justifyContent: 'space-between', overflow: 'hidden' },
  orbs: { ...StyleSheet.absoluteFillObject },
  orbTop: { position: 'absolute', width: 230, height: 230, borderRadius: 120, right: -115, top: -75, backgroundColor: '#e4ebe0' },
  orbBottom: { position: 'absolute', width: 180, height: 180, borderRadius: 95, left: -110, bottom: 100, backgroundColor: '#eef0e4' },
  progressTrack: { width: 76, height: 4, borderRadius: 3, backgroundColor: '#dfe4dc' },
  progressFill: { width: '100%', height: 4, borderRadius: 3, backgroundColor: '#31584c' },
  step: { color: '#859087', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginTop: 9 },
  content: { marginTop: 24 },
  iconWrap: { width: 65, height: 65, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2eade' },
  title: { color: '#213129', fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 24 },
  copy: { color: '#747e77', fontSize: 12, lineHeight: 19, marginTop: 10, maxWidth: 330 },
  label: { color: '#667169', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 35, marginBottom: 9 },
  input: { height: 58, borderRadius: 18, borderWidth: 1.5, borderColor: '#cad5ca', backgroundColor: '#fff', color: '#243029', fontSize: 17, fontWeight: '600', paddingHorizontal: 17 },
  error: { color: '#ad5444', fontSize: 10, marginTop: 8 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 15 },
  privacyText: { color: '#738078', fontSize: 10 },
  button: { height: 58, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#31584c' },
  buttonDisabled: { backgroundColor: '#aeb9b3' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

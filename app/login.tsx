/**
 * Login screen — phone number OTP authentication.
 *
 * Flow:
 *   Step 1: user enters phone number (+971…)
 *   Step 2: user enters 6-digit OTP received via SMS
 *   On success: store auth token + navigate to home
 *
 * The screen is shown only when the user explicitly taps "تسجيل الدخول"
 * in settings. The app works fully without login (anonymous mode).
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../constants/colors';
import { sendOtp, verifyOtp, getMe } from '../services/api';
import { useWaffirStore } from '../store/useStore';
import { syncAlerts } from '../services/api';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const { setAuth, priceAlerts } = useWaffirStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+971');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start resend countdown ────────────────────────────────────────────────
  function startCountdown(seconds = 60) {
    setResendCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown((n) => {
        if (n <= 1) { clearInterval(timerRef.current!); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp() {
    const cleaned = phone.trim();
    if (!/^\+\d{7,15}$/.test(cleaned)) {
      setError('أدخل رقم هاتف صحيح بصيغة دولية (مثال: +971501234567)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOtp(cleaned);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('otp');
      startCountdown(60);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ — حاول مجدداً');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (otp.length !== 6) { setError('أدخل الرمز المكوّن من 6 أرقام'); return; }
    setError('');
    setLoading(true);
    try {
      const { access_token } = await verifyOtp(phone.trim(), otp.trim());
      const user = await getMe(access_token);
      setAuth(user, access_token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Silently sync local alerts to server
      if (priceAlerts.length) {
        syncAlerts(access_token, priceAlerts.map((a) => ({
          product_name_ar: a.productNameAr,
          target_price: a.targetPrice,
          currency: a.currency,
        }))).catch(() => {/* non-fatal */});
      }

      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'رمز غير صحيح — حاول مجدداً');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Resend ────────────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCountdown > 0) return;
    setOtp('');
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      startCountdown(60);
    } catch (e: any) {
      setError(e.message ?? 'فشل إعادة الإرسال');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.navyDark} style={StyleSheet.absoluteFill} />

      {/* Ambient glow */}
      <View style={styles.glowCircle} pointerEvents="none" />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (step === 'otp') { setStep('phone'); setOtp(''); setError(''); }
            else router.back();
          }}>
            <Text style={styles.backText}>→</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(60)} style={styles.content}>
            {/* Logo / brand */}
            <Animated.View entering={FadeInUp.delay(100)} style={styles.brand}>
              <Text style={styles.brandName}>وفّر</Text>
              <Text style={styles.brandSub}>مرحباً بك</Text>
            </Animated.View>

            {step === 'phone' ? (
              /* ── Phone step ───────────────────────────────────────────── */
              <Animated.View entering={FadeInDown.delay(160)} style={styles.card}>
                <Text style={styles.cardTitle}>رقم الهاتف</Text>
                <Text style={styles.cardDesc}>
                  نرسل لك رمزاً للتحقق — لا كلمة سر، لا تعقيد
                </Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(t) => { setPhone(t); setError(''); }}
                    keyboardType="phone-pad"
                    placeholder="+971501234567"
                    placeholderTextColor={Colors.text.muted}
                    selectionColor={Colors.accent.cyan}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color="#0f0d13" />
                    : <Text style={styles.btnText}>إرسال الرمز</Text>}
                </TouchableOpacity>

                <Text style={styles.hint}>
                  تسجيل الدخول اختياري — التطبيق يعمل بدونه ✓
                </Text>
              </Animated.View>
            ) : (
              /* ── OTP step ─────────────────────────────────────────────── */
              <Animated.View entering={FadeInDown.delay(160)} style={styles.card}>
                <Text style={styles.cardTitle}>رمز التحقق</Text>
                <Text style={styles.cardDesc}>
                  أُرسل إلى {phone}
                </Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    ref={otpRef}
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={(t) => {
                      setOtp(t.replace(/\D/g, '').slice(0, 6));
                      setError('');
                      if (t.length === 6) handleVerifyOtp();
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="——————"
                    placeholderTextColor={Colors.text.muted}
                    selectionColor={Colors.accent.cyan}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                  />
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.btn, (loading || otp.length < 6) && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color="#0f0d13" />
                    : <Text style={styles.btnText}>تأكيد</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0}>
                  <Text style={[styles.resend, resendCountdown > 0 && styles.resendDisabled]}>
                    {resendCountdown > 0
                      ? `إعادة الإرسال بعد ${resendCountdown}ث`
                      : 'لم يصلك الرمز؟ أعد الإرسال'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  kav:  { flex: 1, justifyContent: 'center' },
  glowCircle: {
    position: 'absolute',
    width: 400, height: 400,
    borderRadius: 200,
    top: -80, alignSelf: 'center',
    backgroundColor: 'rgba(108,63,255,0.12)',
  },
  backBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border.glass,
  },
  backText: { color: Colors.text.secondary, fontSize: 18 },
  content: { paddingHorizontal: 24, alignItems: 'center' },
  brand: { alignItems: 'center', marginBottom: 36 },
  brandName: {
    color: Colors.text.primary,
    fontSize: 48,
    fontFamily: 'Almarai_800ExtraBold',
  },
  brandSub: {
    color: Colors.text.muted,
    fontSize: 16,
    fontFamily: 'Almarai_400Regular',
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    padding: 24,
    gap: 16,
    alignItems: 'stretch',
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: 20,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
  cardDesc: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 22,
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    overflow: 'hidden',
  },
  input: {
    color: Colors.text.primary,
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'left',
  },
  otpInput: {
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    color: Colors.accent.cyan,
  },
  btn: {
    backgroundColor: Colors.accent.cyan,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#0f0d13',
    fontSize: 16,
    fontFamily: 'Almarai_700Bold',
  },
  errorText: {
    color: Colors.accent.red ?? '#FF6B6B',
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
  },
  hint: {
    color: Colors.text.muted,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'center',
  },
  resend: {
    color: Colors.accent.cyan,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'center',
    paddingVertical: 4,
  },
  resendDisabled: { color: Colors.text.muted },
});

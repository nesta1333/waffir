import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useWaffirStore } from '../../store/useStore';
import GlassCard from '../../components/ui/GlassCard';
import {
  requestNotificationPermission,
} from '../../services/notifications';
import {
  registerBackgroundPriceCheck,
  unregisterBackgroundPriceCheck,
} from '../../services/backgroundCheck';

export default function SettingsScreen() {
  const { language, setLanguage, currency, setCurrency, user, clearAuth } = useWaffirStore();
  const [notifs, setNotifs] = React.useState(true);
  const [priceDropOnly, setPriceDropOnly] = React.useState(false);

  const toggle = (fn: () => void) => {
    Haptics.selectionAsync();
    fn();
  };

  const handleNotifToggle = async () => {
    const next = !notifs;
    setNotifs(next);
    Haptics.selectionAsync();
    if (next) {
      const granted = await requestNotificationPermission();
      if (granted) await registerBackgroundPriceCheck();
    } else {
      await unregisterBackgroundPriceCheck();
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.navyDark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
          <Text style={styles.title}>الإعدادات</Text>
        </Animated.View>

        <View style={styles.content}>
          {/* Language */}
          <Animated.View entering={FadeInDown.delay(120)}>
            <Text style={styles.groupLabel}>اللغة</Text>
            <GlassCard noPad>
              <View style={styles.segmentRow}>
                <SegmentBtn
                  label="العربية"
                  isActive={language === 'ar'}
                  onPress={() => toggle(() => setLanguage('ar'))}
                />
                <SegmentBtn
                  label="English"
                  isActive={language === 'en'}
                  onPress={() => toggle(() => setLanguage('en'))}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Currency */}
          <Animated.View entering={FadeInDown.delay(180)}>
            <Text style={styles.groupLabel}>العملة</Text>
            <GlassCard noPad>
              <View style={styles.segmentRow}>
                <SegmentBtn
                  label="درهم إماراتي (AED)"
                  isActive={currency === 'AED'}
                  onPress={() => toggle(() => setCurrency('AED'))}
                />
                <SegmentBtn
                  label="ريال سعودي (SAR)"
                  isActive={currency === 'SAR'}
                  onPress={() => toggle(() => setCurrency('SAR'))}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Notifications */}
          <Animated.View entering={FadeInDown.delay(240)}>
            <Text style={styles.groupLabel}>الإشعارات</Text>
            <GlassCard noPad>
              <ToggleRow
                label="تفعيل الإشعارات"
                value={notifs}
                onToggle={handleNotifToggle}
              />
              <View style={styles.rowDivider} />
              <ToggleRow
                label="انخفاض السعر فقط"
                value={priceDropOnly}
                onToggle={() => { setPriceDropOnly(!priceDropOnly); Haptics.selectionAsync(); }}
              />
            </GlassCard>
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.delay(280)}>
            <Text style={styles.groupLabel}>الحساب</Text>
            <GlassCard noPad>
              {user ? (
                <>
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'خروج', style: 'destructive', onPress: () => { clearAuth(); Haptics.selectionAsync(); } },
                      ]);
                    }}>
                      <Text style={[styles.rowLabel, { color: '#FF6B6B' }]}>تسجيل الخروج</Text>
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.rowValue}>{user.phone}</Text>
                      {user.name ? <Text style={[styles.rowValue, { fontSize: 11 }]}>{user.name}</Text> : null}
                    </View>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.row} onPress={() => { Haptics.selectionAsync(); router.push('/login'); }}>
                  <Text style={[styles.rowArrow, { color: Colors.accent.cyan }]}>←</Text>
                  <Text style={[styles.rowLabel, { color: Colors.accent.cyan }]}>
                    تسجيل الدخول — احفظ بياناتك
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </Animated.View>

          {/* About */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text style={styles.groupLabel}>عن التطبيق</Text>
            <GlassCard noPad>
              <InfoRow label="الإصدار" value="1.0.0" />
              <View style={styles.rowDivider} />
              <InfoRow label="المطوّر" value="Waffir Team" />
              <View style={styles.rowDivider} />
              <TouchableOpacity style={styles.row}>
                <Text style={styles.rowLabel}>سياسة الخصوصية</Text>
                <Text style={styles.rowArrow}>←</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity style={styles.row}>
                <Text style={styles.rowLabel}>شروط الاستخدام</Text>
                <Text style={styles.rowArrow}>←</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Premium */}
          <Animated.View entering={FadeInDown.delay(360)}>
            <LinearGradient
              colors={['rgba(160,32,240,0.20)', 'rgba(160,32,240,0.08)']}
              style={styles.premiumCard}
            >
              <Text style={styles.premiumTitle}>⭐ وفّر بريميوم</Text>
              <Text style={styles.premiumDesc}>
                سجل سعر لـ 90 يوماً · تنبيهات غير محدودة · بلا إعلانات
              </Text>
              <TouchableOpacity style={styles.premiumBtn}>
                <Text style={styles.premiumBtnText}>اشترك الآن</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SegmentBtn({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, isActive && styles.segBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border.glass, true: Colors.accent.cyanMid }}
        thumbColor={value ? Colors.accent.cyan : Colors.text.muted}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 26,
    fontFamily: 'Almarai_800ExtraBold',
    textAlign: 'right',
  },
  content: { paddingHorizontal: 20, gap: 8 },
  groupLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.3,
  },
  segmentRow: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.accent.primaryMid,
  },
  segLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
  },
  segLabelActive: {
    color: Colors.accent.primary,
    fontFamily: 'Almarai_700Bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    color: Colors.text.primary,
    fontSize: 14,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
  },
  rowValue: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  rowArrow: {
    color: Colors.text.muted,
    fontSize: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border.glass,
    marginHorizontal: 16,
  },
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border.purple,
    alignItems: 'flex-end',
  },
  premiumTitle: {
    color: Colors.accent.primary,
    fontSize: 18,
    fontFamily: 'Almarai_700Bold',
    marginBottom: 8,
  },
  premiumDesc: {
    color: 'rgba(207,188,255,0.70)',
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 16,
  },
  premiumBtn: {
    backgroundColor: Colors.accent.cyan,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  premiumBtnText: {
    color: '#0f0d13',
    fontSize: 14,
    fontFamily: 'Almarai_700Bold',
  },
});

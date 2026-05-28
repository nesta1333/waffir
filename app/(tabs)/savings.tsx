import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useWaffirStore, ALL_BADGES } from '../../store/useStore';
import { formatPrice } from '../../utils/currency';
import GlassCard from '../../components/ui/GlassCard';
import { getPurchaseStats, type PurchaseStats } from '../../services/api';
import { getDeviceId } from '../../utils/deviceId';

export default function SavingsScreen() {
  const {
    purchasedDeals, badges, weeklyStreak, totalFakesAvoided,
    priceAlerts, currency,
  } = useWaffirStore();

  const [apiStats, setApiStats] = useState<PurchaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const stats = await getPurchaseStats(deviceId);
        setApiStats(stats);
      } catch {
        // fallback to local store
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prefer API stats (authoritative); fall back to local store
  const totalSavedAll = apiStats?.total_saved
    ?? purchasedDeals.reduce((s, d) => s + d.savedAmount, 0);

  const totalSavedMonth = apiStats?.this_month_saved
    ?? purchasedDeals
        .filter(d => {
          const dt = new Date(d.purchasedAt);
          const now = new Date();
          return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
        })
        .reduce((s, d) => s + d.savedAmount, 0);

  const purchaseCount = apiStats?.purchase_count ?? purchasedDeals.length;

  const avgSavingPct = apiStats?.avg_saving_pct
    ?? (purchasedDeals.length > 0
      ? Math.round(
          purchasedDeals.reduce((s, d) => s + (d.savedAmount / Math.max(d.marketAvgPrice, 1)) * 100, 0)
          / purchasedDeals.length
        )
      : 0);

  // Best deal: prefer API (includes all devices), else local
  const bestDealAr = apiStats?.best_deal?.product_name_ar
    ?? [...purchasedDeals].sort((a, b) => b.savedAmount - a.savedAmount)[0]?.productNameAr;
  const bestDealSaved = apiStats?.best_deal?.saved_amount
    ?? [...purchasedDeals].sort((a, b) => b.savedAmount - a.savedAmount)[0]?.savedAmount;
  const bestDealCurrency = (apiStats?.best_deal?.currency ?? currency) as 'AED' | 'SAR';
  const bestDealDate = apiStats?.best_deal?.created_at
    ?? [...purchasedDeals].sort((a, b) => b.savedAmount - a.savedAmount)[0]?.purchasedAt;

  const hasBestDeal = !!(bestDealAr && bestDealSaved);

  const userLevel = purchaseCount === 0 ? 'مبتدئ'
    : purchaseCount < 5 ? 'متسوق ذكي'
    : totalSavedAll >= 500 ? 'خبير توفير'
    : 'صائد عروض';

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.bgDark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
            <Text style={styles.title}>توفيري</Text>
            <Text style={styles.subtitle}>My Savings</Text>
          </Animated.View>

          {/* Level + Stats hero */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient
              colors={['rgba(204,255,0,0.14)', 'rgba(204,255,0,0.04)']}
              style={styles.heroCard}
            >
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelIcon}>⭐</Text>
                  <Text style={styles.levelLabel}>{userLevel}</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakLabel}>🔥 سلسلة أسبوعية</Text>
                  <Text style={styles.streakNum}>{weeklyStreak} أيام</Text>
                </View>
              </View>
              {loading ? (
                <ActivityIndicator color={Colors.accent.lime} style={{ marginVertical: 16 }} />
              ) : (
                <>
                  <Text style={styles.heroAmount}>{formatPrice(totalSavedAll, currency)}</Text>
                  <Text style={styles.heroLabel}>إجمالي التوفير</Text>
                </>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Stats grid */}
          <Animated.View entering={FadeInDown.delay(160)} style={styles.statsGrid}>
            <StatCard label="هذا الشهر" value={loading ? '…' : formatPrice(totalSavedMonth, currency)} icon="📅" />
            <StatCard label="متوسط التوفير" value={loading ? '…' : `${Math.round(avgSavingPct)}%`} icon="📈" />
            <StatCard label="خصومات وهمية تجنّبتها" value={`${totalFakesAvoided}`} icon="🔍" />
            <StatCard label="تنبيهات نشطة" value={`${priceAlerts.filter(a => a.active !== false).length}`} icon="🔔" />
            <StatCard label="مشتريات ذكية" value={loading ? '…' : `${purchaseCount}`} icon="🧠" />
          </Animated.View>

          {/* Best deal */}
          {hasBestDeal && (
            <Animated.View entering={FadeInDown.delay(220)}>
              <Text style={styles.sectionTitle}>أفضل صفقة</Text>
              <GlassCard limeBorder>
                <View style={styles.bestDealRow}>
                  <Text style={styles.bestDealIcon}>🏆</Text>
                  <View style={styles.bestDealInfo}>
                    <Text style={styles.bestDealName} numberOfLines={2}>{bestDealAr}</Text>
                    <Text style={styles.bestDealSaving}>
                      وفّرت {formatPrice(bestDealSaved!, bestDealCurrency)}
                    </Text>
                    {bestDealDate && (
                      <Text style={styles.bestDealDate}>
                        {new Date(bestDealDate).toLocaleDateString('ar-AE')}
                      </Text>
                    )}
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Badges */}
          <Animated.View entering={FadeInDown.delay(280)}>
            <Text style={styles.sectionTitle}>شاراتي</Text>
            <View style={styles.badgesGrid}>
              {ALL_BADGES.map(b => {
                const earned = badges.find(e => e.id === b.id);
                return (
                  <View key={b.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                    <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>{b.icon}</Text>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{b.nameAr}</Text>
                    {earned && (
                      <Text style={styles.badgeDate}>{new Date(earned.earnedAt).toLocaleDateString('ar-AE')}</Text>
                    )}
                    {!earned && <Text style={styles.badgeLock}>🔒</Text>}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {purchaseCount === 0 && !loading && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>ابدأ رحلة التوفير</Text>
              <Text style={styles.emptyText}>
                بعد كل شراء، اضغط "اشتريت؟" في صفحة المنتج لتسجيل توفيرك هنا
              </Text>
            </Animated.View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { paddingTop: 16, paddingBottom: 16 },
  title: { color: Colors.text.primary, fontSize: 26, fontFamily: 'Almarai_800ExtraBold', textAlign: 'right' },
  subtitle: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 2 },

  heroCard: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(204,255,0,0.25)',
    padding: 20, alignItems: 'flex-end', marginBottom: 16,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(204,255,0,0.15)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  levelIcon: { fontSize: 14 },
  levelLabel: { color: Colors.accent.lime, fontSize: 13, fontFamily: 'Almarai_700Bold' },
  streakBadge: { alignItems: 'flex-end' },
  streakLabel: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Almarai_400Regular' },
  streakNum: { color: Colors.accent.tertiary, fontSize: 16, fontFamily: 'Inter_700Bold' },
  heroAmount: { color: Colors.accent.lime, fontSize: 34, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  heroLabel: { color: 'rgba(204,255,0,0.60)', fontSize: 13, fontFamily: 'Almarai_400Regular' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '30%',
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.glass,
    borderRadius: 16, padding: 12, alignItems: 'flex-end',
  },
  statIcon: { fontSize: 18, marginBottom: 8 },
  statValue: { color: Colors.text.primary, fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 3 },
  statLabel: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Almarai_400Regular', textAlign: 'right', lineHeight: 14 },

  sectionTitle: {
    color: Colors.text.primary, fontSize: 16, fontFamily: 'Almarai_700Bold',
    textAlign: 'right', marginBottom: 12, marginTop: 4,
  },
  bestDealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bestDealIcon: { fontSize: 28 },
  bestDealInfo: { flex: 1 },
  bestDealName: { color: Colors.text.primary, fontSize: 14, fontFamily: 'Almarai_700Bold', textAlign: 'right', lineHeight: 20, marginBottom: 4 },
  bestDealSaving: { color: Colors.accent.lime, fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  bestDealDate: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 3 },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  badgeCard: {
    width: '30%', flex: 1,
    backgroundColor: 'rgba(207,188,255,0.06)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.20)',
    borderRadius: 16, padding: 12, alignItems: 'center',
  },
  badgeCardLocked: { opacity: 0.45 },
  badgeIcon: { fontSize: 26, marginBottom: 6 },
  badgeIconLocked: { opacity: 0.5 },
  badgeName: { color: Colors.accent.primary, fontSize: 11, fontFamily: 'Almarai_700Bold', textAlign: 'center', lineHeight: 16 },
  badgeNameLocked: { color: Colors.text.muted },
  badgeDate: { color: Colors.text.muted, fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 4 },
  badgeLock: { fontSize: 12, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { color: Colors.text.primary, fontSize: 18, fontFamily: 'Almarai_700Bold', marginBottom: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: 13, fontFamily: 'Almarai_400Regular', textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});

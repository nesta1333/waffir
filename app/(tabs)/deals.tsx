import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { GULF_DEALS_CALENDAR, MOCK_DAILY_DEALS, MOCK_PRODUCTS } from '../../constants/mockData';
import { PLATFORMS } from '../../constants/platforms';
import { formatPrice } from '../../utils/currency';
import ImageWithFallback from '../../components/ui/ImageWithFallback';
import GlassCard from '../../components/ui/GlassCard';

const DEAL_FILTERS = [
  { key: 'all',         label: 'الكل',            icon: '⚡' },
  { key: 'Electronics', label: 'إلكترونيات',      icon: '📱' },
  { key: 'Home',        label: 'المنزل',           icon: '🏠' },
  { key: 'Fashion',     label: 'أزياء',            icon: '👗' },
  { key: 'free_ship',   label: 'شحن مجاني',        icon: '🚀' },
  { key: 'rare',        label: 'نادر',             icon: '💎' },
];

const NOW_MONTH = new Date().getMonth() + 1;

export default function DealsScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'today' | 'calendar'>('today');

  const filteredDeals = MOCK_DAILY_DEALS.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'free_ship') return d.isFreeShipping;
    if (activeFilter === 'rare') return d.realDiscountScore >= 80;
    return d.category === activeFilter;
  });

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.bgDark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
          <Text style={styles.title}>عروض وتقويم</Text>
          <Text style={styles.subtitle}>أفضل العروض الحقيقية</Text>
        </Animated.View>

        {/* Tab switcher */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.tabLabel, activeTab === 'today' && styles.tabLabelActive]}>
              ⚡ أفضل العروض اليوم
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'calendar' && styles.tabBtnActive]}
            onPress={() => setActiveTab('calendar')}
          >
            <Text style={[styles.tabLabel, activeTab === 'calendar' && styles.tabLabelActive]}>
              📅 تقويم الخليج
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {activeTab === 'today' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {DEAL_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(f.key)}
                >
                  <Text style={styles.filterIcon}>{f.icon}</Text>
                  <Text style={[styles.filterLabel, activeFilter === f.key && styles.filterLabelActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredDeals.length === 0 ? (
              <View style={styles.emptyFilter}>
                <Text style={styles.emptyFilterText}>لا توجد عروض في هذه الفئة حالياً</Text>
              </View>
            ) : (
              filteredDeals.map((deal, i) => {
                const product = MOCK_PRODUCTS.find(p => p.id === deal.productId);
                if (!product) return null;
                const platform = PLATFORMS[deal.platformId];
                const discountPct = Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
                return (
                  <Animated.View key={deal.productId + deal.platformId} entering={FadeInDown.delay(i * 60)}>
                    <TouchableOpacity
                      style={styles.dealCard}
                      onPress={() => router.push(`/product/${product.id}`)}
                      activeOpacity={0.8}
                    >
                      <ImageWithFallback uri={product.imageUrl} style={styles.dealImage} resizeMode="cover" />
                      <View style={styles.dealInfo}>
                        <Text style={styles.dealName} numberOfLines={2}>{product.nameAr}</Text>
                        <View style={styles.dealPlatformRow}>
                          {platform && (
                            <Text style={[styles.dealPlatform, { color: platform.color }]}>
                              {platform.nameAr}
                            </Text>
                          )}
                          {deal.isFreeShipping && (
                            <Text style={styles.freeShip}>شحن مجاني</Text>
                          )}
                        </View>
                        <View style={styles.dealPriceRow}>
                          <Text style={styles.dealPrice}>{formatPrice(deal.price, deal.currency)}</Text>
                          <Text style={styles.dealOldPrice}>{formatPrice(deal.originalPrice, deal.currency)}</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>{discountPct}%</Text>
                          </View>
                        </View>
                        <View style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>جودة الخصم</Text>
                          <View style={styles.scoreBarBg}>
                            <View style={[styles.scoreBarFill, { width: `${deal.realDiscountScore}%` as any, backgroundColor: deal.realDiscountScore >= 75 ? '#2DD36F' : deal.realDiscountScore >= 50 ? '#e7c365' : '#ffb4ab' }]} />
                          </View>
                          <Text style={styles.scoreNum}>{deal.realDiscountScore}%</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.calendarSubtitle}>مواسم التسوق في الخليج</Text>
            {GULF_DEALS_CALENDAR.map((event, i) => {
              const isActive = event.startMonth <= NOW_MONTH && event.endMonth >= NOW_MONTH;
              const isPast = event.endMonth < NOW_MONTH;
              return (
                <Animated.View key={event.id} entering={FadeInDown.delay(i * 60)}>
                  <View style={[styles.eventCard, isActive && styles.eventCardActive, isPast && styles.eventCardPast]}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventTitleRow}>
                        <Text style={styles.eventIcon}>{event.icon}</Text>
                        <View>
                          <Text style={styles.eventName}>{event.nameAr}</Text>
                          <Text style={styles.eventNameEn}>{event.nameEn}</Text>
                        </View>
                      </View>
                      <View style={styles.eventDiscountBadge}>
                        <Text style={styles.eventDiscountText}>حتى {event.avgDiscountPct}%</Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>● الآن</Text>
                      </View>
                    )}
                    <Text style={styles.eventTip}>{event.tipAr}</Text>
                    <View style={styles.eventCats}>
                      {event.categories.map(c => (
                        <View key={c} style={styles.eventCat}>
                          <Text style={styles.eventCatText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { color: Colors.text.primary, fontSize: 24, fontFamily: 'Almarai_800ExtraBold', textAlign: 'right' },
  subtitle: { color: Colors.text.secondary, fontSize: 13, fontFamily: 'Almarai_400Regular', textAlign: 'right', marginTop: 3 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
  },
  tabBtnActive: { backgroundColor: Colors.accent.cyanLow, borderColor: Colors.border.cyan },
  tabLabel: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular' },
  tabLabelActive: { color: Colors.accent.cyan, fontFamily: 'Almarai_700Bold' },

  content: { paddingHorizontal: 20 },
  filterRow: { gap: 8, paddingVertical: 16 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: { borderColor: Colors.border.cyan, backgroundColor: Colors.accent.cyanLow },
  filterIcon: { fontSize: 13 },
  filterLabel: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular' },
  filterLabelActive: { color: Colors.accent.cyan, fontFamily: 'Almarai_700Bold' },
  emptyFilter: { alignItems: 'center', paddingVertical: 40 },
  emptyFilterText: { color: Colors.text.muted, fontSize: 13, fontFamily: 'Almarai_400Regular' },

  dealCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dealImage: { width: 100, height: 120 },
  dealInfo: { flex: 1, padding: 12 },
  dealName: { color: Colors.text.primary, fontSize: 13, fontFamily: 'Almarai_700Bold', textAlign: 'right', lineHeight: 19, marginBottom: 6 },
  dealPlatformRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 6 },
  dealPlatform: { fontSize: 11, fontFamily: 'Almarai_700Bold' },
  freeShip: { color: '#2DD36F', fontSize: 10, fontFamily: 'Almarai_400Regular', backgroundColor: 'rgba(45,211,111,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 },
  dealPrice: { color: Colors.accent.cyan, fontSize: 16, fontFamily: 'Inter_700Bold' },
  dealOldPrice: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: 'rgba(45,211,111,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountBadgeText: { color: '#2DD36F', fontSize: 11, fontFamily: 'Inter_700Bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreLabel: { color: Colors.text.muted, fontSize: 9, fontFamily: 'Almarai_400Regular' },
  scoreBarBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  scoreBarFill: { height: 4, borderRadius: 2 },
  scoreNum: { color: Colors.text.secondary, fontSize: 10, fontFamily: 'Inter_700Bold', width: 28, textAlign: 'right' },

  // Calendar
  calendarSubtitle: { color: Colors.text.muted, fontSize: 12, fontFamily: 'Almarai_400Regular', textAlign: 'right', marginVertical: 12 },
  eventCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  eventCardActive: { borderColor: 'rgba(0,242,255,0.35)', backgroundColor: 'rgba(0,242,255,0.05)' },
  eventCardPast: { opacity: 0.50 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: { fontSize: 28 },
  eventName: { color: Colors.text.primary, fontSize: 15, fontFamily: 'Almarai_700Bold', textAlign: 'right' },
  eventNameEn: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Inter_400Regular' },
  eventDiscountBadge: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  eventDiscountText: { color: Colors.accent.lime, fontSize: 12, fontFamily: 'Almarai_700Bold' },
  activeTag: { alignSelf: 'flex-end', marginBottom: 8 },
  activeTagText: { color: Colors.accent.cyan, fontSize: 11, fontFamily: 'Almarai_700Bold' },
  eventTip: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular', textAlign: 'right', lineHeight: 18, marginBottom: 10 },
  eventCats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  eventCat: { backgroundColor: Colors.bg.surfaceHigh, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  eventCatText: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Inter_400Regular' },
});

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type BottomSheet from '@gorhom/bottom-sheet';

import { Colors } from '../../constants/colors';
import { MOCK_TRENDING } from '../../constants/mockData';
import { PLATFORM_ORDER, PLATFORMS } from '../../constants/platforms';
import { useWaffirStore } from '../../store/useStore';
import { useSearch } from '../../hooks/useSearch';
import SearchBar from '../../components/ui/SearchBar';
import TrendingCard from '../../components/ui/TrendingCard';
import SearchResultsSheet from '../../components/sheets/SearchResultsSheet';

const { width: W } = Dimensions.get('window');

export default function HomeScreen() {
  const { recentSearches, addRecentSearch, currency } = useWaffirStore();
  const { results, isLoading, search } = useSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetQuery, setSheetQuery] = useState('');
  const sheetRef = useRef<BottomSheet>(null);

  const handleSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      addRecentSearch(q);
      setSheetQuery(q);
      sheetRef.current?.snapToIndex(1);
      search(q, currency);
    },
    [addRecentSearch, search, currency]
  );

  const handleRecentTap = useCallback(
    (q: string) => {
      setSearchQuery(q);
      handleSearch(q);
    },
    [handleSearch]
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={Colors.gradient.bgDark}
        style={StyleSheet.absoluteFill}
      />
      {/* Mesh gradient orbs */}
      <View style={styles.meshOrb1} />
      <View style={styles.meshOrb2} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>وفّر</Text>
              <View style={styles.logoDot} />
            </View>
            <TouchableOpacity style={styles.notifBtn}>
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Tagline ── */}
          <Animated.View entering={FadeInDown.delay(140)} style={styles.taglineBlock}>
            <Text style={styles.tagline}>أفضل سعر في كل مكان</Text>
            <Text style={styles.taglineSub}>نقارن فوراً من 5 منصات خليجية وعالمية</Text>
          </Animated.View>

          {/* ── Search Bar ── */}
          <Animated.View entering={FadeInDown.delay(220)} style={styles.searchWrap}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmit={handleSearch}
            />
          </Animated.View>

          {/* ── Recent Searches ── */}
          {recentSearches.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
              <Text style={styles.sectionTitle}>بحث أخير</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {recentSearches.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.chip}
                    onPress={() => handleRecentTap(q)}
                  >
                    <Text style={styles.chipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* ── Trending Deals ── */}
          <Animated.View entering={FadeInDown.delay(380)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 عروض رائجة</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>الكل</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {MOCK_TRENDING.map((item, idx) => (
                <TrendingCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onPress={() => handleSearch(item.nameAr)}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── Platform Showcase ── */}
          <Animated.View entering={FadeInDown.delay(460)} style={styles.section}>
            <Text style={styles.sectionTitle}>نبحث لك في</Text>
            <View style={styles.platformsGrid}>
              {PLATFORM_ORDER.map((pid) => {
                const p = PLATFORMS[pid];
                return (
                  <View key={pid} style={styles.platformPill}>
                    <View style={[styles.platformDot, { backgroundColor: p.color }]} />
                    <Text style={styles.platformLabel}>{p.nameAr}</Text>
                    {p.isLocal && <Text style={styles.localTag}>محلي</Text>}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Stats Banner ── */}
          <Animated.View entering={FadeInDown.delay(540)} style={styles.statsBanner}>
            <View style={styles.statsInner}>
              <StatItem value="5+" label="منصة" />
              <View style={styles.statDivider} />
              <StatItem value="30 دقيقة" label="تحديث كل" />
              <View style={styles.statDivider} />
              <StatItem value="مجاني" label="استخدام" />
            </View>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <SearchResultsSheet
        sheetRef={sheetRef}
        results={results}
        query={sheetQuery}
        isLoading={isLoading}
      />
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },

  meshOrb1: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(120,40,200,0.12)',
  },
  meshOrb2: {
    position: 'absolute',
    top: 300,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,100,180,0.08)',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: {
    color: Colors.accent.primary,
    fontSize: 32,
    fontFamily: 'Almarai_800ExtraBold',
    letterSpacing: -1,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent.cyan,
    marginLeft: 4,
    marginBottom: 6,
  },
  notifBtn: { position: 'relative', padding: 8 },
  notifIcon: { fontSize: 22 },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.red,
    borderWidth: 1.5,
    borderColor: Colors.bg.primary,
  },

  taglineBlock: { paddingHorizontal: 20, marginBottom: 22 },
  tagline: {
    color: Colors.text.primary,
    fontSize: 26,
    fontFamily: 'Almarai_800ExtraBold',
    lineHeight: 38,
    textAlign: 'right',
  },
  taglineSub: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Almarai_400Regular',
    marginTop: 4,
    textAlign: 'right',
  },

  searchWrap: { paddingHorizontal: 20, marginBottom: 28 },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontFamily: 'Almarai_700Bold',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAll: {
    color: Colors.accent.cyan,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },

  chipsRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.purple,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: Colors.accent.primary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
  },

  platformsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  platformLabel: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
  },
  localTag: {
    color: Colors.text.emerald,
    fontSize: 10,
    fontFamily: 'Almarai_400Regular',
    backgroundColor: Colors.accent.emeraldLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  statsBanner: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.cyan,
  },
  statsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.accent.cyanLow,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    color: Colors.accent.cyan,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border.glass,
  },
});

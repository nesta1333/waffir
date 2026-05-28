import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import {
  useWaffirStore, WishlistCategory, WishlistItem, WISHLIST_CATEGORY_LABELS,
} from '../../store/useStore';
import { formatPrice } from '../../utils/currency';
import GlassCard from '../../components/ui/GlassCard';
import ImageWithFallback from '../../components/ui/ImageWithFallback';

const CATEGORIES = Object.entries(WISHLIST_CATEGORY_LABELS) as [WishlistCategory, { ar: string; en: string; icon: string }][];

export default function WishlistScreen() {
  const { wishlist, removeFromWishlist, updateWishlistItem } = useWaffirStore();
  const [activeCategory, setActiveCategory] = useState<WishlistCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? wishlist
    : wishlist.filter(w => w.category === activeCategory);

  const totalEstimatedSaving = wishlist
    .filter(w => w.status === 'purchased' && w.estimatedSaving)
    .reduce((s, w) => s + (w.estimatedSaving ?? 0), 0);

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.bgDark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
          <View>
            <Text style={styles.title}>خطة مشترياتي الذكية</Text>
            <Text style={styles.subtitle}>Smart Wishlist</Text>
          </View>
          {totalEstimatedSaving > 0 && (
            <View style={styles.savingBadge}>
              <Text style={styles.savingBadgeLabel}>وفّرت</Text>
              <Text style={styles.savingBadgeAmt}>{formatPrice(totalEstimatedSaving, 'AED')}</Text>
            </View>
          )}
        </Animated.View>

        {/* Category filter */}
        <Animated.View entering={FadeInDown.delay(120)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            <CategoryChip
              label="الكل"
              icon="🛍️"
              active={activeCategory === 'all'}
              onPress={() => setActiveCategory('all')}
              count={wishlist.length}
            />
            {CATEGORIES.map(([key, val]) => {
              const count = wishlist.filter(w => w.category === key).length;
              if (count === 0) return null;
              return (
                <CategoryChip
                  key={key}
                  label={val.ar}
                  icon={val.icon}
                  active={activeCategory === key}
                  onPress={() => setActiveCategory(key)}
                  count={count}
                />
              );
            })}
          </ScrollView>
        </Animated.View>

        {wishlist.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.empty}>
            <Text style={styles.emptyIcon}>💡</Text>
            <Text style={styles.emptyTitle}>قائمة مشترياتك فارغة</Text>
            <Text style={styles.emptyText}>ابحث عن منتج وأضفه لقائمتك لمتابعة سعره</Text>
          </Animated.View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <WishlistCard
                item={item}
                index={index}
                onRemove={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeFromWishlist(item.id); }}
                onPress={() => router.push(`/product/${item.productId}`)}
                onToggleAlert={() => updateWishlistItem(item.id, { alertEnabled: !item.alertEnabled })}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function CategoryChip({ label, icon, active, onPress, count }: {
  label: string; icon: string; active: boolean; onPress: () => void; count: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.catChip, active && styles.catChipActive]}
      onPress={onPress}
    >
      <Text style={styles.catIcon}>{icon}</Text>
      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{label}</Text>
      <View style={[styles.catCount, active && styles.catCountActive]}>
        <Text style={[styles.catCountText, active && styles.catCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function WishlistCard({ item, index, onRemove, onPress, onToggleAlert }: {
  item: WishlistItem; index: number; onRemove: () => void; onPress: () => void; onToggleAlert: () => void;
}) {
  const cat = WISHLIST_CATEGORY_LABELS[item.category];
  const isPurchased = item.status === 'purchased';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)}>
      <GlassCard style={isPurchased ? styles.cardPurchased : undefined} cyanBorder={!isPurchased}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <View style={styles.cardTop}>
            <ImageWithFallback uri={item.imageUrl} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={2}>{item.productNameAr}</Text>
              <View style={styles.catTag}>
                <Text style={styles.catTagText}>{cat.icon} {cat.ar}</Text>
              </View>
              <Text style={styles.cardPrice}>
                {formatPrice(item.currentBestPrice, item.currency)}
              </Text>
              {item.targetPrice && (
                <Text style={styles.targetPrice}>
                  الهدف: {formatPrice(item.targetPrice, item.currency)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onToggleAlert}>
            <Text style={styles.actionIcon}>{item.alertEnabled ? '🔔' : '🔕'}</Text>
            <Text style={[styles.actionLabel, item.alertEnabled && styles.actionLabelActive]}>
              {item.alertEnabled ? 'تنبيه مُفعّل' : 'فعّل التنبيه'}
            </Text>
          </TouchableOpacity>
          {isPurchased && item.estimatedSaving && item.estimatedSaving > 0 && (
            <View style={styles.savingTag}>
              <Text style={styles.savingTagText}>✓ وفّرت {formatPrice(item.estimatedSaving, item.currency)}</Text>
            </View>
          )}
          {!isPurchased && (
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '22' }]}>
              <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function getStatusColor(status: WishlistItem['status']): string {
  switch (status) {
    case 'buy_soon':     return '#2DD36F';
    case 'watching':     return '#00F2FF';
    case 'waiting_deal': return '#e7c365';
    case 'purchased':    return 'rgba(255,255,255,0.35)';
  }
}

function getStatusLabel(status: WishlistItem['status']): string {
  switch (status) {
    case 'buy_soon':     return 'اشترِ قريباً';
    case 'watching':     return 'مراقبة';
    case 'waiting_deal': return 'انتظر عرضاً';
    case 'purchased':    return 'تم الشراء';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: { color: Colors.text.primary, fontSize: 22, fontFamily: 'Almarai_800ExtraBold', textAlign: 'right' },
  subtitle: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 2 },
  savingBadge: {
    backgroundColor: 'rgba(204,255,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.30)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  savingBadgeLabel: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Almarai_400Regular' },
  savingBadgeAmt: { color: Colors.accent.lime, fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 2 },

  catRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  catChip: {
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
  catChipActive: { borderColor: Colors.border.cyan, backgroundColor: Colors.accent.cyanLow },
  catIcon: { fontSize: 14 },
  catLabel: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular' },
  catLabelActive: { color: Colors.accent.cyan, fontFamily: 'Almarai_700Bold' },
  catCount: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  catCountActive: { backgroundColor: 'rgba(0,242,255,0.20)' },
  catCountText: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Inter_700Bold' },
  catCountTextActive: { color: Colors.accent.cyan },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: Colors.text.primary, fontSize: 18, fontFamily: 'Almarai_700Bold', marginBottom: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: 13, fontFamily: 'Almarai_400Regular', textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 120 },
  card: {},
  cardPurchased: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardImage: { width: 72, height: 72, borderRadius: 12 },
  cardInfo: { flex: 1 },
  cardName: { color: Colors.text.primary, fontSize: 13, fontFamily: 'Almarai_700Bold', textAlign: 'right', lineHeight: 19, marginBottom: 4 },
  catTag: { alignSelf: 'flex-end', backgroundColor: Colors.bg.surfaceHigh, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  catTagText: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Almarai_400Regular' },
  cardPrice: { color: Colors.accent.cyan, fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  targetPrice: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Almarai_400Regular', textAlign: 'right', marginTop: 2 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent.redLow, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { color: Colors.accent.red, fontSize: 11 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 14 },
  actionLabel: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Almarai_400Regular' },
  actionLabelActive: { color: Colors.accent.cyan, fontFamily: 'Almarai_700Bold' },
  statusTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTagText: { fontSize: 11, fontFamily: 'Almarai_700Bold' },
  savingTag: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  savingTagText: { color: Colors.accent.lime, fontSize: 11, fontFamily: 'Almarai_700Bold' },
});

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { PLATFORMS } from '../../constants/platforms';
import { PlatformPrice } from '../../constants/mockData';
import { formatPrice } from '../../utils/currency';
import { buildAffiliateUrl, trackClick } from '../../utils/affiliate';
import PlatformBadge from './PlatformBadge';

interface PriceCardProps {
  price: PlatformPrice;
  isBest: boolean;
  productId: string;
  rank: number;
}

export default function PriceCard({ price, isBest, productId, rank }: PriceCardProps) {
  const platform = PLATFORMS[price.platformId];
  const flipValue = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const [isFlipped, setIsFlipped] = React.useState(false);

  const handleFlip = useCallback(() => {
    Haptics.selectionAsync();
    const next = isFlipped ? 0 : 1;
    setIsFlipped(!isFlipped);
    flipValue.value = withSpring(next, { damping: 18, stiffness: 120 });
  }, [isFlipped]);

  const handleBuy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackClick(price.platformId, productId);
    const url = buildAffiliateUrl(price.url, price.platformId);
    Linking.openURL(url);
  }, [price, productId]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotateY: `${interpolate(flipValue.value, [0, 1], [180, 360])}deg` },
    ],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => { pressScale.value = withSpring(0.97); };
  const handlePressOut = () => { pressScale.value = withSpring(1); };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isBest ? styles.bestWrapper : styles.normalWrapper,
        pressStyle,
      ]}
    >
      <TouchableOpacity
        onPress={handleFlip}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.touch}
      >
        {/* Best Deal ribbon — Neon Lime */}
        {isBest && (
          <View style={styles.bestRibbon}>
            <Text style={styles.bestRibbonText}>⭐ أفضل سعر</Text>
          </View>
        )}

        {/* --- FRONT --- */}
        <Animated.View style={[styles.face, frontStyle]}>
          <View style={styles.topRow}>
            <PlatformBadge platformId={price.platformId} size="md" showName />
            {price.shipsFromChina && (
              <View style={styles.chinaBadge}>
                <Text style={styles.chinaText}>🚢 من الصين</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.price, isBest && styles.priceLime]}>
              {formatPrice(price.total, price.currency)}
            </Text>
            {rank === 0 && price.total < 9999 && (
              <Text style={styles.lowestTag}>الأرخص</Text>
            )}
          </View>

          {price.shipping > 0 && (
            <Text style={styles.shippingNote}>
              شحن: {formatPrice(price.shipping, price.currency)} · {price.deliveryDays} أيام
            </Text>
          )}
          {price.shipping === 0 && (
            <Text style={styles.freeShipping}>
              ✓ شحن مجاني · {price.deliveryDays} {price.deliveryDays === 1 ? 'يوم' : 'أيام'}
            </Text>
          )}

          {price.warning && (
            <Text style={styles.warning}>⚠ {price.warning}</Text>
          )}

          <View style={styles.footer}>
            <Text style={styles.tapHint}>اضغط للتفاصيل</Text>
            <TouchableOpacity style={styles.buyBtn} onPress={handleBuy}>
              <Text style={styles.buyText}>شراء</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* --- BACK (savings details) --- */}
        <Animated.View style={[styles.face, backStyle]}>
          <Text style={styles.backTitle}>تفاصيل السعر</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>سعر المنتج</Text>
            <Text style={styles.detailValue}>{formatPrice(price.price, price.currency)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الشحن</Text>
            <Text style={[styles.detailValue, price.shipping === 0 && styles.freeText]}>
              {price.shipping === 0 ? 'مجاني' : formatPrice(price.shipping, price.currency)}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>الإجمالي</Text>
            <Text style={styles.totalValue}>{formatPrice(price.total, price.currency)}</Text>
          </View>
          <View style={styles.backMeta}>
            <Text style={styles.metaItem}>درجة الثقة: {platform?.trustScore ?? 0}%</Text>
            <Text style={styles.metaItem}>
              {platform?.isLocal ? '🇦🇪 محلي' : '🌐 دولي'}
            </Text>
          </View>
          <TouchableOpacity style={styles.buyBtnFull} onPress={handleBuy}>
            <Text style={styles.buyFullText}>🛒 اشتري الآن</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  normalWrapper: {
    borderColor: Colors.border.glass,
    backgroundColor: Colors.bg.card,
  },
  bestWrapper: {
    borderColor: Colors.border.lime,
    backgroundColor: Colors.accent.limeLow,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent.lime,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  touch: {
    padding: 18,
    minHeight: 160,
  },
  face: {
    backfaceVisibility: 'hidden',
  },
  bestRibbon: {
    position: 'absolute',
    top: -18,
    left: -18,
    backgroundColor: Colors.accent.lime,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  bestRibbonText: {
    color: '#0f0d13',
    fontSize: 11,
    fontFamily: 'Almarai_700Bold',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chinaBadge: {
    backgroundColor: Colors.accent.redLow,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.3)',
  },
  chinaText: {
    color: Colors.accent.red,
    fontSize: 11,
    fontFamily: 'Almarai_700Bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  price: {
    color: Colors.text.primary,
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  priceLime: {
    color: Colors.accent.lime,
  },
  lowestTag: {
    backgroundColor: Colors.accent.limeMid,
    color: Colors.accent.lime,
    fontSize: 11,
    fontFamily: 'Almarai_700Bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shippingNote: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 4,
  },
  freeShipping: {
    color: Colors.text.emerald,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 4,
  },
  warning: {
    color: Colors.accent.tertiary,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  tapHint: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
  },
  buyBtn: {
    backgroundColor: Colors.border.glass,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border.cyan,
  },
  buyText: {
    color: Colors.accent.cyan,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  // Back face
  backTitle: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
    marginBottom: 14,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
  },
  detailValue: {
    color: Colors.text.primary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  freeText: { color: Colors.text.emerald },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.glass,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    color: Colors.text.primary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
  },
  totalValue: {
    color: Colors.accent.tertiary,
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  backMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
  },
  metaItem: {
    color: Colors.text.muted,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
  },
  buyBtnFull: {
    backgroundColor: Colors.accent.cyan,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyFullText: {
    color: Colors.bg.secondary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
  },
});

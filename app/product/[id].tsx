import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, Dimensions, Linking, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/colors';
import { MOCK_PRODUCTS } from '../../constants/mockData';
import { PLATFORMS } from '../../constants/platforms';
import { formatPrice, savingsPercent } from '../../utils/currency';
import { buildAffiliateUrl, trackClick } from '../../utils/affiliate';
import {
  calculatePriceStats,
  generateBuyDecision,
  detectDiscountQuality,
  calculateSellerSafetyScore,
  detectProductMismatch,
  calculateBestOffer,
} from '../../utils/shoppingIntelligence';

import PriceCard from '../../components/ui/PriceCard';
import PlatformBadge from '../../components/ui/PlatformBadge';
import PriceHistoryChart from '../../components/charts/PriceHistoryChart';
import GlassCard from '../../components/ui/GlassCard';
import ImageWithFallback from '../../components/ui/ImageWithFallback';
import SmartBuyDecision from '../../components/smart/SmartBuyDecision';
import FakeDiscountDetector from '../../components/smart/FakeDiscountDetector';
import SellerSafetyCard from '../../components/smart/SellerSafetyCard';
import BetterAlternatives from '../../components/smart/BetterAlternatives';
import ProductMismatchWarning from '../../components/smart/ProductMismatchWarning';
import AIShoppingAssistant from '../../components/smart/AIShoppingAssistant';
import { useWaffirStore } from '../../store/useStore';
import { recordPurchase } from '../../services/api';
import { getDeviceId } from '../../utils/deviceId';

const { width: W } = Dimensions.get('window');

const TRUST_NOTICE = 'نقارن السعر النهائي، أمان البائع، الشحن، الضمان، وتاريخ السعر.\nبعض الأسعار قد تتغير — تحقق دائماً عند الدفع.';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addPriceAlert, priceAlerts, currency, wishlist, addToWishlist, removeFromWishlist, recordPurchasedDeal } = useWaffirStore();
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTarget, setAlertTarget] = useState('');
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchasePricePaid, setPurchasePricePaid] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseDone, setPurchaseDone] = useState(false);
  const [purchaseSaved, setPurchaseSaved] = useState(0);

  const product = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.id === id) ?? MOCK_PRODUCTS[0],
    [id]
  );

  const sortedPrices = useMemo(
    () => [...product.prices].sort((a, b) => a.total - b.total),
    [product]
  );

  const bestPrice = sortedPrices[0];
  const worstPrice = sortedPrices[sortedPrices.length - 1];
  const maxSavings = worstPrice.total - bestPrice.total;
  const savingsPct = savingsPercent(worstPrice.total, bestPrice.total);
  const bestPlatform = PLATFORMS[bestPrice.platformId];

  // Intelligence computations
  const priceStats = useMemo(() => calculatePriceStats(product.priceHistory), [product]);
  const buyDecision = useMemo(() => generateBuyDecision(product.prices, product.priceHistory), [product]);
  const discountResult = useMemo(
    () => detectDiscountQuality(product.priceHistory, bestPrice.total, bestPrice.originalPrice),
    [product, bestPrice]
  );
  const safetyResult = useMemo(() => calculateSellerSafetyScore(bestPrice), [bestPrice]);
  const mismatch = useMemo(() => detectProductMismatch(product.prices), [product]);

  const hasAlert = priceAlerts.some((a) => a.productId === product.id);
  const inWishlist = wishlist.some(w => w.productId === product.id);

  const handleBuyBest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    trackClick(bestPrice.platformId, product.id);
    Linking.openURL(buildAffiliateUrl(bestPrice.url, bestPrice.platformId));
  };

  const handleAlert = () => {
    if (!hasAlert) {
      setAlertTarget(String(Math.round(bestPrice.total * 0.92)));
      setAlertModalVisible(true);
    }
  };

  const handleAddAlert = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addPriceAlert({
      productId: product.id,
      productNameAr: product.nameAr,
      targetPrice: parseInt(alertTarget, 10) || Math.round(bestPrice.total * 0.92),
      currency: bestPrice.currency,
      createdAt: new Date().toISOString(),
      active: true,
    });
    setAlertModalVisible(false);
  };

  const handleOpenPurchaseModal = () => {
    setPurchasePricePaid(String(Math.round(bestPrice.total)));
    setPurchaseDone(false);
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    const paid = parseFloat(purchasePricePaid);
    if (!paid || paid <= 0) return;
    setPurchaseLoading(true);
    try {
      const marketAvg = sortedPrices.length > 1
        ? Math.round(sortedPrices.reduce((s, p) => s + p.total, 0) / sortedPrices.length)
        : undefined;
      const deviceId = await getDeviceId();
      const result = await recordPurchase({
        device_id: deviceId,
        product_name_ar: product.nameAr,
        platform_id: bestPrice.platformId,
        price_paid: paid,
        market_avg: marketAvg,
        best_price: bestPrice.total,
        currency: bestPrice.currency as 'AED' | 'SAR',
        image_url: product.imageUrl,
      });
      const saved = result.saved_amount ?? 0;
      setPurchaseSaved(saved);
      setPurchaseDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Also record locally for offline use
      recordPurchasedDeal({
        productId: product.id,
        productNameAr: product.nameAr,
        purchasePrice: paid,
        marketAvgPrice: marketAvg ?? paid,
        savedAmount: saved,
        currency: bestPrice.currency as 'AED' | 'SAR',
        purchasedAt: new Date().toISOString(),
        category: product.category,
      });
    } catch {
      // silent — still record locally
      const marketAvg = sortedPrices.length > 1
        ? Math.round(sortedPrices.reduce((s, p) => s + p.total, 0) / sortedPrices.length)
        : paid;
      const saved = Math.max(0, marketAvg - paid);
      setPurchaseSaved(saved);
      setPurchaseDone(true);
      recordPurchasedDeal({
        productId: product.id,
        productNameAr: product.nameAr,
        purchasePrice: paid,
        marketAvgPrice: marketAvg,
        savedAmount: saved,
        currency: bestPrice.currency as 'AED' | 'SAR',
        purchasedAt: new Date().toISOString(),
        category: product.category,
      });
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleWishlist = () => {
    Haptics.selectionAsync();
    if (inWishlist) {
      const item = wishlist.find(w => w.productId === product.id);
      if (item) removeFromWishlist(item.id);
    } else {
      addToWishlist({
        productId: product.id,
        productNameAr: product.nameAr,
        productName: product.name,
        imageUrl: product.imageUrl,
        category: 'general',
        alertEnabled: false,
        status: 'watching',
        currentBestPrice: bestPrice.total,
        currency: bestPrice.currency,
      });
    }
  };

  const listedDiscountPct = bestPrice.discount ?? (
    bestPrice.originalPrice
      ? Math.round(((bestPrice.originalPrice - bestPrice.total) / bestPrice.originalPrice) * 100)
      : undefined
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.bgDark} style={StyleSheet.absoluteFill} />
      <View style={styles.meshOrb} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top Bar */}
        <Animated.View entering={FadeIn} style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Text style={styles.topBtnIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>{product.nameAr}</Text>
          <TouchableOpacity style={[styles.topBtn, inWishlist && styles.topBtnActive]} onPress={handleWishlist}>
            <Text style={styles.topBtnIcon}>{inWishlist ? '💡' : '♡'}</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Hero image */}
          <Animated.View entering={FadeInDown.delay(60)} style={styles.heroSection}>
            <View style={styles.imageWrap}>
              <ImageWithFallback uri={product.imageUrl} style={styles.image} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(20,18,24,0.92)']} style={styles.imageOverlay} />
            </View>
            {maxSavings > 0 && (
              <View style={styles.savingsBanner}>
                <View style={styles.savingsInner}>
                  <Text style={styles.savingsTitle}>وفّر حتى</Text>
                  <Text style={styles.savingsAmount}>{formatPrice(maxSavings, bestPrice.currency)}</Text>
                  <Text style={styles.savingsPct}>({savingsPct}%)</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Product name */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.nameBlock}>
            <Text style={styles.productName}>{product.nameAr}</Text>
            <Text style={styles.productNameEn}>{product.name}</Text>
            <Text style={styles.brandTag}>{product.brand} · {product.category}</Text>
            {product.modelNumber && (
              <Text style={styles.modelTag}>رقم الموديل: {product.modelNumber}</Text>
            )}
          </Animated.View>

          {/* ① Smart Buy Decision */}
          <Animated.View entering={FadeInDown.delay(140)} style={styles.section}>
            <SmartBuyDecision result={buyDecision} currency={bestPrice.currency} />
          </Animated.View>

          {/* ② Best platform summary */}
          <Animated.View entering={FadeInDown.delay(180)}>
            <GlassCard style={styles.bestDealCard} limeBorder>
              <View style={styles.bestDealRow}>
                <View>
                  <Text style={styles.bestDealLabel}>أفضل سعر الآن</Text>
                  <Text style={styles.bestDealPrice}>{formatPrice(bestPrice.total, bestPrice.currency)}</Text>
                  <Text style={styles.bestDealShipping}>
                    {bestPrice.shipping === 0 ? '✓ شحن مجاني' : `+ شحن ${formatPrice(bestPrice.shipping, bestPrice.currency)}`}
                  </Text>
                  {bestPrice.couponCode && (
                    <Text style={styles.couponTag}>🎟 كوبون: {bestPrice.couponCode}</Text>
                  )}
                </View>
                <View style={styles.bestPlatformCol}>
                  <PlatformBadge platformId={bestPrice.platformId} size="lg" />
                  <Text style={[styles.bestPlatformName, { color: bestPlatform?.color }]}>
                    {bestPlatform?.nameAr}
                  </Text>
                  <Text style={styles.deliveryInfo}>🚀 {bestPrice.deliveryDays} {bestPrice.deliveryDays === 1 ? 'يوم' : 'أيام'}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ③ Full price comparison */}
          <Animated.View entering={FadeInDown.delay(220)} style={styles.section}>
            <Text style={styles.sectionTitle}>مقارنة الأسعار</Text>
            {sortedPrices.map((price, idx) => (
              <PriceCard key={price.platformId} price={price} isBest={idx === 0} productId={product.id} rank={idx} />
            ))}
          </Animated.View>

          {/* ④ Fake discount detector */}
          {listedDiscountPct !== undefined && listedDiscountPct > 0 && (
            <Animated.View entering={FadeInDown.delay(260)} style={styles.section}>
              <Text style={styles.sectionTitle}>كاشف الخصم الحقيقي</Text>
              <FakeDiscountDetector result={discountResult} listedDiscountPct={listedDiscountPct} />
            </Animated.View>
          )}

          {/* ⑤ Price history chart */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <GlassCard cyanBorder>
              <PriceHistoryChart data={product.priceHistory} currency={bestPrice.currency} />
            </GlassCard>
            {/* Price stats row */}
            {priceStats.avg30 > 0 && (
              <View style={styles.statsRow}>
                <StatPill label="أدنى سعر" value={formatPrice(priceStats.min, bestPrice.currency)} color={Colors.text.emerald} />
                <StatPill label="متوسط 30 يوم" value={formatPrice(priceStats.avg30, bestPrice.currency)} color={Colors.text.secondary} />
                <StatPill label="أعلى سعر" value={formatPrice(priceStats.max, bestPrice.currency)} color={Colors.accent.red} />
              </View>
            )}
          </Animated.View>

          {/* ⑥ Seller safety */}
          <Animated.View entering={FadeInDown.delay(340)} style={styles.section}>
            <Text style={styles.sectionTitle}>مؤشر أمان الشراء</Text>
            {sortedPrices.slice(0, 4).map(price => (
              <SellerSafetyCard
                key={price.platformId}
                platformId={price.platformId}
                safety={calculateSellerSafetyScore(price)}
              />
            ))}
          </Animated.View>

          {/* ⑦ Mismatch warning */}
          {mismatch.hasMismatch && (
            <Animated.View entering={FadeInDown.delay(370)} style={styles.section}>
              <ProductMismatchWarning mismatch={mismatch} />
            </Animated.View>
          )}

          {/* ⑧ Better alternatives */}
          {product.alternatives && product.alternatives.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
              <BetterAlternatives alternatives={product.alternatives} />
            </Animated.View>
          )}

          {/* ⑨ AI Shopping Assistant */}
          <Animated.View entering={FadeInDown.delay(440)} style={styles.section}>
            <AIShoppingAssistant
              productNameAr={product.nameAr}
              buyDecision={buyDecision}
              discountResult={discountResult}
              safetyResult={safetyResult}
              bestPrice={bestPrice.total}
              currency={bestPrice.currency}
            />
          </Animated.View>

          {/* Trust notice */}
          <Animated.View entering={FadeInDown.delay(480)} style={styles.section}>
            <View style={styles.trustNotice}>
              <Text style={styles.trustNoticeText}>{TRUST_NOTICE}</Text>
            </View>
          </Animated.View>

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* Sticky bottom bar */}
        <Animated.View entering={SlideInUp.delay(400)} style={styles.stickyBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleAlert}>
            <Text style={styles.iconBtnIcon}>{hasAlert ? '✓' : '🔔'}</Text>
            <Text style={styles.iconBtnLabel}>{hasAlert ? 'تنبيه' : 'تنبيه'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, purchaseDone && styles.iconBtnDone]}
            onPress={handleOpenPurchaseModal}
          >
            <Text style={styles.iconBtnIcon}>{purchaseDone ? '✓' : '📦'}</Text>
            <Text style={styles.iconBtnLabel}>{purchaseDone ? 'سُجّل' : 'اشتريت؟'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyBtn} onPress={handleBuyBest}>
            <LinearGradient colors={['#00F2FF', '#00c4cc']} style={styles.buyBtnGrad}>
              <Text style={styles.buyBtnText}>🛒 اشتري الآن</Text>
              <Text style={styles.buyBtnSub}>{formatPrice(bestPrice.total, bestPrice.currency)} · {bestPlatform?.nameAr}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      {/* Alert modal */}
      <Modal visible={alertModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ضبط تنبيه السعر</Text>
            <Text style={styles.modalSub}>سنخبرك حين يصل السعر لهدفك</Text>
            <TextInput
              style={styles.modalInput}
              value={alertTarget}
              onChangeText={setAlertTarget}
              keyboardType="numeric"
              placeholder={`السعر المستهدف (${bestPrice.currency})`}
              placeholderTextColor={Colors.text.muted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAlertModalVisible(false)}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddAlert}>
                <Text style={styles.modalConfirmText}>حفظ التنبيه</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Purchase modal */}
      <Modal visible={purchaseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!purchaseDone ? (
              <>
                <Text style={styles.modalTitle}>سجّل شراءك 📦</Text>
                <Text style={styles.modalSub}>كم دفعت فعلاً؟ سنحسب توفيرك</Text>
                <TextInput
                  style={styles.modalInput}
                  value={purchasePricePaid}
                  onChangeText={setPurchasePricePaid}
                  keyboardType="numeric"
                  placeholder={`السعر الذي دفعته (${bestPrice.currency})`}
                  placeholderTextColor={Colors.text.muted}
                  autoFocus
                />
                {sortedPrices.length > 1 && (
                  <View style={styles.marketRow}>
                    <Text style={styles.marketLabel}>متوسط السوق</Text>
                    <Text style={styles.marketValue}>
                      {formatPrice(
                        Math.round(sortedPrices.reduce((s, p) => s + p.total, 0) / sortedPrices.length),
                        bestPrice.currency
                      )}
                    </Text>
                  </View>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setPurchaseModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, purchaseLoading && { opacity: 0.6 }]}
                    onPress={handleConfirmPurchase}
                    disabled={purchaseLoading}
                  >
                    <Text style={styles.modalConfirmText}>
                      {purchaseLoading ? 'جاري الحفظ…' : 'احسب توفيري'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { textAlign: 'center' }]}>🎉 رائع!</Text>
                {purchaseSaved > 0 ? (
                  <>
                    <Text style={styles.savedAmount}>{formatPrice(purchaseSaved, bestPrice.currency)}</Text>
                    <Text style={[styles.modalSub, { textAlign: 'center' }]}>وفّرتها مقارنة بمتوسط السوق</Text>
                  </>
                ) : (
                  <Text style={[styles.modalSub, { textAlign: 'center' }]}>تم تسجيل شراءك بنجاح</Text>
                )}
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { marginTop: 20 }]}
                  onPress={() => setPurchaseModalVisible(false)}
                >
                  <Text style={styles.modalConfirmText}>حسناً</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={statStyles.pill}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  label: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Almarai_400Regular', marginBottom: 3 },
  value: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  meshOrb: {
    position: 'absolute', top: -60, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(120,40,200,0.12)',
  },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.glass,
    alignItems: 'center', justifyContent: 'center',
  },
  topBtnActive: { borderColor: Colors.border.cyan, backgroundColor: Colors.accent.cyanLow },
  topBtnIcon: { color: Colors.text.primary, fontSize: 16 },
  topBarTitle: {
    flex: 1, color: Colors.text.primary, fontSize: 15,
    fontFamily: 'Almarai_700Bold', textAlign: 'right',
  },

  scrollContent: { paddingBottom: 20 },

  heroSection: { marginBottom: 0 },
  imageWrap: { height: 240, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

  savingsBanner: {
    marginHorizontal: 20, marginTop: -24, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border.lime,
    ...Platform.select({
      ios: { shadowColor: Colors.accent.lime, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  savingsInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: Colors.accent.limeMid,
  },
  savingsTitle: { color: '#0f0d13', fontSize: 14, fontFamily: 'Almarai_700Bold' },
  savingsAmount: { color: '#0f0d13', fontSize: 22, fontFamily: 'Inter_700Bold' },
  savingsPct: { color: 'rgba(15,13,19,0.7)', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  nameBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, alignItems: 'flex-end' },
  productName: { color: Colors.text.primary, fontSize: 22, fontFamily: 'Almarai_800ExtraBold', textAlign: 'right', lineHeight: 32 },
  productNameEn: { color: Colors.text.secondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'right' },
  brandTag: { color: Colors.text.muted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  modelTag: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    color: Colors.text.primary, fontSize: 16, fontFamily: 'Almarai_700Bold',
    textAlign: 'right', marginBottom: 14,
  },

  bestDealCard: { marginHorizontal: 20, marginBottom: 24 },
  bestDealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bestDealLabel: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular', marginBottom: 6 },
  bestDealPrice: { color: Colors.accent.lime, fontSize: 28, fontFamily: 'Inter_700Bold' },
  bestDealShipping: { color: Colors.text.emerald, fontSize: 12, fontFamily: 'Almarai_400Regular', marginTop: 4 },
  couponTag: { color: Colors.accent.tertiary, fontSize: 11, fontFamily: 'Almarai_700Bold', marginTop: 3 },
  bestPlatformCol: { alignItems: 'center', gap: 6 },
  bestPlatformName: { fontSize: 13, fontFamily: 'Almarai_700Bold' },
  deliveryInfo: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border.glass,
  },

  trustNotice: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.glass,
  },
  trustNoticeText: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 17,
  },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: 'rgba(15,13,19,0.92)',
    borderTopWidth: 1, borderTopColor: Colors.border.glass,
  },
  iconBtn: {
    width: 54, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border.purple,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  iconBtnDone: { borderColor: Colors.accent.lime },
  iconBtnIcon: { fontSize: 18 },
  iconBtnLabel: { color: Colors.text.muted, fontSize: 9, fontFamily: 'Almarai_400Regular' },
  buyBtn: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  buyBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  buyBtnText: { color: '#0f0d13', fontSize: 16, fontFamily: 'Almarai_800ExtraBold' },
  buyBtnSub: { color: 'rgba(15,13,19,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.70)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', backgroundColor: Colors.bg.surface,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border.purple,
  },
  modalTitle: { color: Colors.text.primary, fontSize: 17, fontFamily: 'Almarai_700Bold', textAlign: 'right', marginBottom: 4 },
  modalSub: { color: Colors.text.secondary, fontSize: 12, fontFamily: 'Almarai_400Regular', textAlign: 'right', marginBottom: 16 },
  modalInput: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1, borderColor: Colors.border.purple,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text.primary, fontSize: 18, fontFamily: 'Inter_700Bold',
    textAlign: 'right', marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.glass,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.text.secondary, fontSize: 14, fontFamily: 'Almarai_700Bold' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.accent.cyanLow, borderWidth: 1, borderColor: Colors.border.cyan,
    alignItems: 'center',
  },
  modalConfirmText: { color: Colors.accent.cyan, fontSize: 14, fontFamily: 'Almarai_700Bold' },

  marketRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
    backgroundColor: Colors.bg.card, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  marketLabel: { color: Colors.text.muted, fontSize: 12, fontFamily: 'Almarai_400Regular' },
  marketValue: { color: Colors.text.secondary, fontSize: 14, fontFamily: 'Inter_700Bold' },

  savedAmount: {
    color: Colors.accent.lime, fontSize: 34, fontFamily: 'Inter_700Bold',
    textAlign: 'center', marginVertical: 8,
  },
});

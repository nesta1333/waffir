import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { useWaffirStore, PriceAlert } from '../../store/useStore';
import { formatPrice } from '../../utils/currency';
import GlassCard from '../../components/ui/GlassCard';

export default function AlertsScreen() {
  const { priceAlerts, removePriceAlert } = useWaffirStore();

  const handleRemove = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removePriceAlert(productId);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={Colors.gradient.navyDark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(60)} style={styles.header}>
          <Text style={styles.title}>تنبيهات الأسعار</Text>
          <Text style={styles.subtitle}>سنخبرك حين ينخفض السعر لهدفك</Text>
        </Animated.View>

        {priceAlerts.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(180)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>لا توجد تنبيهات</Text>
            <Text style={styles.emptyText}>
              ابحث عن منتج وافتح صفحته لتضيف تنبيه سعر
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={priceAlerts}
            keyExtractor={(a) => a.productId}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <AlertCard item={item} index={index} onRemove={handleRemove} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function AlertCard({
  item,
  index,
  onRemove,
}: {
  item: PriceAlert;
  index: number;
  onRemove: (id: string) => void;
}) {
  const created = new Date(item.createdAt).toLocaleDateString('ar-AE');
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <GlassCard style={styles.card} cyanBorder>
        <View style={styles.cardTop}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productNameAr}
          </Text>
          <TouchableOpacity onPress={() => onRemove(item.productId)} style={styles.removeBtn}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.targetRow}>
          <View style={styles.targetBlock}>
            <Text style={styles.targetLabel}>السعر المستهدف</Text>
            <Text style={styles.targetPrice}>{formatPrice(item.targetPrice, item.currency)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusDot}>●</Text>
            <Text style={styles.statusText}>مراقبة</Text>
          </View>
        </View>
        <Text style={styles.createdDate}>أُضيف {created}</Text>
      </GlassCard>
    </Animated.View>
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
  subtitle: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIcon: { fontSize: 56, marginBottom: 20 },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontFamily: 'Almarai_700Bold',
    marginBottom: 10,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 120 },
  card: { marginBottom: 0 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  productName: {
    color: Colors.text.primary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
    flex: 1,
    textAlign: 'right',
    lineHeight: 22,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent.redLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  removeText: { color: Colors.accent.red, fontSize: 12 },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetBlock: {},
  targetLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 3,
  },
  targetPrice: {
    color: Colors.accent.primary,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent.emeraldLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: { color: Colors.text.emerald, fontSize: 8 },
  statusText: { color: Colors.text.emerald, fontSize: 12, fontFamily: 'Almarai_700Bold' },
  createdDate: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
});

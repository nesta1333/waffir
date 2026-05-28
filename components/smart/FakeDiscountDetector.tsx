import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { DiscountResult, DISCOUNT_LABELS } from '../../utils/shoppingIntelligence';

interface Props {
  result: DiscountResult;
  listedDiscountPct?: number;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  real_discount:        { bg: 'rgba(45,211,111,0.10)',   border: 'rgba(45,211,111,0.35)',  text: '#2DD36F' },
  normal_price:         { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.60)' },
  fake_discount:        { bg: 'rgba(255,180,171,0.12)',  border: 'rgba(255,180,171,0.40)', text: '#ffb4ab' },
  inflated_before_sale: { bg: 'rgba(231,195,101,0.10)',  border: 'rgba(231,195,101,0.35)', text: '#e7c365' },
  unknown:              { bg: 'rgba(255,255,255,0.03)',  border: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
};

const STATUS_ICONS: Record<string, string> = {
  real_discount:        '✓',
  normal_price:         '○',
  fake_discount:        '⚠',
  inflated_before_sale: '⚡',
  unknown:              '?',
};

export default function FakeDiscountDetector({ result, listedDiscountPct }: Props) {
  const theme = STATUS_COLORS[result.status] ?? STATUS_COLORS.unknown;
  const label = DISCOUNT_LABELS[result.status];
  const icon = STATUS_ICONS[result.status];

  return (
    <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>كاشف الخصم الحقيقي</Text>
          <Text style={styles.titleEn}>Real Deal Detector</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.text + '22', borderColor: theme.text + '44' }]}>
          <Text style={[styles.statusIcon, { color: theme.text }]}>{icon}</Text>
          <Text style={[styles.statusLabel, { color: theme.text }]}>{label.ar}</Text>
        </View>
      </View>

      {listedDiscountPct !== undefined && listedDiscountPct > 0 && (
        <View style={styles.discountRow}>
          <View style={styles.discountItem}>
            <Text style={styles.discountMeta}>الخصم المعلن</Text>
            <Text style={[styles.discountVal, { color: theme.text }]}>{listedDiscountPct}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.discountItem}>
            <Text style={styles.discountMeta}>الخصم الفعلي</Text>
            <Text style={[styles.discountVal, { color: result.status === 'real_discount' ? '#2DD36F' : '#ffb4ab' }]}>
              {result.realDiscountPct}%
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.discountItem}>
            <Text style={styles.discountMeta}>الثقة</Text>
            <Text style={styles.discountVal}>{result.confidence}%</Text>
          </View>
        </View>
      )}

      <Text style={styles.message}>{result.messageAr}</Text>

      {result.evidence.length > 0 && (
        <View style={styles.evidence}>
          {result.evidence.map((e, i) => (
            <Text key={i} style={styles.evidenceItem}>• {e}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleBlock: { flex: 1 },
  title: {
    color: Colors.text.primary,
    fontSize: 14,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
  titleEn: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusIcon: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  statusLabel: { fontSize: 12, fontFamily: 'Almarai_700Bold' },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  discountItem: { alignItems: 'center', flex: 1 },
  discountMeta: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 4,
  },
  discountVal: {
    color: Colors.text.primary,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  divider: { width: 1, height: 32, backgroundColor: Colors.border.glass },
  message: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 8,
  },
  evidence: { gap: 4 },
  evidenceItem: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 16,
  },
});

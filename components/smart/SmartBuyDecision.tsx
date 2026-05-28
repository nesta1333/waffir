import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { BuyDecisionResult, BUY_DECISION_LABELS } from '../../utils/shoppingIntelligence';
import { formatPrice } from '../../utils/currency';
import GlassCard from '../ui/GlassCard';

interface Props {
  result: BuyDecisionResult;
  currency: 'AED' | 'SAR';
}

const DECISION_BG: Record<string, string> = {
  buy_now:            'rgba(45,211,111,0.10)',
  rare_deal:          'rgba(204,255,0,0.10)',
  wait:               'rgba(231,195,101,0.10)',
  avoid:              'rgba(255,180,171,0.10)',
  check_seller:       'rgba(231,195,101,0.10)',
  better_alternative: 'rgba(0,242,255,0.10)',
};

const DECISION_BORDER: Record<string, string> = {
  buy_now:            'rgba(45,211,111,0.35)',
  rare_deal:          'rgba(204,255,0,0.45)',
  wait:               'rgba(231,195,101,0.35)',
  avoid:              'rgba(255,180,171,0.35)',
  check_seller:       'rgba(231,195,101,0.35)',
  better_alternative: 'rgba(0,242,255,0.35)',
};

export default function SmartBuyDecision({ result, currency }: Props) {
  const label = BUY_DECISION_LABELS[result.decision];
  const badgeColor = label.color;
  const bgColor = DECISION_BG[result.decision] ?? Colors.bg.card;
  const borderColor = DECISION_BORDER[result.decision] ?? Colors.border.glass;

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionLabel}>قرار الشراء الذكي</Text>
          <Text style={styles.sectionLabelEn}>Smart Buy Decision</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{label.ar}</Text>
        </View>
      </View>

      {/* Confidence bar */}
      <View style={styles.confRow}>
        <Text style={styles.confLabel}>الثقة في القرار</Text>
        <Text style={[styles.confPct, { color: badgeColor }]}>{result.confidence}%</Text>
      </View>
      <View style={styles.confBarBg}>
        <View style={[styles.confBarFill, { width: `${result.confidence}%` as any, backgroundColor: badgeColor }]} />
      </View>

      {/* Explanation */}
      <Text style={styles.explanation}>{result.explanationAr}</Text>

      {/* Reasons */}
      {result.reasonsAr.length > 0 && (
        <View style={styles.reasons}>
          {result.reasonsAr.map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Estimated saving if wait */}
      {result.estimatedSavingIfWait > 0 && (
        <View style={styles.savingHint}>
          <Text style={styles.savingHintText}>
            💡 قد توفر نحو {formatPrice(result.estimatedSavingIfWait, currency)} بالانتظار
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleRow: { flex: 1 },
  sectionLabel: {
    color: Colors.text.primary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
  sectionLabelEn: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  confRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
  },
  confPct: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  confBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  confBarFill: {
    height: 4,
    borderRadius: 2,
  },
  explanation: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 10,
  },
  reasons: { gap: 5, marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  bullet: { color: Colors.text.muted, fontSize: 13, marginTop: 1 },
  reasonText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  savingHint: {
    marginTop: 8,
    backgroundColor: 'rgba(231,195,101,0.12)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(231,195,101,0.25)',
  },
  savingHintText: {
    color: Colors.accent.tertiary,
    fontSize: 12,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
});

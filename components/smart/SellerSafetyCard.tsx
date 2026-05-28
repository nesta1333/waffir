import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { SellerSafetyResult, SAFETY_LABELS } from '../../utils/shoppingIntelligence';
import { PLATFORMS } from '../../constants/platforms';
import PlatformBadge from '../ui/PlatformBadge';

interface Props {
  platformId: string;
  safety: SellerSafetyResult;
}

export default function SellerSafetyCard({ platformId, safety }: Props) {
  const label = SAFETY_LABELS[safety.level];
  const platform = PLATFORMS[platformId];

  return (
    <View style={[styles.card, { borderColor: label.color + '44' }]}>
      <View style={styles.row}>
        <PlatformBadge platformId={platformId} size="sm" showName />
        <View style={[styles.levelBadge, { backgroundColor: label.color + '1A', borderColor: label.color + '44' }]}>
          <Text style={[styles.levelText, { color: label.color }]}>{label.ar}</Text>
        </View>
      </View>

      {/* Score arc */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreNum, { color: label.color }]}>{safety.score}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.scoreMeta}>
          {platform && (
            <>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>الإرجاع:</Text>
                <Text style={styles.metaVal}>{platform.returnDays} يوم</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>الضمان:</Text>
                <Text style={styles.metaVal}>
                  {platform.warrantyType === 'local' ? '🇦🇪 محلي'
                    : platform.warrantyType === 'international' ? '🌐 دولي'
                    : platform.warrantyType === 'seller' ? '🏪 البائع'
                    : '❌ لا يوجد'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>ثقة المنصة:</Text>
                <Text style={styles.metaVal}>{platform.trustScore}%</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Score bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${safety.score}%` as any, backgroundColor: label.color }]} />
      </View>

      {safety.flags.length > 0 && (
        <View style={styles.flags}>
          {safety.flags.map((f, i) => (
            <Text key={i} style={styles.flag}>⚠ {f}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: { fontSize: 12, fontFamily: 'Almarai_700Bold' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  scoreBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  scoreNum: { fontSize: 32, fontFamily: 'Inter_700Bold', lineHeight: 36 },
  scoreMax: { color: Colors.text.muted, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 3, marginLeft: 2 },
  scoreMeta: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: Colors.text.muted, fontSize: 11, fontFamily: 'Almarai_400Regular' },
  metaVal: { color: Colors.text.secondary, fontSize: 11, fontFamily: 'Almarai_700Bold' },
  barBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: { height: 5, borderRadius: 3 },
  flags: { gap: 5 },
  flag: {
    color: Colors.accent.tertiary,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
  },
});

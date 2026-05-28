import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { PricePoint } from '../../constants/mockData';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface PriceHistoryChartProps {
  data: PricePoint[];
  currency: 'AED' | 'SAR';
}

const CHART_H = 160;
const H_PAD = 16;
const V_PAD = 20;

export default function PriceHistoryChart({ data, currency }: PriceHistoryChartProps) {
  const { width: SCREEN_W } = Dimensions.get('window');
  const CHART_W = SCREEN_W - 64;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [data]);

  if (!data || data.length === 0) return null;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices) * 0.97;
  const maxP = Math.max(...prices) * 1.03;
  const range = maxP - minP || 1;

  const points = data.map((d, i) => ({
    x: H_PAD + (i / (data.length - 1)) * (CHART_W - H_PAD * 2),
    y: V_PAD + (1 - (d.price - minP) / range) * (CHART_H - V_PAD * 2),
    price: d.price,
    date: d.date,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${CHART_H - V_PAD}` +
    ` L ${points[0].x} ${CHART_H - V_PAD} Z`;

  const currentPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const changeAmt = currentPrice - firstPrice;
  const changePct = ((changeAmt / firstPrice) * 100).toFixed(1);
  const isDown = changeAmt < 0;
  const sym = currency === 'AED' ? 'د.إ' : 'ر.س';

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * 2000,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>تاريخ السعر (30 يوم)</Text>
        <View style={[styles.changeBadge, isDown ? styles.badgeDown : styles.badgeUp]}>
          <Text style={[styles.changeText, isDown ? styles.down : styles.up]}>
            {isDown ? '▼' : '▲'} {Math.abs(Number(changePct))}%
          </Text>
        </View>
      </View>

      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.accent.cyan} stopOpacity="0.20" />
            <Stop offset="100%" stopColor={Colors.accent.cyan} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Animated line */}
        <AnimatedPath
          d={linePath}
          stroke={Colors.accent.cyan}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={2000}
          animatedProps={animatedProps}
        />

        {/* Current price dot */}
        <Circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={5}
          fill={Colors.accent.cyan}
        />
        <Circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={10}
          fill={Colors.accent.cyan}
          opacity={0.20}
        />
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{data[0]?.date.slice(5)}</Text>
        <Text style={styles.xLabel}>{data[Math.floor(data.length / 2)]?.date.slice(5)}</Text>
        <Text style={styles.xLabel}>{data[data.length - 1]?.date.slice(5)}</Text>
      </View>

      {/* Price range */}
      <View style={styles.rangeRow}>
        <View>
          <Text style={styles.rangeLabel}>أعلى</Text>
          <Text style={styles.rangeVal}>{Math.max(...prices).toLocaleString('ar-AE')} {sym}</Text>
        </View>
        <View style={styles.currentContainer}>
          <Text style={styles.rangeLabel}>الآن</Text>
          <Text style={styles.currentPrice}>{currentPrice.toLocaleString('ar-AE')} {sym}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.rangeLabel}>أدنى</Text>
          <Text style={styles.rangeVal}>{Math.min(...prices).toLocaleString('ar-AE')} {sym}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  changeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDown: { backgroundColor: 'rgba(45,211,111,0.12)' },
  badgeUp: { backgroundColor: 'rgba(255,180,171,0.12)' },
  changeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  up: { color: Colors.accent.red },
  down: { color: Colors.text.emerald },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    marginTop: 6,
  },
  xLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border.glass,
  },
  rangeLabel: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 3,
    textAlign: 'center',
  },
  rangeVal: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  currentContainer: { alignItems: 'center' },
  currentPrice: {
    color: Colors.accent.cyan,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});

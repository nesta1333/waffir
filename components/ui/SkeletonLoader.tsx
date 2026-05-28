import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface SkeletonLineProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonLine({ width = '100%', height = 14, borderRadius = 7, style }: SkeletonLineProps) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.65, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: Colors.bg.surfaceHigh },
        animStyle,
        style,
      ]}
    />
  );
}

export function SearchResultSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <SkeletonLine width="60%" height={16} borderRadius={8} />
        <SkeletonLine width={70} height={22} borderRadius={6} />
      </View>
      <SkeletonLine width="38%" height={11} borderRadius={6} style={styles.mt6} />
      <View style={styles.priceRows}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.priceRow}>
            <SkeletonLine width={38} height={38} borderRadius={10} />
            <View style={styles.priceInfo}>
              <SkeletonLine width="55%" height={11} borderRadius={6} />
              <SkeletonLine width="35%" height={18} borderRadius={6} style={styles.mt4} />
            </View>
            <SkeletonLine width={76} height={34} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default SkeletonLine;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.glass,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mt6: { marginTop: 6 },
  mt4: { marginTop: 4 },
  priceRows: { marginTop: 16, gap: 12 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInfo: { flex: 1 },
});

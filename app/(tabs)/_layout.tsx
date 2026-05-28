import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { useWaffirStore } from '../../store/useStore';

const TABS = [
  { name: 'index',    icon: '🛍️', label: 'الرئيسية' },
  { name: 'deals',   icon: '⚡',  label: 'العروض'    },
  { name: 'wishlist', icon: '💡', label: 'قائمتي'    },
  { name: 'savings', icon: '💰',  label: 'توفيري'    },
  { name: 'alerts',  icon: '🔔',  label: 'التنبيهات' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { priceAlerts } = useWaffirStore();
  const alertCount = priceAlerts.filter(a => a.active !== false).length;

  return (
    <View style={styles.tabBarWrapper}>
      <BlurView intensity={60} tint="dark" style={styles.tabBar}>
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const tab = TABS[index];
            const showBadge = route.name === 'alerts' && alertCount > 0;
            return (
              <TabItem
                key={route.key}
                icon={tab?.icon ?? '●'}
                label={tab?.label ?? ''}
                isFocused={isFocused}
                badge={showBadge ? alertCount : 0}
                onPress={() => { if (!isFocused) navigation.navigate(route.name); }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function TabItem({
  icon, label, isFocused, badge, onPress,
}: {
  icon: string;
  label: string;
  isFocused: boolean;
  badge: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <View style={styles.iconWrap}>
        <Text
          onPress={() => {
            scale.value = withSpring(0.82, {}, () => { scale.value = withSpring(1); });
            onPress();
          }}
          style={[styles.tabIcon, isFocused && styles.tabIconActive]}
        >
          {icon}
        </Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
      {isFocused && <View style={styles.indicator} />}
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="deals" />
      <Tabs.Screen name="wishlist" />
      <Tabs.Screen name="savings" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.glass,
    backgroundColor: 'rgba(15,13,19,0.80)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 3,
  },
  tabIcon: { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold', lineHeight: 11 },
  tabLabel: { color: Colors.text.muted, fontSize: 9, fontFamily: 'Almarai_400Regular' },
  tabLabelActive: { color: Colors.accent.primary, fontFamily: 'Almarai_700Bold' },
  indicator: {
    position: 'absolute',
    bottom: -4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent.cyan,
  },
});

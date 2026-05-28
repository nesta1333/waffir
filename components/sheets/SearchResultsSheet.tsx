import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Product } from '../../constants/mockData';
import PriceCard from '../ui/PriceCard';
import PlatformBadge from '../ui/PlatformBadge';
import { SearchResultSkeleton } from '../ui/SkeletonLoader';

interface SearchResultsSheetProps {
  sheetRef: React.RefObject<BottomSheet>;
  results: Product[];
  query: string;
  isLoading: boolean;
}

type SortMode = 'cheapest' | 'fastest' | 'trusted';

export default function SearchResultsSheet({
  sheetRef,
  results,
  query,
  isLoading,
}: SearchResultsSheetProps) {
  const snapPoints = useMemo(() => ['35%', '70%', '96%'], []);
  const [sortMode, setSortMode] = React.useState<SortMode>('cheapest');

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
      />
    ),
    []
  );

  const sortedResults = useMemo(() => {
    if (!results.length) return [];
    return results.map((product) => {
      const sorted = [...product.prices].sort((a, b) => {
        if (sortMode === 'cheapest') return a.total - b.total;
        if (sortMode === 'fastest') return a.deliveryDays - b.deliveryDays;
        return 0;
      });
      return { ...product, prices: sorted };
    });
  }, [results, sortMode]);

  const handleProductPress = useCallback((productId: string) => {
    router.push({ pathname: '/product/[id]', params: { id: productId } });
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const bestPrice = item.prices[0];
      return (
        <View style={styles.productBlock}>
          <TouchableOpacity
            onPress={() => handleProductPress(item.id)}
            style={styles.productHeader}
          >
            <View style={styles.productMeta}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.nameAr}
              </Text>
              <Text style={styles.productBrand}>{item.brand}</Text>
            </View>
            <View style={styles.bestPricePreview}>
              <Text style={styles.bestPriceLabel}>من</Text>
              <Text style={styles.bestPriceValue}>
                {bestPrice.total.toLocaleString('ar-AE')} {bestPrice.currency === 'AED' ? 'د.إ' : 'ر.س'}
              </Text>
              <PlatformBadge platformId={bestPrice.platformId} size="sm" />
            </View>
          </TouchableOpacity>

          {item.prices.slice(0, 3).map((price, idx) => (
            <PriceCard
              key={price.platformId}
              price={price}
              isBest={idx === 0}
              productId={item.id}
              rank={idx}
            />
          ))}

          {item.prices.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => handleProductPress(item.id)}
            >
              <Text style={styles.viewAllText}>
                عرض كل {item.prices.length} أسعار ←
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />
        </View>
      );
    },
    [handleProductPress, sortMode]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {isLoading ? 'جاري البحث...' : `نتائج: ${query}`}
          </Text>
          {!isLoading && results.length > 0 && (
            <Text style={styles.count}>{results.length} منتج</Text>
          )}
        </View>

        <View style={styles.sortRow}>
          {([
            { key: 'cheapest', label: 'الأرخص' },
            { key: 'fastest',  label: 'الأسرع' },
            { key: 'trusted',  label: 'الأوثق' },
          ] as { key: SortMode; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.sortBtn, sortMode === key && styles.sortBtnActive]}
              onPress={() => setSortMode(key)}
            >
              <Text style={[styles.sortLabel, sortMode === key && styles.sortLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>

      {isLoading ? (
        <BottomSheetView style={styles.skeletonContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
          </ScrollView>
        </BottomSheetView>
      ) : (
        <BottomSheetFlatList
          data={sortedResults}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>لم نجد نتائج لـ "{query}"</Text>
              <Text style={styles.emptySub}>جرّب كلمات مختلفة</Text>
            </View>
          }
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.bg.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: Colors.border.glassBright,
    width: 40,
    height: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.glass,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 16,
    fontFamily: 'Almarai_700Bold',
    flex: 1,
    textAlign: 'right',
  },
  count: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    marginLeft: 10,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
  },
  sortBtnActive: {
    backgroundColor: Colors.accent.cyanLow,
    borderColor: Colors.border.cyan,
  },
  sortLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  sortLabelActive: {
    color: Colors.accent.cyan,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  productBlock: {
    marginBottom: 8,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  productMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  productName: {
    color: Colors.text.primary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
    lineHeight: 22,
  },
  productBrand: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  bestPricePreview: {
    alignItems: 'flex-start',
    marginLeft: 12,
  },
  bestPriceLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Almarai_400Regular',
    marginBottom: 2,
  },
  bestPriceValue: {
    color: Colors.accent.lime,
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  viewAllBtn: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  viewAllText: {
    color: Colors.accent.cyan,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.glass,
    marginVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontFamily: 'Almarai_700Bold',
    marginBottom: 8,
  },
  emptySub: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
  },
});

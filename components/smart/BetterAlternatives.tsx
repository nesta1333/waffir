import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { AlternativeProduct } from '../../constants/mockData';
import { formatPrice } from '../../utils/currency';
import ImageWithFallback from '../ui/ImageWithFallback';
import { PLATFORMS } from '../../constants/platforms';

interface Props {
  alternatives: AlternativeProduct[];
}

export default function BetterAlternatives({ alternatives }: Props) {
  if (!alternatives.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>بدائل أفضل</Text>
        <Text style={styles.titleEn}>Better Alternatives</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {alternatives.map((alt) => (
          <AlternativeCard key={alt.id} alt={alt} />
        ))}
      </ScrollView>
    </View>
  );
}

function AlternativeCard({ alt }: { alt: AlternativeProduct }) {
  const platform = PLATFORMS[alt.bestPlatformId];
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${alt.id}`)}
      activeOpacity={0.8}
    >
      <ImageWithFallback uri={alt.imageUrl} style={styles.image} resizeMode="cover" />
      {alt.savingPct > 0 && (
        <View style={styles.savingBadge}>
          <Text style={styles.savingText}>يوفر {alt.savingPct}%</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>{alt.nameAr}</Text>
      <Text style={styles.price}>{formatPrice(alt.bestPrice, alt.currency)}</Text>
      {platform && (
        <Text style={[styles.platformLabel, { color: platform.color }]}>{platform.nameAr}</Text>
      )}
      <Text style={styles.reason} numberOfLines={2}>{alt.reasonAr}</Text>
      {alt.tradeoffAr ? (
        <View style={styles.tradeoffRow}>
          <Text style={styles.tradeoffIcon}>↔</Text>
          <Text style={styles.tradeoff} numberOfLines={1}>{alt.tradeoffAr}</Text>
        </View>
      ) : null}
      <View style={styles.ratingRow}>
        <Text style={styles.star}>★</Text>
        <Text style={styles.rating}>{alt.rating.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: { marginBottom: 12 },
  title: {
    color: Colors.text.primary,
    fontSize: 16,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
  titleEn: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: 1,
  },
  row: { gap: 12, paddingRight: 4 },
  card: {
    width: 165,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 0,
  },
  image: { width: '100%', height: 120 },
  savingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.accent.lime,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingText: { color: '#0f0d13', fontSize: 11, fontFamily: 'Almarai_700Bold' },
  name: {
    color: Colors.text.primary,
    fontSize: 12,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
    paddingHorizontal: 10,
    paddingTop: 10,
    lineHeight: 18,
  },
  price: {
    color: Colors.accent.cyan,
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  platformLabel: {
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    paddingHorizontal: 10,
    marginTop: 2,
    textAlign: 'right',
  },
  reason: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    paddingHorizontal: 10,
    marginTop: 6,
    lineHeight: 16,
  },
  tradeoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
    gap: 4,
  },
  tradeoffIcon: { color: Colors.text.muted, fontSize: 11 },
  tradeoff: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Almarai_400Regular',
    flex: 1,
    textAlign: 'right',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 12,
    marginTop: 6,
    gap: 3,
    justifyContent: 'flex-end',
  },
  star: { color: Colors.accent.tertiary, fontSize: 12 },
  rating: { color: Colors.text.secondary, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});

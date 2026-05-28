import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { MismatchWarning } from '../../utils/shoppingIntelligence';

interface Props {
  mismatch: MismatchWarning;
}

export default function ProductMismatchWarning({ mismatch }: Props) {
  if (!mismatch.hasMismatch) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>⚠</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>تحقق من التطابق</Text>
          <Text style={styles.subtitle}>قد لا تكون جميع العروض لنفس المنتج تماماً</Text>
        </View>
      </View>
      {mismatch.warnings.map((w, i) => (
        <Text key={i} style={styles.warning}>{w}</Text>
      ))}
      <Text style={styles.footer}>
        تحقق دائماً من رقم الموديل والإصدار والضمان قبل الشراء.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(231,195,101,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(231,195,101,0.30)',
    borderRadius: 16,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  icon: { fontSize: 20, marginTop: 1 },
  textBlock: { flex: 1 },
  title: {
    color: Colors.accent.tertiary,
    fontSize: 14,
    fontFamily: 'Almarai_700Bold',
    textAlign: 'right',
  },
  subtitle: {
    color: 'rgba(231,195,101,0.70)',
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  warning: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 6,
  },
  footer: {
    color: Colors.text.muted,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

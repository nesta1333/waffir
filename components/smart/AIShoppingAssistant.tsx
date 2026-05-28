import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Colors } from '../../constants/colors';
import { BuyDecisionResult, DiscountResult, SellerSafetyResult } from '../../utils/shoppingIntelligence';
import { formatPrice } from '../../utils/currency';

interface Props {
  productNameAr: string;
  buyDecision: BuyDecisionResult;
  discountResult: DiscountResult;
  safetyResult: SellerSafetyResult;
  bestPrice: number;
  currency: 'AED' | 'SAR';
}

const PRESET_QUESTIONS = [
  { ar: 'هل أشتري الآن؟',           key: 'buy_now' },
  { ar: 'هل هذا العرض حقيقي؟',     key: 'real_deal' },
  { ar: 'هل هذا البائع موثوق؟',    key: 'seller_trust' },
  { ar: 'متى أفضل وقت للشراء؟',    key: 'best_time' },
  { ar: 'هل يوجد بديل أرخص؟',      key: 'cheaper_alt' },
];

export default function AIShoppingAssistant({
  productNameAr, buyDecision, discountResult, safetyResult, bestPrice, currency,
}: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const getAnswer = (key: string): { ar: string; icon: string } => {
    switch (key) {
      case 'buy_now':
        return {
          icon: buyDecision.decision === 'buy_now' || buyDecision.decision === 'rare_deal' ? '✅' : '⏳',
          ar: `${buyDecision.explanationAr}\n\nثقة التوصية: ${buyDecision.confidence}%.${
            buyDecision.estimatedSavingIfWait > 0
              ? `\nقد توفر نحو ${formatPrice(buyDecision.estimatedSavingIfWait, currency)} بالانتظار.`
              : ''
          }`,
        };
      case 'real_deal':
        return {
          icon: discountResult.status === 'real_discount' ? '✅' : discountResult.status === 'fake_discount' ? '⚠️' : '📊',
          ar: discountResult.messageAr + (discountResult.evidence.length ? '\n\n' + discountResult.evidence.join('\n') : ''),
        };
      case 'seller_trust':
        return {
          icon: safetyResult.level === 'safe' ? '🛡️' : safetyResult.level === 'medium_risk' ? '⚠️' : '🚨',
          ar: `درجة أمان أفضل بائع: ${safetyResult.score}/100.\n${
            safetyResult.flags.length ? 'ملاحظات:\n' + safetyResult.flags.join('\n') : 'لا توجد مخاوف رئيسية.'
          }`,
        };
      case 'best_time':
        return {
          icon: '📅',
          ar: buyDecision.decision === 'wait'
            ? `السعر حالياً أعلى من المتوسط. انتظر فرصة أفضل — غالباً خلال مواسم الخصومات الكبرى كالجمعة البيضاء أو رمضان.\n\nالتوفير المتوقع: ${formatPrice(buyDecision.estimatedSavingIfWait || 0, currency)}.`
            : `السعر الحالي مناسب ولا توجد مؤشرات قوية على انخفاض قريب. الشراء الآن خيار جيد.`,
        };
      case 'cheaper_alt':
        return {
          icon: '🔍',
          ar: `أفضل سعر حالي: ${formatPrice(bestPrice, currency)}.\nراجع قسم "بدائل أفضل" أسفل الصفحة لمنتجات مشابهة بقيمة أفضل.`,
        };
      default:
        return { icon: '🤖', ar: 'لا أملك معلومات كافية للإجابة على هذا السؤال حالياً.' };
    }
  };

  if (!isExpanded) {
    return (
      <TouchableOpacity style={styles.collapsed} onPress={() => setIsExpanded(true)}>
        <View style={styles.collapsedLeft}>
          <Text style={styles.aiDot}>🤖</Text>
          <View>
            <Text style={styles.collapsedTitle}>اسأل مساعد الشراء</Text>
            <Text style={styles.collapsedSub}>Ask the Shopping Assistant</Text>
          </View>
        </View>
        <Text style={styles.expandArrow}>⌄</Text>
      </TouchableOpacity>
    );
  }

  const answer = activeKey ? getAnswer(activeKey) : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setIsExpanded(false)}>
        <View style={styles.headerLeft}>
          <Text style={styles.aiDot}>🤖</Text>
          <View>
            <Text style={styles.cardTitle}>مساعد الشراء الذكي</Text>
            <Text style={styles.cardSubtitle}>Ask the Shopping Assistant</Text>
          </View>
        </View>
        <Text style={styles.collapseArrow}>⌃</Text>
      </TouchableOpacity>

      {/* Preset questions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.questionsRow}
      >
        {PRESET_QUESTIONS.map(q => (
          <TouchableOpacity
            key={q.key}
            style={[styles.questionChip, activeKey === q.key && styles.questionChipActive]}
            onPress={() => setActiveKey(activeKey === q.key ? null : q.key)}
          >
            <Text style={[styles.questionText, activeKey === q.key && styles.questionTextActive]}>
              {q.ar}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Answer */}
      {answer && (
        <View style={styles.answerBox}>
          <View style={styles.answerHeader}>
            <Text style={styles.answerIcon}>{answer.icon}</Text>
            <Text style={styles.answerLabel}>الإجابة</Text>
          </View>
          <Text style={styles.answerText}>{answer.ar}</Text>
        </View>
      )}

      {!answer && (
        <Text style={styles.prompt}>اختر سؤالاً من الأعلى للحصول على توصية فورية</Text>
      )}

      <Text style={styles.disclaimer}>
        * التوصيات مبنية على بيانات الأسعار المتوفرة وقد لا تعكس التغيرات اللحظية.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(160,32,240,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(207,188,255,0.20)',
    borderRadius: 16,
    padding: 14,
  },
  collapsedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  collapsedTitle: {
    color: Colors.accent.primary,
    fontSize: 14,
    fontFamily: 'Almarai_700Bold',
  },
  collapsedSub: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Inter_400Regular' },
  expandArrow: { color: Colors.text.muted, fontSize: 18 },

  card: {
    backgroundColor: 'rgba(160,32,240,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(207,188,255,0.20)',
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiDot: { fontSize: 22 },
  cardTitle: {
    color: Colors.accent.primary,
    fontSize: 15,
    fontFamily: 'Almarai_700Bold',
  },
  cardSubtitle: { color: Colors.text.muted, fontSize: 10, fontFamily: 'Inter_400Regular' },
  collapseArrow: { color: Colors.text.muted, fontSize: 18 },

  questionsRow: { gap: 8, paddingBottom: 2 },
  questionChip: {
    backgroundColor: 'rgba(207,188,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(207,188,255,0.20)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  questionChipActive: {
    backgroundColor: 'rgba(207,188,255,0.20)',
    borderColor: Colors.accent.primary,
  },
  questionText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
  },
  questionTextActive: {
    color: Colors.accent.primary,
    fontFamily: 'Almarai_700Bold',
  },

  answerBox: {
    backgroundColor: 'rgba(207,188,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  answerIcon: { fontSize: 18 },
  answerLabel: {
    color: Colors.accent.primary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
  answerText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    lineHeight: 20,
  },

  prompt: {
    color: Colors.text.muted,
    fontSize: 12,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  disclaimer: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
    marginTop: 12,
    lineHeight: 14,
  },
});

import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Equal, Plus, X } from 'lucide-react-native';
import { Dropdown } from './Dropdown';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { Currency, Envelope, TransactionCategory } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { getUnallocated, parseAmount, splitEqually, toInputString } from '../utils/allocation';

export interface SplitPart {
  key: string;
  envelopeId: string;
  categoryId: string;
  amountStr: string;
}

interface SplitEditorProps {
  parts: SplitPart[];
  onChange: (parts: SplitPart[]) => void;
  total: number;
  currency: Currency;
  /** Envelopes a part may be charged to (same currency, not debts). */
  envelopes: Envelope[];
  categories: TransactionCategory[];
}

let keyCounter = 0;
export const newSplitPart = (envelopeId: string, categoryId: string, amountStr = ''): SplitPart => ({
  key: `part-${Date.now()}-${keyCounter++}`,
  envelopeId,
  categoryId,
  amountStr,
});

export const SplitEditor: React.FC<SplitEditorProps> = ({ parts, onChange, total, currency, envelopes, categories }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const unallocated = getUnallocated(total, parts.map(p => parseAmount(p.amountStr)));
  const update = (key: string, patch: Partial<SplitPart>) =>
    onChange(parts.map(p => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <View style={styles.container}>
      {parts.map((part, i) => (
        <View key={part.key} style={styles.part}>
          <View style={styles.partHeader}>
            <Text style={styles.partTitle}>{t('split.part', { n: i + 1 })}</Text>
            {parts.length > 2 && (
              <TouchableOpacity onPress={() => onChange(parts.filter(p => p.key !== part.key))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X color={colors.secondaryText} size={18} />
              </TouchableOpacity>
            )}
          </View>
          <Dropdown
            label={t('split.envelope')}
            options={envelopes.map(e => ({ label: e.name, value: e.id }))}
            value={part.envelopeId}
            onSelect={(v) => update(part.key, { envelopeId: v })}
          />
          <Dropdown
            label={t('common.category')}
            options={categories.map(c => ({ label: c.name, value: c.id }))}
            value={part.categoryId}
            onSelect={(v) => update(part.key, { categoryId: v })}
            placeholder={t('tx.selectCategory')}
          />
          <TextInput
            style={styles.input}
            value={part.amountStr}
            onChangeText={(v) => update(part.key, { amountStr: v.replace(/[^0-9.]/g, '') })}
            placeholder={t('common.amount')}
            placeholderTextColor={colors.secondaryText}
            keyboardType="numeric"
          />
        </View>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          const amounts = splitEqually(total, parts.length);
          onChange(parts.map((p, i) => ({ ...p, amountStr: toInputString(amounts[i]) })));
        }}
        disabled={total <= 0}
      >
        <Equal color={colors.secondaryText} size={16} />
        <Text style={styles.addText}>{t('split.equal')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addBtn} onPress={() => onChange([...parts, newSplitPart(parts[0]?.envelopeId ?? '', '')])}>
        <Plus color={colors.secondaryText} size={16} />
        <Text style={styles.addText}>{t('split.addPart')}</Text>
      </TouchableOpacity>

      <Text style={[styles.remaining, unallocated !== 0 && { color: colors.red }]}>
        {unallocated === 0
          ? t('split.balanced')
          : unallocated > 0
          ? t('split.missing', { amount: formatCurrency(unallocated, currency) })
          : t('split.over', { amount: formatCurrency(-unallocated, currency) })}
      </Text>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginBottom: 16 },
  part: { backgroundColor: colors.cardBg, borderRadius: 14, padding: 14, marginBottom: 12 },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  partTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
  input: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, color: colors.white, fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addText: { color: colors.secondaryText, fontSize: 14, fontWeight: '600' },
  remaining: { color: colors.green, fontSize: 14, fontWeight: '600', marginTop: 4 },
});

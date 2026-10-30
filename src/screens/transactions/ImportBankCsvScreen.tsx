import React, { useMemo, useState } from 'react';
import { HelpButton } from '../../components/feedback/HelpButton';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileText from 'lucide-react-native/icons/file-text';
import { useAppData } from '../../context/ExpenseContext';
import { RootStackParamList } from '../../navigation/types';
import { Dropdown } from '../../components/forms/Dropdown';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { sortEnvelopesByTypeAndName } from '../../domain/budget/envelopeSorting';
import { ColumnMapping, CsvTable, guessMapping, isDuplicate, mapRows, parseCsv } from '../../domain/transactions/bankCsv';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportBankCsv'>;

export const ImportBankCsvScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopes, transactions, categories, incomeCategories, paymentMethods, addTransactions, formatAmount } = useAppData();

  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: -1, description: -1, amount: -1 });
  const [envelopeId, setEnvelopeId] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [incomeCategoryId, setIncomeCategoryId] = useState(incomeCategories[0]?.id ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [invertSigns, setInvertSigns] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const targets = useMemo(() => sortEnvelopesByTypeAndName(envelopes.filter(e => e.type !== 'deuda')), [envelopes]);
  const envelope = envelopes.find(e => e.id === envelopeId);

  const pickFile = async () => {
    setError('');
    setImportedCount(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const parsed = parseCsv(await readAsStringAsync(asset.uri));
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError(t('bankCsv.errorEmpty'));
        return;
      }
      setFileName(asset.name);
      setTable(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch {
      setError(t('bankCsv.errorRead'));
    }
  };

  const columnOptions = (table?.headers ?? []).map((h, i) => ({ label: h || `#${i + 1}`, value: String(i) }));
  const mappingReady = mapping.date >= 0 && mapping.description >= 0 && mapping.amount >= 0;

  const plan = useMemo(() => {
    if (!table || !mappingReady || !envelopeId) return null;
    const { rows, skipped } = mapRows(table, mapping);
    const toAdd = [];
    let duplicates = 0;
    for (const row of rows) {
      const signed = invertSigns ? -row.amount : row.amount;
      const type = signed < 0 ? ('expense' as const) : ('income' as const);
      if (isDuplicate(row, type, envelopeId, transactions)) { duplicates++; continue; }
      toAdd.push({ row, type, amount: Math.abs(signed) });
    }
    const totalIn = toAdd.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
    const totalOut = toAdd.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
    return { toAdd, skipped, duplicates, totalIn, totalOut };
  }, [table, mapping, mappingReady, envelopeId, invertSigns, transactions]);

  const handleImport = async () => {
    if (!plan || plan.toAdd.length === 0) return;
    await addTransactions(
      plan.toAdd.map(({ row, type, amount }) => ({
        envelopeId,
        type,
        amount,
        description: row.description || t(type === 'expense' ? 'tx.expense' : 'tx.income'),
        date: row.date,
        categoryId: (type === 'expense' ? categoryId : incomeCategoryId) || undefined,
        paymentMethodId: type === 'expense' ? paymentMethodId || undefined : undefined,
      }))
    );
    setImportedCount(plan.toAdd.length);
    setTable(null);
    setFileName('');
  };

  const setCol = (key: keyof ColumnMapping) => (value: string) => setMapping(m => ({ ...m, [key]: parseInt(value, 10) }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bankCsv.title')}</Text>
        <HelpButton title="help.bankCsv.title" body="help.bankCsv.body" />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.hint}>{t('bankCsv.hint')}</Text>

        <TouchableOpacity style={styles.pickBtn} onPress={pickFile} activeOpacity={0.8}>
          <FileText color={colors.white} size={20} />
          <Text style={styles.pickText}>{fileName || t('bankCsv.pick')}</Text>
        </TouchableOpacity>

        {importedCount !== null ? <Text style={styles.success}>{t('bankCsv.done', { count: importedCount })}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {table ? (
          <>
            <Dropdown label={t('bankCsv.colDate')} options={columnOptions} value={mapping.date >= 0 ? String(mapping.date) : ''} onSelect={setCol('date')} placeholder={t('bankCsv.selectColumn')} />
            <Dropdown label={t('bankCsv.colDescription')} options={columnOptions} value={mapping.description >= 0 ? String(mapping.description) : ''} onSelect={setCol('description')} placeholder={t('bankCsv.selectColumn')} />
            <Dropdown label={t('bankCsv.colAmount')} options={columnOptions} value={mapping.amount >= 0 ? String(mapping.amount) : ''} onSelect={setCol('amount')} placeholder={t('bankCsv.selectColumn')} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: SPACING.md }}>
                <Text style={styles.toggleLabel}>{t('bankCsv.invert')}</Text>
                <Text style={styles.toggleHint}>{t('bankCsv.invertHint')}</Text>
              </View>
              <Switch value={invertSigns} onValueChange={setInvertSigns} trackColor={{ false: colors.cardBg, true: colors.green }} thumbColor={colors.white} />
            </View>

            <Dropdown
              label={t('bankCsv.envelope')}
              options={targets.map(e => ({ label: `${e.name} (${e.currency})`, value: e.id }))}
              value={envelopeId}
              onSelect={setEnvelopeId}
              placeholder={t('bankCsv.selectEnvelope')}
            />
            <Dropdown label={t('bankCsv.expenseCategory')} options={categories.map(c => ({ label: c.name, value: c.id }))} value={categoryId} onSelect={setCategoryId} placeholder={t('tx.selectCategory')} />
            <Dropdown label={t('bankCsv.incomeCategory')} options={incomeCategories.map(c => ({ label: c.name, value: c.id }))} value={incomeCategoryId} onSelect={setIncomeCategoryId} placeholder={t('tx.selectCategory')} />
            <Dropdown label={t('common.paymentMethod')} options={paymentMethods.map(pm => ({ label: pm.name, value: pm.id }))} value={paymentMethodId} onSelect={setPaymentMethodId} placeholder={t('tx.selectMethod')} />

            {plan && envelope ? (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>{t('bankCsv.toImport', { count: plan.toAdd.length })}</Text>
                <Text style={styles.summaryLine}>{t('bankCsv.totalOut', { amount: formatAmount(plan.totalOut, envelope.currency) })}</Text>
                <Text style={styles.summaryLine}>{t('bankCsv.totalIn', { amount: formatAmount(plan.totalIn, envelope.currency) })}</Text>
                {plan.duplicates > 0 ? <Text style={styles.summaryLine}>{t('bankCsv.duplicates', { count: plan.duplicates })}</Text> : null}
                {plan.skipped > 0 ? <Text style={styles.summaryLine}>{t('bankCsv.skipped', { count: plan.skipped })}</Text> : null}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.importBtn, (!plan || plan.toAdd.length === 0) && { opacity: 0.4 }]}
              disabled={!plan || plan.toAdd.length === 0}
              onPress={handleImport}
              activeOpacity={0.8}
            >
              <Text style={styles.importText}>{t('bankCsv.import')}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  form: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  hint: { color: colors.secondaryText, fontSize: FONT_SIZE.sm, marginBottom: SPACING.lg },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.xl },
  pickText: { color: colors.white, fontSize: FONT_SIZE.base, fontWeight: '600', flex: 1 },
  success: { color: colors.green, fontSize: FONT_SIZE.md, marginBottom: SPACING.lg },
  errorText: { color: colors.red, fontSize: FONT_SIZE.md, marginBottom: SPACING.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  toggleLabel: { color: colors.white, fontSize: FONT_SIZE.base },
  toggleHint: { color: colors.secondaryText, fontSize: FONT_SIZE.xs, marginTop: SPACING.xxs },
  summary: { backgroundColor: colors.cardBg, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.xs },
  summaryTitle: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xs },
  summaryLine: { color: colors.secondaryText, fontSize: FONT_SIZE.md },
  importBtn: { backgroundColor: colors.green, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center' },
  importText: { color: colors.onAccent, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});

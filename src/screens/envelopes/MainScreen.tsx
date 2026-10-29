import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList, Dimensions, Modal } from 'react-native';
import Animated, {
  FadeInDown, FadeOut, interpolate, interpolateColor, Extrapolation,
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, SharedValue,
} from 'react-native-reanimated';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../../context/ExpenseContext';
import { EnvelopeType, Currency, Envelope } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import Settings from 'lucide-react-native/icons/settings';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Coins from 'lucide-react-native/icons/coins';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import Repeat from 'lucide-react-native/icons/repeat';
import { EnvelopeAvatar } from '../../components/envelope/EnvelopeAvatar';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { HelpButton } from '../../components/feedback/HelpButton';
import { FirstStepsCard } from '../../components/onboarding/FirstStepsCard';
import { useFirstSteps } from '../../components/onboarding/useFirstSteps';
import { FirstStepId } from '../../domain/onboarding/firstSteps';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../i18n';
import { SummaryCard } from '../../components/envelope/SummaryCard';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';
import { MENU_ENTERING } from '../../components/feedback/menuMotion';
import { hapticLight, hapticSelection } from '../../services/device/haptics';

const { width } = Dimensions.get('window');

const TAB_TYPES: EnvelopeType[] = ['gasto', 'ahorro', 'deuda'];
const TAB_LABELS: Record<EnvelopeType, TranslationKey> = { gasto: 'main.tabExpenses', ahorro: 'main.tabSavings', deuda: 'main.tabDebts' };

/** Tab text that cross-fades between the inactive and active color as the pager scrolls (UI thread). */
const TabLabel: React.FC<{ label: string; index: number; scrollX: SharedValue<number> }> = ({ label, index, scrollX }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      scrollX.value,
      [width * (index - 1), width * index, width * (index + 1)],
      [colors.secondaryText, colors.bg, colors.secondaryText],
    ),
  }));
  return <Animated.Text style={[styles.tabText, animatedStyle]}>{label}</Animated.Text>;
};

interface EnvelopeCardProps {
  envelope: Envelope;
  remaining: number;
  textColor: string;
  progress: number;
  progressColor: string;
  subtext: string;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
  formatAmount: (amount: number, currency: Currency) => string;
}

/** Fades/slides in on mount (staggered by list position), fades out on removal and squishes slightly on press; long press lifts it to reorder. */
const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  envelope, remaining, textColor, progress, progressColor, subtext, index, onPress, onLongPress, formatAmount,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); };

  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 45)}
      exiting={FadeOut.duration(180)}
    >
      <Animated.View style={pressStyle}>
      <Pressable
        style={styles.envelopeCard}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={{ marginRight: SPACING.lg }}>
          <EnvelopeAvatar
            icon={envelope.icon ?? 'box'}
            imageUri={envelope.imageUri}
            color={envelope.color}
            size={52}
            progress={progress}
            progressColor={progressColor}
            iconColor={envelope.color}
          />
        </View>
        <Text style={styles.envelopeName} numberOfLines={1}>{envelope.name}</Text>
        <View style={styles.envelopeValues}>
          <Text style={[styles.envelopeAmount, { color: textColor }]}>
            {formatAmount(Math.abs(remaining), envelope.currency)}
          </Text>
          <Text style={styles.envelopeSubtext}>{subtext}</Text>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const EMPTY_MESSAGES = {
  gasto: 'main.emptyExpenses',
  ahorro: 'main.emptySavings',
  deuda: 'main.emptyDebts',
} as const;

export const MainScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { envelopes, getTotalsByType, getEnvelopeBalance, formatAmount, settings, resetAllEnvelopes, reorderEnvelopes, paymentMethods, categories, transactions } = useAppData();
  const [activeTab, setActiveTab] = useState<EnvelopeType>('gasto');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // The pager must not scroll sideways while an envelope is being dragged.
  const [dragging, setDragging] = useState(false);
  const firstSteps = useFirstSteps();
  const { refresh: refreshFirstSteps } = firstSteps;

  useEffect(() => navigation.addListener('focus', () => { refreshFirstSteps(); }), [navigation, refreshFirstSteps]);

  const handleFirstStep = (id: FirstStepId) => {
    const firstEnvelope = envelopes[0];
    switch (id) {
      case 'createEnvelope': return navigation.navigate('CreateEnvelope', { envelopeType: activeTab });
      case 'assignIncome': return navigation.navigate('AssignIncome');
      // Needs an envelope to record into, so send the user to create one first.
      case 'firstExpense': return firstEnvelope
        ? navigation.navigate('CreateTransaction', { envelopeId: firstEnvelope.id })
        : navigation.navigate('CreateEnvelope', { envelopeType: 'gasto' });
      case 'transfer': return navigation.navigate('CreateTransfer');
      case 'backup': return navigation.navigate('BackupSettings');
    }
  };

  const scrollX = useSharedValue(0);
  const listRef = useRef<FlatList<EnvelopeType>>(null);

  const handleTabPress = (tab: EnvelopeType) => {
    const index = TAB_TYPES.indexOf(tab);
    if (tab !== activeTab) hapticSelection();
    setActiveTab(tab);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  const onMomentumScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    const next = TAB_TYPES[index] ?? TAB_TYPES[0];
    if (next !== activeTab) hapticSelection();
    setActiveTab(next);
  };

  const onScrollEndDrag = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== TAB_TYPES.indexOf(activeTab)) {
      setActiveTab(TAB_TYPES[index] ?? TAB_TYPES[0]);
    }
  };

  const totals = getTotalsByType(activeTab);
  // An empty tab still shows a zero total in the default currency.
  const shownTotals = totals.length > 0 ? totals : [{ currency: settings.defaultCurrency, total: 0 }];
  const anyExceeded = shownTotals.some(entry => entry.total < 0);

  const renderEnvelope = ({ item, getIndex, drag }: RenderItemParams<Envelope>) => {
    const balance = getEnvelopeBalance(item.id);
    const type = item.type;

    // Balance available logic
    let remaining = balance;
    if (type === 'gasto') remaining = item.limit + balance;
    else if (type === 'deuda') remaining = item.limit - balance;
    const isOver = (type === 'gasto' || type === 'deuda') && !item.isUnlimited && remaining < 0;

    // 1. Balance Text Color
    let textColor = colors.white;
    if (remaining < 0) {
      textColor = colors.red;
    } else if (type === 'gasto' && remaining > 0) {
      textColor = colors.green;
    } else {
      textColor = colors.white;
    }

    // 2. Progress Circle Logic
    let progress = 0;
    let progressColor = colors.green;

    if (type === 'gasto') {
      if (item.isUnlimited) {
        progress = 1;
        progressColor = colors.blue;
      } else {
        // Spent / Limit
        const spent = -balance;
        progress = Math.max(0, spent / item.limit);
        progressColor = remaining < 0 ? colors.red : colors.green;
      }
    } else if (type === 'deuda') {
      if (item.isUnlimited) {
        progress = 1;
        progressColor = colors.blue;
      } else {
        // Progress fills as the debt is paid down (same direction as ahorro)
        progress = item.limit > 0 ? balance / item.limit : 1;
        progressColor = remaining < 0 ? colors.red : colors.green;
      }
    } else {
      // Savings
      progress = item.limit > 0 ? balance / item.limit : 1;
      progressColor = colors.green;
    }

    const subtext =
      type === 'gasto'
        ? t(item.isUnlimited ? 'main.spent' : (isOver ? 'main.exceeded' : 'main.available'))
        : type === 'deuda'
        ? t(item.isUnlimited ? 'main.owed' : (isOver ? 'main.debtExceeded' : 'main.remainingToPay'))
        : t('main.saved');

    return (
      <ScaleDecorator activeScale={1.04}>
      <EnvelopeCard
        envelope={item}
        remaining={remaining}
        textColor={textColor}
        progress={progress}
        progressColor={progressColor}
        subtext={subtext}
        index={getIndex() ?? 0}
        onPress={() => navigation.navigate('EnvelopeDetail', { envelopeId: item.id })}
        onLongPress={() => { hapticLight(); setDragging(true); drag(); }}
        formatAmount={formatAmount}
      />
      </ScaleDecorator>
    );
  };

  const renderSection = (type: EnvelopeType) => {
    const data = envelopes.filter(e => e.type === type);
    return (
      <View style={{ width, flex: 1 }}>
        <DraggableFlatList
          data={data}
          onDragEnd={({ data: reordered }) => {
            setDragging(false);
            reorderEnvelopes(type, reordered.map(e => e.id));
          }}
          onRelease={() => setDragging(false)}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={firstSteps.state ? (
            <FirstStepsCard
              progress={firstSteps.progress}
              state={firstSteps.state}
              onStepPress={handleFirstStep}
              onStateChange={firstSteps.changeState}
            />
          ) : null}
          ListEmptyComponent={
            <EmptyState
              message={t(EMPTY_MESSAGES[type])}
            />
          }
          renderItem={renderEnvelope}
        />
      </View>
    );
  };

  const indicatorWidth = (width - 40 - 8) / TAB_TYPES.length;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(
        scrollX.value,
        [0, width * (TAB_TYPES.length - 1)],
        [0, indicatorWidth * (TAB_TYPES.length - 1)],
        Extrapolation.CLAMP,
      ),
    }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmDialog
        visible={showResetConfirm}
        onConfirm={async () => { await resetAllEnvelopes(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)}
        title={t('main.resetAllTitle')}
        message={t('main.resetAllMessage')}
        confirmLabel={t('main.resetAllConfirm')}
        destructive
      />

      <View style={styles.header}>
        <Text style={styles.title}>TRACE</Text>
        <View style={{ flexDirection: 'row' }}>
          <HelpButton style={styles.iconBtn} title="help.main.title" body="help.main.body" />
          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => navigation.navigate('AssignIncome')} accessibilityRole="button" accessibilityLabel={t('a11y.assignIncome')}>
            <Coins color={colors.secondaryText} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => navigation.navigate('Search')} accessibilityRole="button" accessibilityLabel={t('search.title')}>
            <Search color={colors.secondaryText} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setMenuVisible(true)} accessibilityRole="button" accessibilityLabel={t('a11y.moreOptions')}>
            <MoreVertical color={colors.secondaryText} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)} accessibilityLabel={t('a11y.back')}>
          <Animated.View entering={MENU_ENTERING} style={styles.menu}>
            {([
              ['Reports', BarChart3, 'settings.reports'],
              ['Recurring', Repeat, 'settings.recurring'],
              ['Settings', Settings, 'settings.title'],
            ] as const).map(([route, Icon, label]) => (
              <TouchableOpacity
                key={route}
                style={styles.menuItem}
                onPress={() => { setMenuVisible(false); navigation.navigate(route); }}
                accessibilityRole="button"
                accessibilityLabel={t(label)}
              >
                <Icon color={colors.secondaryText} size={20} />
                <Text style={styles.menuText}>{t(label)}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      <View style={styles.tabContainer}>
        <Animated.View style={[styles.tabIndicator, { width: indicatorWidth }, indicatorStyle]} />
        {TAB_TYPES.map((tab, index) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => handleTabPress(tab)}>
            <TabLabel label={t(TAB_LABELS[tab])} index={index} scrollX={scrollX} />
          </TouchableOpacity>
        ))}
      </View>

      <SummaryCard
        type={activeTab}
        label={
          activeTab === 'gasto'
            ? t(anyExceeded ? 'main.totalExceeded' : 'main.totalAvailable')
            : activeTab === 'deuda'
            ? t('main.totalToPay')
            : t('main.totalSaved')
        }
        totals={shownTotals}
        envelopes={envelopes}
        getEnvelopeBalance={getEnvelopeBalance}
      />

      <Animated.FlatList
        ref={listRef}
        data={TAB_TYPES}
        horizontal
        pagingEnabled
        scrollEnabled={!dragging}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        keyExtractor={item => item}
        renderItem={({ item }) => renderSection(item)}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEnvelope', { envelopeType: activeTab })}
      >
        <Text style={styles.fabText}>{t('main.createEnvelope')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: 'bold', letterSpacing: 1 },
  iconBtn: { padding: SPACING.sm },
  menuBackdrop: { flex: 1 },
  menu: { position: 'absolute', top: 56, right: SPACING.xl, minWidth: 190, backgroundColor: colors.cardBg, borderRadius: RADIUS.lg, paddingVertical: SPACING.xs, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
  menuText: { color: colors.white, fontSize: FONT_SIZE.lg },
  tabContainer: { flexDirection: 'row', marginHorizontal: SPACING.xl, height: 48, position: 'relative', marginBottom: SPACING.lg, backgroundColor: colors.cardBg, borderRadius: RADIUS.sheet, padding: SPACING.xs },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: colors.green, borderRadius: RADIUS.pill },
  tabText: { color: colors.secondaryText, fontSize: FONT_SIZE.lg, fontWeight: '600' },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 120 },
  emptyText: { color: colors.secondaryText, fontSize: FONT_SIZE.base, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  envelopeCard: { backgroundColor: colors.cardBg, borderRadius: RADIUS.pill, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  envelopeName: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '600' },
  envelopeValues: { alignItems: 'flex-end' },
  envelopeAmount: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', marginBottom: SPACING.xxs },
  envelopeSubtext: { color: colors.secondaryText, fontSize: FONT_SIZE.sm },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: colors.green, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxl, borderRadius: 30 },
  fabText: { color: colors.bg, fontSize: FONT_SIZE.lg, fontWeight: 'bold' },
});

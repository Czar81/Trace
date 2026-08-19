import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Check } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AppearanceSettings'>;

export const AppearanceSettingsScreen = ({ navigation }: Props) => {
  const { colors, themeId, themeList, setThemeId } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apariencia</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Elegí un tema</Text>

        {themeList.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <TouchableOpacity
              key={theme.id}
              style={[styles.themeCard, selected && styles.themeCardSelected]}
              onPress={() => setThemeId(theme.id)}
              activeOpacity={0.8}
            >
              <View style={styles.swatch}>
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.bg }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.cardBg }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.green }]} />
                <View style={[styles.swatchDot, { backgroundColor: theme.colors.blue }]} />
              </View>
              <View style={styles.themeTextWrapper}>
                <Text style={styles.themeName}>{theme.name}</Text>
                <Text style={styles.themeSubtitle}>{theme.isLight ? 'Claro' : 'Oscuro'}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Check color={colors.bg} size={12} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  themeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: colors.divider },
  themeCardSelected: { borderColor: colors.green },
  swatch: { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', marginRight: 14 },
  swatchDot: { width: 17, height: 17 },
  themeTextWrapper: { flex: 1 },
  themeName: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  themeSubtitle: { color: colors.secondaryText, fontSize: 13 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.secondaryText, justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: colors.green, backgroundColor: colors.green },
});

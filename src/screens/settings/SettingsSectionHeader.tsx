import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
}

/** Small icon + uppercase label that opens each group in Settings. */
export const SettingsSectionHeader = ({ icon, title, danger }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12, paddingHorizontal: 4 }} accessibilityRole="header">
      {icon}
      <Text style={{ color: danger ? colors.red : colors.secondaryText, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </Text>
    </View>
  );
};

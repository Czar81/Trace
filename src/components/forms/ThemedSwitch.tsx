import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Switch in the theme's colors. The off track uses progressTrack (not cardBg, which vanishes on the cards most switches
 * sit on) and the thumb stays white in every theme so it never blends into the green "on" track.
 */
export const ThemedSwitch: React.FC<Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>> = props => {
  const { colors } = useTheme();
  return (
    <Switch
      {...props}
      trackColor={{ false: colors.progressTrack, true: colors.green }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.progressTrack}
    />
  );
};

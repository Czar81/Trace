import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { EnvelopeIcon } from './EnvelopeIcon';
import { useTheme } from '../context/ThemeContext';

// Darkens a hex color by a fraction (0-1) to build the gradient's deep stop
// without requiring callers to pass a second color.
function darkenColor(hex: string, amount: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return hex;
  const num = parseInt(match[1], 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

interface EnvelopeAvatarProps {
  icon: string;
  imageUri?: string;
  color: string;
  size?: number;
  borderRadius?: number;
  progress?: number; // 0 to 1
  progressColor?: string;
  iconColor?: string; // Color for the icon (separate from progress color)
}

export const EnvelopeAvatar: React.FC<EnvelopeAvatarProps> = ({
  icon,
  imageUri,
  color,
  size = 48,
  borderRadius = 16,
  progress = 0,
  progressColor: progressColorProp,
  iconColor = color, // Default to envelope color
}) => {
  const { colors } = useTheme();
  const progressColor = progressColorProp ?? colors.green;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(progress, 0), 1)) * circumference;
  const gradientId = useMemo(() => `progressGradient-${Math.random().toString(36).slice(2)}`, []);
  const gradientDeepColor = useMemo(() => darkenColor(progressColor, 0.25), [progressColor]);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={progressColor} />
            <Stop offset="100%" stopColor={gradientDeepColor} />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressTrack}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View
        style={[
          styles.contentWrapper,
          {
            width: size - strokeWidth * 4,
            height: size - strokeWidth * 4,
            borderRadius: borderRadius - 4,
            backgroundColor: 'transparent',
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%', borderRadius: borderRadius - 4 }}
          />
        ) : (
          <EnvelopeIcon name={icon} size={(size - strokeWidth * 4) * 0.6} color={iconColor} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
  contentWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

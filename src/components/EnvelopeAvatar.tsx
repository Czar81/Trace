import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { EnvelopeIcon } from './EnvelopeIcon';

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
  progressColor = '#A7E7B4',
  iconColor = color, // Default to envelope color
}) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(progress, 0), 1)) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3A5564"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
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


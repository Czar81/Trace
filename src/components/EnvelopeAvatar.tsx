import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { EnvelopeIcon, IconName } from './EnvelopeIcon';

interface EnvelopeAvatarProps {
  icon: string;
  imageUri?: string;
  color: string;
  size?: number;
  borderRadius?: number;
}

export const EnvelopeAvatar: React.FC<EnvelopeAvatarProps> = ({
  icon,
  imageUri,
  color,
  size = 48,
  borderRadius = 16,
}) => {
  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius, borderColor: color },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.iconWrapper,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: color,
          backgroundColor: color + '18',
        },
      ]}
    >
      <EnvelopeIcon name={icon} size={size * 0.5} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    borderWidth: 1.5,
  },
  iconWrapper: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

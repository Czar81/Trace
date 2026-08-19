import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const OVERLAY = 'rgba(0,0,0,0.65)';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const confirmScale = useSharedValue(1);
  const confirmAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmScale.value }],
  }));

  const handleConfirmPress = () => {
    if (destructive) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // Haptics unavailable on this platform/device — proceed silently.
      }
      confirmScale.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
    }
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Scrim */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel} />

      {/* Dialog card */}
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.divider} />

          <View style={styles.actions}>
            {cancelLabel ? (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>

                <View style={styles.actionDivider} />
              </>
            ) : null}

            <Animated.View style={[styles.confirmBtn, !cancelLabel && styles.singleActionBtn, confirmAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.confirmBtnInner, destructive && styles.confirmBtnDestructive]}
                onPress={handleConfirmPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: OVERLAY,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  message: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  actions: {
    flexDirection: 'row',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  confirmBtn: {
    flex: 1,
  },
  confirmBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  singleActionBtn: {
    flex: 1,
  },
  confirmBtnDestructive: {},
  confirmText: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmTextDestructive: {
    color: colors.red,
  },
});

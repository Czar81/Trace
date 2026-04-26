import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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

const COLORS = {
  overlay: 'rgba(0,0,0,0.65)',
  bg: '#0d2e42',
  card: '#1F3A47',
  white: '#FFFFFF',
  secondaryText: '#A6B9C7',
  red: '#E55B5B',
  green: '#A7E7B4',
  divider: '#142E3D',
};

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
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  message: {
    color: COLORS.secondaryText,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
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
    color: COLORS.secondaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  actionDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDestructive: {},
  confirmText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmTextDestructive: {
    color: COLORS.red,
  },
});

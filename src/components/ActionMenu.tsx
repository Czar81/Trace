import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  items: ActionMenuItem[];
  onClose: () => void;
}

const OVERLAY = 'rgba(0,0,0,0.4)';

export const ActionMenu: React.FC<ActionMenuProps> = ({ visible, items, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.popup}>
        {items.map((item, index) => (
          <View key={index}>
            <TouchableOpacity
              style={styles.itemBtn}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Text style={[styles.itemText, item.destructive && { color: colors.red }]}>
                {item.label}
              </Text>
              {item.icon && <View style={styles.iconWrap}>{item.icon}</View>}
            </TouchableOpacity>
            {index < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  popup: {
    position: 'absolute',
    top: 60,
    right: 20,
    minWidth: 200,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  itemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  itemText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  iconWrap: { marginLeft: 16 },
  divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },
});

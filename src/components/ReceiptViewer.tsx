import React, { useMemo } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface ReceiptViewerProps {
  uri: string | null;
  onClose: () => void;
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ uri, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X color={colors.white} size={26} />
        </TouchableOpacity>
        <View style={styles.imageWrap}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  close: { alignSelf: 'flex-end', padding: 16 },
  imageWrap: { flex: 1 },
  image: { flex: 1, width: '100%' },
});

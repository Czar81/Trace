import React, { useMemo, useState } from 'react';
import { Modal, View, Image, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface ReceiptViewerProps {
  /** Photos to page through; the viewer is closed when empty. */
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ uris, initialIndex = 0, onClose }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [index, setIndex] = useState(initialIndex);

  return (
    <Modal visible={uris.length > 0} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
          {uris.length > 1 ? <Text style={styles.counter}>{Math.min(index + 1, uris.length)} / {uris.length}</Text> : <View />}
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X color={colors.white} size={26} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {uris.map(uri => (
            <Image key={uri} source={{ uri }} style={{ width, height: '100%' }} resizeMode="contain" />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  counter: { color: colors.white, fontSize: 15, fontWeight: '600' },
});

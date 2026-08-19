import React, { useMemo } from 'react';
import { Modal, View, SectionList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { EnvelopeIcon, CATEGORIZED_ICONS, IconName } from './EnvelopeIcon';
import { Check, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface IconPickerProps {
  visible: boolean;
  selectedIcon: string;
  selectedImageUri?: string;
  color: string;
  onSelectIcon: (icon: IconName) => void;
  onSelectImage: (uri: string) => void;
  onClose: () => void;
}

const OVERLAY = 'rgba(0,0,0,0.65)';

export const IconPicker: React.FC<IconPickerProps> = ({ visible, selectedIcon, selectedImageUri, color, onSelectIcon, onSelectImage, onClose }) => {
  const { colors, isLight } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onSelectImage(result.assets[0].uri);
      onClose();
    }
  };

  const sections = CATEGORIZED_ICONS.map(cat => ({
    title: cat.title,
    data: chunk(cat.icons, 6)
  }));

  function chunk(array: any[], size: number) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Iconos</Text>

        <TouchableOpacity style={styles.pickImageBtn} onPress={handlePickImage}>
          <ImageIcon color={colors.white} size={20} />
          <Text style={styles.pickImageText}>Subir imagen propia</Text>
        </TouchableOpacity>

        <SectionList
          sections={sections}
          keyExtractor={(item, index) => index.toString()}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item: iconRow }) => (
            <View style={styles.iconRow}>
              {iconRow.map((item: string) => {
                const isSelected = item === selectedIcon && !selectedImageUri;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.iconBtn, isSelected && { backgroundColor: color + '30', borderColor: color }]}
                    onPress={() => { onSelectIcon(item as IconName); onClose(); }}
                  >
                    <View style={styles.iconCircle}>
                      <EnvelopeIcon
                        name={item}
                        size={24}
                        color={isSelected ? color : colors.white}
                      />
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: color }]}>
                        <Check size={8} color={isLight ? '#FFFFFF' : '#092230'} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Fill empty spaces in the row to maintain alignment if row is not full */}
              {[...Array(6 - iconRow.length)].map((_, i) => (
                <View key={`empty-${i}`} style={styles.iconBtn} />
              ))}
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.modalSheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, backgroundColor: colors.divider, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  title: { color: colors.white, fontSize: 17, fontWeight: '700', textAlign: 'center', paddingVertical: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionHeader: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 16 },
  iconRow: { flexDirection: 'row', marginBottom: 8 },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  pickImageText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  iconBtn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

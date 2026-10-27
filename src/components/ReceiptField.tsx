import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { ReceiptViewer } from './ReceiptViewer';
import { saveReceiptImage } from '../utils/receipts';

interface ReceiptFieldProps {
  /** URI of the stored receipt, if any. */
  value?: string;
  /** Called with the stored URI of a new image, or undefined when removed. */
  onChange: (uri: string | undefined) => void;
}

export const ReceiptField: React.FC<ReceiptFieldProps> = ({ value, onChange }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [viewing, setViewing] = useState(false);

  const handleResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    onChange(await saveReceiptImage(result.assets[0].uri));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('receipt.cameraDenied'));
      return;
    }
    await handleResult(await ImagePicker.launchCameraAsync({ quality: 0.6 }));
  };

  const pickFromGallery = async () => {
    await handleResult(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('receipt.label')}</Text>
      {value ? (
        <View style={styles.previewRow}>
          <TouchableOpacity onPress={() => setViewing(true)} activeOpacity={0.8}>
            <Image source={{ uri: value }} style={styles.thumb} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={() => onChange(undefined)}>
            <Trash2 color={colors.red} size={18} />
            <Text style={styles.removeText}>{t('receipt.remove')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btn} onPress={takePhoto} activeOpacity={0.8}>
            <Camera color={colors.white} size={18} />
            <Text style={styles.btnText}>{t('receipt.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={pickFromGallery} activeOpacity={0.8}>
            <ImageIcon color={colors.white} size={18} />
            <Text style={styles.btnText}>{t('receipt.gallery')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ReceiptViewer uri={viewing ? value ?? null : null} onClose={() => setViewing(false)} />
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginBottom: 24 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cardBg, borderRadius: 12, paddingVertical: 14 },
  btnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.cardBg },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeText: { color: colors.red, fontSize: 14, fontWeight: '600' },
});

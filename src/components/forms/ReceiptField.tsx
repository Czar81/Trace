import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useTranslation } from '../../context/LanguageContext';
import { ReceiptViewer } from '../feedback/ReceiptViewer';
import { saveReceiptImage } from '../../services/files/receipts';
import { FONT_SIZE, RADIUS, SPACING } from '../../theme/tokens';

interface ReceiptFieldProps {
  /** URIs of the stored receipt photos. */
  value: string[];
  onChange: (uris: string[]) => void;
}

export const ReceiptField: React.FC<ReceiptFieldProps> = ({ value, onChange }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [viewing, setViewing] = useState(false);

  const addFrom = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || result.assets.length === 0) return;
    const saved = await Promise.all(result.assets.map(a => saveReceiptImage(a.uri)));
    onChange([...value, ...saved]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('receipt.cameraDenied'));
      return;
    }
    await addFrom(await ImagePicker.launchCameraAsync({ quality: 0.6 }));
  };

  const pickFromGallery = async () => {
    await addFrom(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsMultipleSelection: true,
      })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('receipt.label')}</Text>
      {value.length > 0 ? (
        <View style={styles.thumbs}>
          {value.map(uri => (
            <View key={uri}>
              <TouchableOpacity onPress={() => setViewing(true)} activeOpacity={0.8}>
                <Image source={{ uri }} style={styles.thumb} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => onChange(value.filter(u => u !== uri))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('receipt.remove')}
              >
                <X color={colors.white} size={12} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
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
      <ReceiptViewer uris={viewing ? value : []} onClose={() => setViewing(false)} />
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginBottom: SPACING.xxl },
  label: { color: colors.white, fontSize: FONT_SIZE.lg, fontWeight: '600', marginBottom: SPACING.sm },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  thumb: { width: 76, height: 76, borderRadius: RADIUS.md, backgroundColor: colors.cardBg },
  removeBadge: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: RADIUS.sm, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.cardBg, borderRadius: RADIUS.md, paddingVertical: 14 },
  btnText: { color: colors.white, fontSize: FONT_SIZE.md, fontWeight: '600' },
});

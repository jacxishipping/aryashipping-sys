import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { documentsApi } from '../../api/documents';
import { DocumentCategory } from '../../types/document';
import { TouchableOpacity } from 'react-native';

const categoryOptions: DocumentCategory[] = ['OTHER', 'TITLE', 'INSURANCE', 'BILL_OF_LADING', 'INSPECTION_REPORT'];
const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());
const formatFileSize = (size?: number) => {
  if (!size || size <= 0) {
    return 'Size unavailable';
  }

  if (size < 1024 * 1024) {
    return `${Math.max(size / 1024, 0.1).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  shipmentId?: string;
  onSuccess: () => void;
  defaultCategory?: DocumentCategory;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  onClose,
  shipmentId,
  onSuccess,
  defaultCategory = 'OTHER',
}) => {
  const { colors } = useAppTheme();
  const [selectedUploadAsset, setSelectedUploadAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [isCompanyDocument, setIsCompanyDocument] = useState(false);
  const supportedFormats = useMemo(() => ['PDF', 'Images', 'CSV', 'DOC', 'DOCX'], []);

  const pickUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'image/*',
          'application/pdf',
          'text/csv',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (!result.canceled) {
        setSelectedUploadAsset(result.assets[0]);
      }
    } catch (error: any) {
      Alert.alert('Unable to select file', error?.message || 'The document could not be selected.');
    }
  };

  const handleUpload = async () => {
    if (!selectedUploadAsset) {
      return;
    }

    if (Platform.OS === 'web' && !selectedUploadAsset.file) {
      Alert.alert('Re-select file', 'Please choose the document again so the browser can provide the live file handle for upload.');
      return;
    }

    try {
      setUploading(true);
      const upload = await documentsApi.uploadFile({
        uri: selectedUploadAsset.uri,
        name: selectedUploadAsset.name,
        mimeType: selectedUploadAsset.mimeType,
        file: selectedUploadAsset.file,
      });

      await documentsApi.createDocument({
        name: selectedUploadAsset.name,
        fileUrl: upload.url,
        fileType: selectedUploadAsset.mimeType || 'application/octet-stream',
        fileSize: Math.max(selectedUploadAsset.size || 1, 1),
        category,
        shipmentId,
        isPublic: !isCompanyDocument,
      });

      setSelectedUploadAsset(null);
      setCategory(defaultCategory);
      setIsCompanyDocument(false);
      onSuccess();
      onClose();
      Alert.alert('Upload complete', 'The document was uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'The document could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) {
      return;
    }

    setSelectedUploadAsset(null);
    setCategory(defaultCategory);
    setIsCompanyDocument(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Upload Document"
      subtitle="Choose a category, add one file, and we will attach it to the shipment record."
      showCloseButton={!uploading}
    >
      <View style={styles.container}>
        <View style={[styles.heroCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>One clean upload flow</Text>
          <Text style={[styles.heroCopy, { color: colors.textSecondary }]}>Keep documents discoverable by assigning the right type before you upload.</Text>
          <View style={styles.supportedFormatsRow}>
            {supportedFormats.map((format) => (
              <View key={format} style={[styles.supportedFormatChip, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                <Text style={[styles.supportedFormatText, { color: colors.textSecondary }]}>{format}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Category</Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>This decides where the document is grouped across the app.</Text>
        <View style={styles.filterRow}>
          {categoryOptions.map((option) => {
            const selected = option === category;

            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.filterChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setCategory(option)}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{titleCase(option)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {shipmentId ? (
          <View style={[styles.visibilityRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={styles.visibilityTextWrap}>
              <Text style={[styles.visibilityTitle, { color: colors.textPrimary }]}>Company document</Text>
              <Text style={[styles.visibilityCopy, { color: colors.textSecondary }]}>Hide this document from customer shipment views.</Text>
            </View>
            <Switch
              value={isCompanyDocument}
              onValueChange={setIsCompanyDocument}
              disabled={uploading}
              trackColor={{ false: `${colors.border}`, true: `${colors.accent}55` }}
              thumbColor={isCompanyDocument ? colors.accent : colors.panel}
            />
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.textPrimary, marginTop: Spacing.md }]}>File</Text>
        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Choose one supported file from your device.</Text>

        {selectedUploadAsset ? (
          <View style={[styles.fileCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={2}>{selectedUploadAsset.name}</Text>
            <View style={styles.fileMetaRow}>
              <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>{selectedUploadAsset.mimeType || 'Unknown type'}</Text>
              <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>{formatFileSize(selectedUploadAsset.size)}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No file selected yet</Text>
            <Text style={[styles.emptyStateCopy, { color: colors.textSecondary }]}>Pick a document first, then confirm the upload.</Text>
          </View>
        )}

        <View style={styles.uploadActions}>
          <Button
            title={selectedUploadAsset ? 'Replace File' : 'Choose File'}
            variant="secondary"
            onPress={pickUploadFile}
            disabled={uploading}
            style={styles.uploadButton}
            fullWidth
          />
          <Button
            title={uploading ? 'Uploading...' : 'Upload Document'}
            onPress={handleUpload}
            disabled={!selectedUploadAsset}
            loading={uploading}
            style={styles.uploadButton}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  heroTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  heroCopy: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  supportedFormatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  supportedFormatChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  supportedFormatText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  uploadText: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  fileName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  fileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  uploadMeta: {
    fontSize: Typography.fontSize.xs,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyStateCopy: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  uploadActions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  uploadButton: {
    width: '100%',
  },
  visibilityRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  visibilityTextWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  visibilityTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  visibilityCopy: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
});

import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../../api/documents';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DocumentUploadModal } from './DocumentUploadModal';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { DocumentRecord } from '../../types/document';

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatFileSize = (bytes: number) => {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

interface ShipmentDocumentsCardProps {
  shipmentId: string;
}

export const ShipmentDocumentsCard: React.FC<ShipmentDocumentsCardProps> = ({ shipmentId }) => {
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);

  const documentsQuery = useQuery({
    queryKey: ['shipment-documents', shipmentId],
    queryFn: () => documentsApi.getDocuments({ shipmentId, limit: 50 }),
  });

  const documents = documentsQuery.data?.documents || [];
  const canUpload = isAdmin;

  const visibleSummary = useMemo(
    () => ({
      total: documents.length,
      publicCount: documents.filter((document) => document.isPublic).length,
    }),
    [documents],
  );

  const canDeleteDocument = (_document: DocumentRecord) => isAdmin;

  const refreshDocuments = async () => {
    await documentsQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  const handleDelete = (document: DocumentRecord) => {
    Alert.alert('Delete document', `Remove ${document.name} from this shipment?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(document.id);
            await documentsApi.deleteDocument(document.id);
            await refreshDocuments();
            Alert.alert('Document deleted', 'The shipment document was removed.');
          } catch (error: any) {
            Alert.alert('Unable to delete document', error?.message || 'The shipment document could not be removed.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Documents</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
        {isAdmin
          ? 'Upload shipment paperwork, open existing files, and remove documents when needed.'
          : 'Open and download your shipment documents.'}
      </Text>

      <View style={styles.metricRow}>
        <View style={StyleSheet.flatten([styles.metricChip, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{visibleSummary.total}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
        </View>
        <View style={StyleSheet.flatten([styles.metricChip, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{visibleSummary.publicCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Public</Text>
        </View>
      </View>

      {canUpload ? (
        <View style={styles.uploadSection}>
          <Button title="Upload Document" onPress={() => setUploadModalVisible(true)} />
        </View>
      ) : null}

      <DocumentUploadModal
        visible={isUploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        shipmentId={shipmentId}
        onSuccess={refreshDocuments}
      />

      {documentsQuery.isLoading ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading documents...</Text>
      ) : documents.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shipment documents have been uploaded yet.</Text>
      ) : (
        documents.map((document, index) => (
          <View
            key={document.id}
            style={StyleSheet.flatten([
              styles.documentRow,
              index === documents.length - 1 ? styles.documentRowLast : null,
              { borderBottomColor: colors.border },
            ])}
          >
            <Text style={[styles.documentName, { color: colors.textPrimary }]}>{document.name}</Text>
            <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
              {titleCase(document.category)} • {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
            </Text>
            <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
              {document.user?.name || document.user?.email || document.uploadedBy}
            </Text>
            <View style={styles.documentActions}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
                <Text style={[styles.documentLink, { color: colors.accent }]}>Open / Download</Text>
              </TouchableOpacity>
              {canDeleteDocument(document) ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => handleDelete(document)} disabled={deletingId === document.id}>
                  <Text style={[styles.documentDelete, { color: colors.error }]}>{deletingId === document.id ? 'Deleting...' : 'Delete'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sectionText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
  },
  uploadSection: {
    marginBottom: Spacing.base,
  },
  uploadLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  uploadMeta: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  uploadButton: {
    flex: 1,
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
  emptyText: {
    fontSize: Typography.fontSize.sm,
  },
  documentRow: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  documentRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  documentName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  documentMeta: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  documentActions: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.sm,
  },
  documentLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  documentDelete: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
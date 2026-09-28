import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateField } from '../ui/DateField';
import { financeApi } from '../../api/finance';
import { CompanyLedgerEntry } from '../../types/admin';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface LedgerEntryEditModalProps {
  visible: boolean;
  entry: CompanyLedgerEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

const typeOptions = [
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' },
] as const;

export const LedgerEntryEditModal: React.FC<LedgerEntryEditModalProps> = ({ visible, entry, onClose, onSaved }) => {
  const { colors } = useAppTheme();
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [category, setCategory] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) {
      return;
    }

    setDescription(entry.description || '');
    setType(entry.type);
    setAmount(typeof entry.amount === 'number' ? String(entry.amount) : '');
    setTransactionDate(entry.transactionDate ? String(entry.transactionDate).slice(0, 10) : '');
    setCategory(entry.category || '');
    setReference(entry.reference || '');
    setNotes(entry.notes || '');
  }, [entry]);

  const handleClose = () => {
    if (saving) {
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    if (!entry) {
      return;
    }

    if (!description.trim()) {
      Alert.alert('Enter a description', 'Description is required for this ledger entry.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter a valid amount', 'Amount must be a positive number.');
      return;
    }

    try {
      setSaving(true);
      await financeApi.updateCompanyLedgerEntry(entry.id, {
        description: description.trim(),
        type,
        amount: parsedAmount,
        transactionDate: transactionDate || undefined,
        category: category.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
      Alert.alert('Entry updated', 'The company ledger entry was updated and balances were recalculated.');
    } catch (error: any) {
      Alert.alert('Unable to update entry', error?.message || 'The ledger entry could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Edit Ledger Entry"
      subtitle="Updates the company ledger transaction. Amount and type changes recalculate balances on the server."
      showCloseButton={!saving}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input label="Description *" value={description} onChangeText={setDescription} placeholder="What this entry covers" />

        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Type</Text>
        <View style={styles.filterRow}>
          {typeOptions.map((option) => {
            const selected = option.value === type;

            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.filterChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setType(option.value)}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Amount (USD) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <DateField label="Transaction Date" value={transactionDate} onChange={setTransactionDate} placeholder="Select date" />

        <Input label="Category" value={category} onChangeText={setCategory} placeholder="Optional category" autoCapitalize="words" />

        <Input label="Reference" value={reference} onChangeText={setReference} placeholder="Optional reference code" />

        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />

        <View style={styles.actions}>
          <Button title="Cancel" variant="secondary" onPress={handleClose} disabled={saving} fullWidth />
          <Button title="Save Changes" onPress={handleSave} loading={saving} fullWidth />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
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
  actions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});

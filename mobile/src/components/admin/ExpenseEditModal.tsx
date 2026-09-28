import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateField } from '../ui/DateField';
import { containersApi } from '../../api/containers';
import { transitsApi } from '../../api/transits';
import { dispatchesApi } from '../../api/dispatches';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

export interface EditableExpense {
  id: string;
  type?: string | null;
  description?: string | null;
  amount: number;
  currency?: string | null;
  date: string;
  vendor?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  category?: string | null;
}

interface ExpenseEditModalProps {
  visible: boolean;
  kind: 'container' | 'transit' | 'dispatch';
  entityId: string;
  expense: EditableExpense | null;
  onClose: () => void;
  onSaved: () => void;
}

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const entityLabel = (kind: ExpenseEditModalProps['kind']) => {
  if (kind === 'container') {
    return 'Container';
  }
  if (kind === 'transit') {
    return 'Transit';
  }
  return 'Dispatch';
};

export const ExpenseEditModal: React.FC<ExpenseEditModalProps> = ({ visible, kind, entityId, expense, onClose, onSaved }) => {
  const { colors } = useAppTheme();
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expense) {
      return;
    }

    setType(expense.type || '');
    setDescription(expense.description || '');
    setAmount(typeof expense.amount === 'number' ? String(expense.amount) : '');
    setDate(expense.date ? String(expense.date).slice(0, 10) : '');
    setVendor(expense.vendor || '');
    setInvoiceNumber(expense.invoiceNumber || '');
    setNotes(expense.notes || '');
  }, [expense]);

  const handleClose = () => {
    if (saving) {
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    if (!expense) {
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter a valid amount', 'Amount must be a positive number.');
      return;
    }

    if (kind !== 'dispatch' && !type.trim()) {
      Alert.alert('Enter an expense type', 'Type is required for this expense.');
      return;
    }

    if (kind === 'dispatch' && description.trim().length < 3) {
      Alert.alert('Enter a description', 'Description is required for dispatch expenses (at least 3 characters).');
      return;
    }

    const baseFields = {
      expenseId: expense.id,
      type: type.trim(),
      amount: parsedAmount,
      date: date || undefined,
      vendor: vendor.trim() || null,
      invoiceNumber: invoiceNumber.trim() || null,
      notes: notes.trim() || null,
      currency: expense.currency || undefined,
    };

    try {
      setSaving(true);
      if (kind === 'container') {
        await containersApi.updateExpense(entityId, baseFields);
      } else if (kind === 'transit') {
        await transitsApi.updateExpense(entityId, baseFields);
      } else {
        await dispatchesApi.updateExpense(entityId, {
          ...baseFields,
          category: expense.category || 'TRANSPORT',
          description: description.trim(),
        });
      }
      onSaved();
      onClose();
      Alert.alert('Expense updated', 'The expense changes were saved and linked ledger entries were rebuilt.');
    } catch (error: any) {
      Alert.alert('Unable to update expense', error?.message || 'The expense could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const subtitle =
    kind === 'dispatch'
      ? `Update this dispatch expense. Ledger entries and invoice lines are rebuilt from the new values; category and type are preserved from the original record.`
      : `Update this ${entityLabel(kind).toLowerCase()} expense. Ledger entries and invoice lines are rebuilt from the new values.`;

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={`Edit ${entityLabel(kind)} Expense`}
      subtitle={subtitle}
      showCloseButton={!saving}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {kind === 'dispatch' && expense ? (
          <View style={[styles.readonlyBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={[styles.readonlyLabel, { color: colors.textSecondary }]}>Category & Type (read-only)</Text>
            <Text style={[styles.readonlyValue, { color: colors.textPrimary }]}>
              {titleCase(expense.category || 'TRANSPORT')} • {titleCase(expense.type || '')}
            </Text>
          </View>
        ) : null}

        {kind !== 'dispatch' ? (
          <Input label="Expense Type *" value={type} onChangeText={setType} placeholder="e.g. Fuel, Customs, Storage" autoCapitalize="words" />
        ) : null}

        {kind === 'dispatch' ? (
          <Input label="Description *" value={description} onChangeText={setDescription} placeholder="What this expense covers" multiline />
        ) : null}

        <Input
          label="Amount (USD) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <DateField label="Expense Date" value={date} onChange={setDate} placeholder="Select date" />

        <Input label="Vendor" value={vendor} onChangeText={setVendor} placeholder="Vendor or supplier name" autoCapitalize="words" />

        <Input label="Invoice Number" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Reference on the vendor invoice" />

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
  readonlyBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  readonlyLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  readonlyValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});

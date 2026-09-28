import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { useAppTheme } from '../../hooks/useAppTheme';

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: string;
  maximumDate?: string;
  containerStyle?: any;
}

function parseDateString(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string, placeholder: string) {
  const parsed = parseDateString(value);
  if (!parsed) {
    return placeholder;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  containerStyle,
}) => {
  const { colors } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerValue = useMemo(() => parseDateString(value) || new Date(), [value]);
  const minDate = useMemo(() => parseDateString(minimumDate || undefined) || undefined, [minimumDate]);
  const maxDate = useMemo(() => parseDateString(maximumDate || undefined) || undefined, [maximumDate]);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      onChange(toDateString(selectedDate));
    }

    if (event.type === 'set') {
      setShowPicker(false);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowPicker((current) => !current)}
          style={[styles.fieldButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
        >
          <Text style={[styles.fieldButtonText, { color: value ? colors.textPrimary : colors.textTertiary }]}>{formatDateLabel(value, placeholder)}</Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.85} style={[styles.clearButton, { borderColor: colors.border, backgroundColor: colors.panel }]}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showPicker ? (
        <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.panel }]}> 
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="default"
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={handleChange}
          />
          <TouchableOpacity activeOpacity={0.85} onPress={() => setShowPicker(false)} style={styles.doneButton}>
            <Text style={[styles.doneButtonText, { color: colors.accent }]}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  fieldButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  fieldButtonText: {
    fontSize: Typography.fontSize.base,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  doneButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
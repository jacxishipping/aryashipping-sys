import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <View style={styles.row}>
        <View style={[styles.webInputWrap, { backgroundColor: colors.panel, borderColor: colors.border }]}> 
          {React.createElement('input', {
            type: 'date',
            value,
            min: minimumDate,
            max: maximumDate,
            onChange: (event: any) => onChange(event?.target?.value || ''),
            style: {
              width: '100%',
              height: 48,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.textPrimary,
              fontSize: 16,
              fontFamily: 'inherit',
            },
          })}
        </View>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.85} style={[styles.clearButton, { borderColor: colors.border, backgroundColor: colors.panel }]}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {!value ? <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>{placeholder}</Text> : null}
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
  webInputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
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
  placeholderText: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
});
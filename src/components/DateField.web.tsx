import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateField({
  label,
  required,
  value,
  onChange,
  error,
  minimumDate,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: Date;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.wrap, error ? styles.inputError : null]}>
        {React.createElement('input', {
          type: 'date',
          value: value || '',
          min: minimumDate ? toIsoDate(minimumDate) : undefined,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: {
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: 12,
            fontSize: 15,
            color: colors.text,
            fontFamily: 'inherit',
          },
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  required: { color: colors.accent },
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
});

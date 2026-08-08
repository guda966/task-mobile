import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DATE_FIELD_STYLE_ID = 'task-date-field-calendar-icon';

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
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DATE_FIELD_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = DATE_FIELD_STYLE_ID;
    style.textContent = `
      input[data-task-date="1"] {
        box-sizing: border-box;
        -webkit-appearance: none;
        appearance: none;
      }
      input[data-task-date="1"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        opacity: 0.85;
        padding: 6px;
        margin-right: 2px;
        width: 18px;
        height: 18px;
      }
    `;
    document.head.appendChild(style);
  }, []);

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
          'data-task-date': '1',
          style: {
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 12,
            // Keep clear space so the native calendar icon is not clipped.
            paddingRight: 40,
            fontSize: 15,
            color: colors.text,
            fontFamily: 'inherit',
            lineHeight: '20px',
            minHeight: 46,
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
    // Do not use overflow:hidden — it clips the native calendar icon.
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
});

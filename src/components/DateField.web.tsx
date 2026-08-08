import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const DATE_FIELD_STYLE_ID = 'task-date-field-custom';

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DATE_FIELD_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = DATE_FIELD_STYLE_ID;
    style.textContent = `
      input[data-task-date="1"] {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        border: 0;
        margin: 0;
        padding: 0;
        cursor: pointer;
        z-index: 2;
      }
      input[data-task-date="1"]::-webkit-calendar-picker-indicator {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      // Fall through to click()
    }
    el.click();
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        onPress={openPicker}
        style={[styles.wrap, error ? styles.inputError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {value ? formatDisplay(value) : 'Select date'}
        </Text>
        <View style={styles.iconBtn} pointerEvents="none">
          <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
        </View>
        {React.createElement('input', {
          ref: (node: HTMLInputElement | null) => {
            inputRef.current = node;
          },
          type: 'date',
          value: value || '',
          min: minimumDate ? toIsoDate(minimumDate) : undefined,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          'data-task-date': '1',
          'aria-label': label,
        })}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  required: { color: colors.accent },
  wrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  value: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  placeholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
});

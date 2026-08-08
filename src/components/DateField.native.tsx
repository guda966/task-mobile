import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : new Date();
  const display = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Select date';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, error ? styles.inputError : null]}
      >
        <Text style={value ? styles.value : styles.placeholder}>{display}</Text>
        <View style={styles.iconBtn}>
          <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
        </View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={Number.isNaN(selected.getTime()) ? new Date() : selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          minimumDate={minimumDate}
          onChange={(_, date) => {
            if (Platform.OS === 'android') setOpen(false);
            if (date) onChange(toIsoDate(date));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <Pressable style={styles.done} onPress={() => setOpen(false)}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  required: { color: colors.accent },
  trigger: {
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
  inputError: { borderColor: colors.danger },
  value: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  placeholder: { color: colors.textMuted, fontSize: 15, flex: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
  done: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneText: { color: colors.primary, fontWeight: '700' },
});

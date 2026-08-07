import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../theme/colors';

export function TaskLogo({ size = 72 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/brand/task-logo.png')}
      style={{ width: size, height: size, resizeMode: 'contain' }}
      accessibilityLabel="TASK logo"
    />
  );
}

export function Screen({
  children,
  title,
  subtitle,
  showLogo = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}) {
  return (
    <View style={styles.screen}>
      {(title || subtitle || showLogo) && (
        <View style={styles.header}>
          {showLogo ? (
            <View style={styles.logoRow}>
              <TaskLogo size={56} />
            </View>
          ) : null}
          {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function FormField({
  label,
  error,
  required,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; required?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function DropdownField({
  label,
  required,
  options,
  value,
  onChange,
  error,
  placeholder = 'Select',
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        <View style={[styles.selectWrap, error ? styles.inputError : null]}>
          <Picker
            selectedValue={value}
            onValueChange={(itemValue) => onChange(String(itemValue ?? ''))}
            style={styles.webPicker}
          >
            {!options.some((o) => o.value === '') ? (
              <Picker.Item label={placeholder} value="" color={colors.textMuted} />
            ) : null}
            {options.map((opt) => (
              <Picker.Item
                key={opt.value === '' ? '__empty__' : opt.value}
                label={opt.label}
                value={opt.value}
              />
            ))}
          </Picker>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.dropdownTrigger, error ? styles.inputError : null]}
      >
        <Text style={selectedLabel ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item, index) =>
                item.value === '' ? `__empty_${index}` : item.value
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <PrimaryButton title="Close" variant="secondary" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'approved' ||
    status === 'enabled' ||
    status === 'active' ||
    status === 'registered' ||
    status === 'answered' ||
    status === 'present' ||
    status === 'accepted' ||
    status === 'issued' ||
    status === 'eligible' ||
    status === 'completed'
      ? { bg: colors.successSoft, fg: colors.success }
      : status === 'rejected' ||
          status === 'disabled' ||
          status === 'cancelled' ||
          status === 'inactive' ||
          status === 'absent' ||
          status === 'needs_revision'
        ? { bg: colors.dangerSoft, fg: colors.danger }
        : status === 'late' || status === 'submitted' || status === 'open'
          ? { bg: colors.warningSoft, fg: colors.warning }
          : { bg: colors.pendingSoft, fg: colors.pending };

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </View>
  );
}

export function CheckboxRow({
  checked,
  onToggle,
  label,
  error,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Pressable onPress={onToggle} style={styles.checkRow}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#D7EEEE',
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  body: { flex: 1, padding: 16 },
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  required: { color: colors.accent },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
  selectWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webPicker: {
    width: '100%',
    height: 44,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.text,
    paddingHorizontal: 8,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { color: colors.text, fontSize: 15, flex: 1 },
  dropdownPlaceholder: { color: colors.textMuted, fontSize: 15, flex: 1 },
  chevron: { color: colors.textMuted, fontSize: 10, marginLeft: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowActive: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, fontSize: 15 },
  optionTextActive: { color: colors.primaryDark, fontWeight: '700' },
  dateWebWrap: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  buttonTextSecondary: { color: colors.primary },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  checkLabel: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
});

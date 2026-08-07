import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBadge } from '../../components/ui';
import { colors } from '../../theme/colors';
import type { CollegeEnrollment } from '../../types/enrollment';

export function RenewalPanel({ enrollment }: { enrollment: CollegeEnrollment }) {
  return (
    <View style={styles.root}>
      <Text style={styles.h1}>College Renewal / Payment</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Registration status</Text>
          <StatusBadge status={enrollment.status} />
        </View>
        <Text style={styles.meta}>College: {enrollment.institutionName}</Text>
        <Text style={styles.meta}>Affiliation: {enrollment.affiliationNumber}</Text>
        <Text style={styles.meta}>
          Last fee acknowledged: ₹ {enrollment.registrationFee.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.note}>
          Renewal and online payment gateway will be connected in a later phase. For now this
          screen confirms your college tenant is active.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginBottom: 4, fontSize: 13 },
  note: { marginTop: 12, color: colors.textMuted, lineHeight: 20, fontSize: 13 },
});

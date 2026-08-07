import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DataCard,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../../components/college/PanelChrome';
import { StatusBadge } from '../../components/ui';
import { colors } from '../../theme/colors';
import type { CollegeEnrollment } from '../../types/enrollment';

export function RenewalPanel({ enrollment }: { enrollment: CollegeEnrollment }) {
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <PanelHeader
        title="Renewal"
        subtitle="Your college registration status and fee acknowledgement."
      />

      <StatTiles
        items={[
          {
            label: 'Status',
            value: enrollment.status === 'approved' ? 'Active' : enrollment.status,
          },
          {
            label: 'Fee paid',
            value: `₹${enrollment.registrationFee.toLocaleString('en-IN')}`,
          },
          {
            label: 'District',
            value: enrollment.district,
          },
          {
            label: 'Centre',
            value: enrollment.regionalCenterName?.split(' ')[0] || '—',
            hint: enrollment.regionalCenterName,
          },
        ]}
      />

      <SectionLabel>Registration summary</SectionLabel>
      <DataCard>
        <View style={styles.row}>
          <Text style={styles.label}>Registration status</Text>
          <StatusBadge status={enrollment.status} />
        </View>
        <Text style={styles.meta}>College: {enrollment.institutionName}</Text>
        <Text style={styles.meta}>Affiliation: {enrollment.affiliationNumber}</Text>
        <Text style={styles.meta}>
          Contact: {enrollment.contactPersonName} ({enrollment.contactDesignation})
        </Text>
        <Text style={styles.meta}>
          Email: {enrollment.officialEmail} · Mobile: {enrollment.officialMobile}
        </Text>
        <Text style={styles.meta}>
          Last fee acknowledged: ₹ {enrollment.registrationFee.toLocaleString('en-IN')}
        </Text>
      </DataCard>

      <DataCard>
        <Text style={styles.noteTitle}>Next renewal</Text>
        <Text style={styles.note}>
          Online payment for renewal will be added later. This screen confirms your college is
          active with TASK.
        </Text>
      </DataCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginBottom: 4, fontSize: 13, lineHeight: 18 },
  noteTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 6 },
  note: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
});

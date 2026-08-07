import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, StatusBadge } from '../../components/ui';
import { collegePortalApi } from '../../services/collegePortalApi';
import { colors } from '../../theme/colors';
import type { CourseRequest } from '../../types/collegePortal';

function monthKey(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

export function CalendarPanel({ enrollmentId }: { enrollmentId: string }) {
  const [items, setItems] = useState<CourseRequest[]>([]);
  const [month, setMonth] = useState('All');

  const load = useCallback(async () => {
    setItems(await collegePortalApi.listCalendarEvents(enrollmentId));
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const months = useMemo(() => {
    const set = new Set(items.map((i) => monthKey(i.startDate)));
    return ['All', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    if (month === 'All') return items;
    return items.filter((i) => monthKey(i.startDate) === month);
  }, [items, month]);

  const grouped = useMemo(() => {
    const map = new Map<string, CourseRequest[]>();
    for (const item of filtered) {
      const key = monthKey(item.startDate);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Calendar</Text>
      <Text style={styles.lead}>
        Only approved trainings for your college. Simple list by month — no clutter.
      </Text>

      <DropdownField
        label="Month"
        value={month}
        onChange={setMonth}
        options={months.map((m) => ({ value: m, label: m }))}
      />

      {grouped.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No approved sessions yet</Text>
          <Text style={styles.emptyBody}>
            Request a course and wait for TASK Admin approval. Approved dates will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([key]) => key}
          contentContainerStyle={styles.list}
          renderItem={({ item: [label, rows] }) => (
            <View style={styles.monthBlock}>
              <Text style={styles.monthLabel}>{label}</Text>
              {rows.map((row) => (
                <View key={row.id} style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.title}>{row.courseName}</Text>
                    <StatusBadge status="approved" />
                  </View>
                  <Text style={styles.dates}>{formatRange(row.startDate, row.endDate)}</Text>
                  <Text style={styles.meta}>
                    {row.branch} · Grad year {row.yearOfGraduation} · Batch {row.batchSize}
                  </Text>
                  {row.trainerName ? (
                    <View style={styles.trainerBox}>
                      <Text style={styles.trainerTitle}>Assigned trainer</Text>
                      <Text style={styles.trainerName}>{row.trainerName}</Text>
                      {row.trainerEmail ? (
                        <Text style={styles.meta}>{row.trainerEmail}</Text>
                      ) : null}
                      {row.trainerMobile ? (
                        <Text style={styles.meta}>Mobile: {row.trainerMobile}</Text>
                      ) : null}
                      {row.trainerCity || row.trainerExperienceYears ? (
                        <Text style={styles.meta}>
                          {[row.trainerCity, row.trainerExperienceYears ? `${row.trainerExperienceYears} yrs exp` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                      {row.trainerSkills ? (
                        <Text style={styles.skills}>{row.trainerSkills}</Text>
                      ) : null}
                      {row.backupTrainerName ? (
                        <Text style={styles.meta}>
                          Backup: {row.backupTrainerName}
                          {row.backupTrainerMobile ? ` · ${row.backupTrainerMobile}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.meta}>Trainer: Not assigned yet</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  lead: { color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  list: { paddingBottom: 40 },
  monthBlock: { marginBottom: 18 },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  dates: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 12 },
  trainerBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trainerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  trainerName: { fontWeight: '700', color: colors.text, fontSize: 14 },
  skills: { marginTop: 4, color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  emptyBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  emptyTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 6 },
  emptyBody: { color: colors.textMuted, lineHeight: 20 },
});

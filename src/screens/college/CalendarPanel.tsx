import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  FilterGrid,
  PanelHeader,
  PanelPage,
  ResultBar,
  SearchInput,
} from '../../components/college/PanelChrome';
import { DropdownField, PrimaryButton, StatusBadge } from '../../components/ui';
import { BRANCHES } from '../../constants/courses';
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
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await collegePortalApi.listCalendarEvents(enrollmentId));
    } finally {
      setLoading(false);
    }
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
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (month !== 'All' && monthKey(i.startDate) !== month) return false;
      if (branch && i.branch !== branch) return false;
      if (!q) return true;
      return (
        i.courseName.toLowerCase().includes(q) ||
        i.branch.toLowerCase().includes(q) ||
        (i.trainerName || '').toLowerCase().includes(q)
      );
    });
  }, [items, month, branch, query]);

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
    <PanelPage>
      <PanelHeader
        title="Calendar"
        subtitle="Approved trainings for your college, grouped by month."
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course, branch, or trainer"
      />

      <FilterGrid>
        <DropdownField
          label="Month"
          value={month}
          onChange={setMonth}
          options={months.map((m) => ({ value: m, label: m === 'All' ? 'All months' : m }))}
        />
        <DropdownField
          label="Branch"
          value={branch}
          onChange={setBranch}
          options={[
            { value: '', label: 'All branches' },
            ...BRANCHES.map((b) => ({ value: b, label: b })),
          ]}
        />
      </FilterGrid>

      <PrimaryButton title="Refresh" variant="secondary" onPress={load} />

      <ResultBar label="Sessions" count={filtered.length} />

      {grouped.length === 0 ? (
        <EmptyState
          title={loading ? 'Loading calendar…' : 'No approved sessions match'}
          body="Request a course and wait for TASK Admin approval. Approved dates appear here."
        />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([key]) => key}
          contentContainerStyle={styles.list}
          renderItem={({ item: [label, rows] }) => (
            <View style={styles.monthBlock}>
              <Text style={styles.monthLabel}>{label}</Text>
              {rows.map((row) => (
                <DataCard key={row.id} accent>
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
                      {row.trainerEmail ? <Text style={styles.meta}>{row.trainerEmail}</Text> : null}
                      {row.trainerMobile ? (
                        <Text style={styles.meta}>Mobile: {row.trainerMobile}</Text>
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
                </DataCard>
              ))}
            </View>
          )}
        />
      )}
    </PanelPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 40 },
  monthBlock: { marginBottom: 16 },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  dates: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
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
  },
  trainerName: { fontWeight: '700', color: colors.text, fontSize: 14 },
});

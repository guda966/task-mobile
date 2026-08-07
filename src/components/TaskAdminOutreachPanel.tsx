import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  SegmentedTabs,
} from '../components/college/PanelChrome';
import { DropdownField, FormField, PrimaryButton, StatusBadge } from './ui';
import { AFFILIATED_UNIVERSITIES, DISTRICTS } from '../constants/lookups';
import { taskBroadcastApi } from '../services/taskBroadcastApi';
import { colors } from '../theme/colors';
import type { CollegeEnrollment } from '../types/enrollment';
import type {
  AudienceScope,
  AudienceScopeKind,
  TaskAnnouncement,
  TaskProgramSession,
} from '../types/taskBroadcast';
import { audienceScopeLabel } from '../types/taskBroadcast';

type OutreachTab = 'announce' | 'schedule' | 'sessions';

export function TaskAdminOutreachPanel({
  colleges,
  adminName,
}: {
  colleges: CollegeEnrollment[];
  adminName: string;
}) {
  const [sub, setSub] = useState<OutreachTab>('announce');
  const [announcements, setAnnouncements] = useState<TaskAnnouncement[]>([]);
  const [sessions, setSessions] = useState<TaskProgramSession[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [scopeKind, setScopeKind] = useState<AudienceScopeKind>('state');
  const [district, setDistrict] = useState('');
  const [university, setUniversity] = useState('');
  const [collegeId, setCollegeId] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const [sessTitle, setSessTitle] = useState('');
  const [sessDesc, setSessDesc] = useState('');
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [venueOrLink, setVenueOrLink] = useState('');
  const [instructor, setInstructor] = useState('');
  const [maxSeats, setMaxSeats] = useState('');

  const approvedColleges = useMemo(
    () => colleges.filter((c) => c.status === 'approved'),
    [colleges],
  );

  const buildScope = useCallback((): AudienceScope => {
    if (scopeKind === 'state') {
      return { kind: 'state', label: audienceScopeLabel({ kind: 'state', label: '' }) };
    }
    if (scopeKind === 'district') {
      return {
        kind: 'district',
        district,
        label: audienceScopeLabel({ kind: 'district', district, label: '' }),
      };
    }
    if (scopeKind === 'university') {
      return {
        kind: 'university',
        university,
        label: audienceScopeLabel({ kind: 'university', university, label: '' }),
      };
    }
    const college = approvedColleges.find((c) => c.id === collegeId);
    return {
      kind: 'college',
      enrollmentId: collegeId,
      label: college
        ? `College · ${college.institutionName}`
        : audienceScopeLabel({ kind: 'college', enrollmentId: collegeId, label: 'College' }),
    };
  }, [scopeKind, district, university, collegeId, approvedColleges]);

  const load = useCallback(async () => {
    const list = await taskBroadcastApi.listProgramSessions();
    setAnnouncements(await taskBroadcastApi.listAnnouncements());
    setSessions(list);
    const next: Record<string, number> = {};
    for (const s of list) {
      next[s.id] = await taskBroadcastApi.getEnrollmentCount(s.id);
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scope = buildScope();
        const n = await taskBroadcastApi.previewAudienceCount(scope);
        if (!cancelled) setPreviewCount(n);
      } catch {
        if (!cancelled) setPreviewCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildScope]);

  const ScopeFields = (
    <DataCard>
      <Text style={styles.hint}>
        Choose who receives this — entire state, one district, one university, or one college.
      </Text>
      <DropdownField
        label="Audience"
        required
        value={scopeKind}
        onChange={(v) => setScopeKind(v as AudienceScopeKind)}
        options={[
          { value: 'state', label: 'Entire Telangana (all registered students)' },
          { value: 'district', label: 'Particular district' },
          { value: 'university', label: 'Affiliated university' },
          { value: 'college', label: 'Particular college' },
        ]}
      />
      {scopeKind === 'district' ? (
        <DropdownField
          label="District"
          required
          value={district}
          onChange={setDistrict}
          options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          placeholder="Select district"
        />
      ) : null}
      {scopeKind === 'university' ? (
        <DropdownField
          label="Affiliated university"
          required
          value={university}
          onChange={setUniversity}
          options={AFFILIATED_UNIVERSITIES.map((u) => ({ value: u, label: u }))}
          placeholder="Select university"
        />
      ) : null}
      {scopeKind === 'college' ? (
        <DropdownField
          label="College"
          required
          value={collegeId}
          onChange={setCollegeId}
          options={approvedColleges.map((c) => ({
            value: c.id,
            label: `${c.institutionName} · ${c.district}`,
          }))}
          placeholder="Select college"
        />
      ) : null}
      <Text style={styles.preview}>
        {previewCount === null
          ? 'Audience preview…'
          : `${previewCount} Active student${previewCount === 1 ? '' : 's'} will be alerted`}
      </Text>
    </DataCard>
  );

  const postAnnouncement = async () => {
    try {
      setSaving(true);
      const record = await taskBroadcastApi.postAnnouncement({
        title: annTitle,
        body: annBody,
        scope: buildScope(),
        createdBy: adminName,
      });
      setAnnTitle('');
      setAnnBody('');
      Alert.alert(
        'Announcement posted',
        `Alert sent to ${record.notifiedCount} student(s).\nScope: ${record.scope.label}`,
      );
      await load();
      setSub('sessions');
    } catch (e) {
      Alert.alert('Unable to post', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const scheduleSession = async () => {
    try {
      setSaving(true);
      const seats = maxSeats.trim() ? Number(maxSeats) : undefined;
      const record = await taskBroadcastApi.scheduleSession({
        title: sessTitle,
        description: sessDesc,
        mode,
        startDate,
        endDate,
        startTime,
        endTime,
        venueOrLink,
        instructorName: instructor,
        maxSeats: seats && !Number.isNaN(seats) ? seats : undefined,
        scope: buildScope(),
        createdBy: adminName,
      });
      setSessTitle('');
      setSessDesc('');
      setVenueOrLink('');
      setInstructor('');
      setMaxSeats('');
      Alert.alert(
        'Session scheduled',
        `Alert sent to ${record.notifiedCount} student(s). They can enrol from Trainings → TASK sessions.`,
      );
      await load();
      setSub('sessions');
    } catch (e) {
      Alert.alert('Unable to schedule', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <PanelHeader
        title="Announcements & sessions"
        subtitle="Reach registered students statewide or by district, university, or college"
      />
      <SegmentedTabs
        value={sub}
        onChange={setSub}
        options={[
          { value: 'announce', label: 'Post announcement' },
          { value: 'schedule', label: 'Schedule session' },
          { value: 'sessions', label: `Published (${sessions.length})` },
        ]}
      />

      {sub === 'announce' ? (
        <>
          <SectionLabel>1. Audience</SectionLabel>
          {ScopeFields}
          <SectionLabel>2. Message</SectionLabel>
          <DataCard>
            <FormField
              label="Title"
              required
              value={annTitle}
              onChangeText={setAnnTitle}
              placeholder="e.g. Soft-skills workshop open"
            />
            <FormField
              label="Message"
              required
              value={annBody}
              onChangeText={setAnnBody}
              multiline
              style={{ minHeight: 100, textAlignVertical: 'top' }}
              placeholder="Write the announcement students will see in Alerts"
            />
            <PrimaryButton
              title={saving ? 'Posting…' : 'Post & notify students'}
              onPress={postAnnouncement}
              disabled={saving}
            />
          </DataCard>
          <SectionLabel>Recent announcements</SectionLabel>
          {announcements.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            announcements.slice(0, 8).map((a) => (
              <DataCard key={a.id}>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.meta}>{a.scope.label}</Text>
                <Text style={styles.body}>{a.body}</Text>
                <Text style={styles.meta}>
                  Notified {a.notifiedCount} · {new Date(a.createdAt).toLocaleString()}
                </Text>
              </DataCard>
            ))
          )}
        </>
      ) : null}

      {sub === 'schedule' ? (
        <>
          <SectionLabel>1. Audience</SectionLabel>
          {ScopeFields}
          <SectionLabel>2. Session details</SectionLabel>
          <DataCard>
            <FormField
              label="Session title"
              required
              value={sessTitle}
              onChangeText={setSessTitle}
              placeholder="e.g. Resume building clinic"
            />
            <FormField
              label="Full details / agenda"
              required
              value={sessDesc}
              onChangeText={setSessDesc}
              multiline
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
            <DropdownField
              label="Mode"
              required
              value={mode}
              onChange={(v) => setMode(v as 'online' | 'offline')}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'offline', label: 'Offline (in person)' },
              ]}
            />
            <FormField
              label="Start date (YYYY-MM-DD)"
              required
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-08-15"
            />
            <FormField
              label="End date (YYYY-MM-DD)"
              required
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-08-15"
            />
            <FormField label="Start time" value={startTime} onChangeText={setStartTime} />
            <FormField label="End time" value={endTime} onChangeText={setEndTime} />
            <FormField
              label={
                mode === 'online' ? 'Meeting / join link' : 'Venue address (optional)'
              }
              required={mode === 'online'}
              value={venueOrLink}
              onChangeText={setVenueOrLink}
              placeholder={
                mode === 'online'
                  ? 'https://meet.example.com/…'
                  : 'Optional — e.g. TASK Regional Centre, Hyderabad'
              }
            />
            <FormField
              label="Instructor / facilitator (optional)"
              value={instructor}
              onChangeText={setInstructor}
            />
            <FormField
              label="Max seats (optional)"
              value={maxSeats}
              onChangeText={setMaxSeats}
              keyboardType="number-pad"
              placeholder="e.g. 100"
            />
            <PrimaryButton
              title={saving ? 'Scheduling…' : 'Schedule & notify students'}
              onPress={scheduleSession}
              disabled={saving}
            />
          </DataCard>
        </>
      ) : null}

      {sub === 'sessions' ? (
        <>
          <SectionLabel>Scheduled TASK sessions</SectionLabel>
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions scheduled"
              body="Use Schedule session to create an online or offline programme for targeted students."
            />
          ) : (
            sessions.map((s) => (
              <DataCard key={s.id}>
                <View style={styles.row}>
                  <Text style={styles.title}>{s.title}</Text>
                  <StatusBadge status={s.status === 'open' ? 'active' : 'inactive'} />
                </View>
                <Text style={styles.meta}>
                  {s.mode === 'online' ? 'Online' : 'Offline'} · {s.startDate} {s.startTime} →{' '}
                  {s.endDate} {s.endTime}
                </Text>
                <Text style={styles.meta}>{s.scope.label}</Text>
                <Text style={styles.body}>{s.description}</Text>
                {s.venueOrLink ? (
                  <Text style={styles.meta}>
                    {s.mode === 'online' ? 'Link' : 'Venue'}: {s.venueOrLink}
                  </Text>
                ) : (
                  <Text style={styles.meta}>Venue: to be confirmed</Text>
                )}
                {s.instructorName ? (
                  <Text style={styles.meta}>Facilitator: {s.instructorName}</Text>
                ) : null}
                <Text style={styles.enroll}>
                  Students enrolled: {counts[s.id] ?? 0}
                  {s.maxSeats ? ` / ${s.maxSeats}` : ''}
                </Text>
                <Text style={styles.meta}>Alerts sent at publish: {s.notifiedCount}</Text>
                {s.status === 'open' ? (
                  <PrimaryButton
                    title="Close enrolment"
                    variant="secondary"
                    onPress={async () => {
                      await taskBroadcastApi.closeSession(s.id);
                      await load();
                    }}
                  />
                ) : null}
              </DataCard>
            ))
          )}

          <SectionLabel>Announcements log</SectionLabel>
          {announcements.length === 0 ? (
            <EmptyState title="No announcements" />
          ) : (
            announcements.map((a) => (
              <DataCard key={a.id}>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.meta}>
                  {a.scope.label} · Notified {a.notifiedCount}
                </Text>
              </DataCard>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  preview: {
    marginTop: 4,
    fontWeight: '700',
    color: colors.primaryDark,
    fontSize: 13,
  },
  title: { fontWeight: '800', color: colors.text, fontSize: 15, flex: 1 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  body: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 19 },
  enroll: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

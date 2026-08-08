import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  SegmentedTabs,
  StatTiles,
} from '../components/college/PanelChrome';
import { RcShell, type RcMenuKey } from '../components/RcShell';
import { DropdownField, FormField, PrimaryButton, StatusBadge } from '../components/ui';
import { RC_MEMBERSHIP_FEE, RC_MEMBERSHIP_MONTHS } from '../constants/lookups';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { regionalCentreApi } from '../services/regionalCentreApi';
import { colors } from '../theme/colors';
import type { RcMembership, RcSession } from '../types/regionalCentre';
import { isMembershipActive } from '../types/regionalCentre';

type Props = NativeStackScreenProps<RootStackParamList, 'RegionalCentreHome'>;
type SessionTab = 'list' | 'create';

export function RegionalCentreHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<RcMenuKey>('home');
  const [members, setMembers] = useState<RcMembership[]>([]);
  const [sessions, setSessions] = useState<RcSession[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sessionTab, setSessionTab] = useState<SessionTab>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'online' | 'offline'>('offline');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [venueOrLink, setVenueOrLink] = useState('');
  const [maxSeats, setMaxSeats] = useState('40');

  const centerId = user?.regionalCenterId || '';
  const center = useMemo(
    () => (centerId ? regionalCentreApi.getCenter(centerId) : undefined),
    [centerId],
  );

  const load = useCallback(async () => {
    if (!centerId) return;
    const list = await regionalCentreApi.listMembershipsForCenter(centerId);
    setMembers(list);
    const sess = await regionalCentreApi.listSessionsForCenter(centerId);
    setSessions(sess);
    const next: Record<string, number> = {};
    for (const s of sess) {
      next[s.id] = await regionalCentreApi.getSessionEnrollmentCount(s.id);
    }
    setCounts(next);
  }, [centerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const activeMembers = members.filter((m) => isMembershipActive(m));
  const openSessions = sessions.filter((s) => s.status === 'open');

  const createSession = async () => {
    if (!centerId || !user) return;
    try {
      setSaving(true);
      const seats = maxSeats.trim() ? Number(maxSeats) : undefined;
      await regionalCentreApi.createSession({
        regionalCenterId: centerId,
        title,
        description,
        mode,
        startDate,
        endDate,
        startTime,
        endTime,
        venueOrLink,
        maxSeats: seats && !Number.isNaN(seats) ? seats : undefined,
        createdBy: user.name,
      });
      setTitle('');
      setDescription('');
      setVenueOrLink('');
      Alert.alert('Session published', 'Active RC students were notified.');
      await load();
      setSessionTab('list');
    } catch (e) {
      Alert.alert('Unable to create', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.regionalCenterId || !center) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No Regional Centre session found.</Text>
        <PrimaryButton title="Sign out" variant="secondary" onPress={onSignOut} />
      </View>
    );
  }

  return (
    <RcShell
      centreName={center.name}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      onHome={() => setMenu('home')}
    >
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {menu === 'home' ? (
          <>
            <PanelHeader
              title={center.name}
              subtitle={`${center.district} · ${center.place}`}
            />
            <StatTiles
              items={[
                { label: 'Active members', value: String(activeMembers.length) },
                { label: 'Total registrations', value: String(members.length) },
                { label: 'Open sessions', value: String(openSessions.length) },
                { label: 'Membership fee', value: `₹${RC_MEMBERSHIP_FEE}` },
              ]}
            />
            <DataCard>
              <Text style={styles.lead}>
                Students pay ₹{RC_MEMBERSHIP_FEE} (valid {RC_MEMBERSHIP_MONTHS} months) to join this
                centre. Publish sessions so active members can enrol and attend.
              </Text>
              <PrimaryButton title="Manage students" onPress={() => setMenu('members')} />
              <View style={{ height: 8 }} />
              <PrimaryButton
                title="Schedule a session"
                variant="secondary"
                onPress={() => {
                  setSessionTab('create');
                  setMenu('sessions');
                }}
              />
            </DataCard>
          </>
        ) : null}

        {menu === 'members' ? (
          <>
            <PanelHeader
              title="RC students"
              subtitle={`Active memberships · fee ₹${RC_MEMBERSHIP_FEE} / ${RC_MEMBERSHIP_MONTHS} months`}
            />
            {members.length === 0 ? (
              <EmptyState
                title="No students yet"
                body="When students register for this Regional Centre and pay ₹599, they appear here."
              />
            ) : (
              members.map((m) => (
                <DataCard key={m.id} accent={isMembershipActive(m)}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{m.studentName}</Text>
                    <StatusBadge status={isMembershipActive(m) ? 'active' : 'inactive'} />
                  </View>
                  <Text style={styles.meta}>{m.studentEmail}</Text>
                  <Text style={styles.meta}>{m.collegeName}</Text>
                  <Text style={styles.meta}>
                    Valid {new Date(m.startedAt).toLocaleDateString('en-IN')} →{' '}
                    {new Date(m.expiresAt).toLocaleDateString('en-IN')} · Fee ₹{m.feePaid}
                  </Text>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {menu === 'sessions' ? (
          <>
            <PanelHeader title="RC sessions" subtitle="Conduct programmes for your members" />
            <SegmentedTabs
              value={sessionTab}
              onChange={setSessionTab}
              options={[
                { value: 'list', label: `Published (${sessions.length})` },
                { value: 'create', label: 'Schedule' },
              ]}
            />
            {sessionTab === 'create' ? (
              <DataCard>
                <FormField label="Title" required value={title} onChangeText={setTitle} />
                <FormField
                  label="Details / agenda"
                  required
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
                <DropdownField
                  label="Mode"
                  required
                  value={mode}
                  onChange={(v) => setMode(v as 'online' | 'offline')}
                  options={[
                    { value: 'offline', label: 'Offline (at centre)' },
                    { value: 'online', label: 'Online' },
                  ]}
                />
                <FormField
                  label="Start date (YYYY-MM-DD)"
                  required
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-08-20"
                />
                <FormField
                  label="End date (YYYY-MM-DD)"
                  required
                  value={endDate}
                  onChangeText={setEndDate}
                />
                <FormField label="Start time" value={startTime} onChangeText={setStartTime} />
                <FormField label="End time" value={endTime} onChangeText={setEndTime} />
                <FormField
                  label={mode === 'online' ? 'Meeting / join link' : 'Venue (optional)'}
                  required={mode === 'online'}
                  value={venueOrLink}
                  onChangeText={setVenueOrLink}
                  placeholder={mode === 'online' ? 'https://…' : center.place}
                />
                <FormField
                  label="Max seats (optional)"
                  value={maxSeats}
                  onChangeText={setMaxSeats}
                  keyboardType="number-pad"
                />
                <PrimaryButton
                  title={saving ? 'Publishing…' : 'Publish session'}
                  onPress={createSession}
                  disabled={saving}
                />
              </DataCard>
            ) : sessions.length === 0 ? (
              <EmptyState title="No sessions yet" body="Use Schedule to create your first session." />
            ) : (
              sessions.map((s) => (
                <DataCard key={s.id}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{s.title}</Text>
                    <StatusBadge status={s.status === 'open' ? 'open' : 'inactive'} />
                  </View>
                  <Text style={styles.meta}>
                    {s.mode === 'online' ? 'Online' : 'Offline'} · {s.startDate} {s.startTime} →{' '}
                    {s.endDate} {s.endTime}
                  </Text>
                  {s.venueOrLink ? (
                    <Text style={styles.meta}>
                      {s.mode === 'online' ? 'Link' : 'Venue'}: {s.venueOrLink}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>{s.description}</Text>
                  <Text style={styles.enroll}>
                    Students enrolled: {counts[s.id] ?? 0}
                    {s.maxSeats ? ` / ${s.maxSeats}` : ''}
                  </Text>
                  {s.status === 'open' ? (
                    <PrimaryButton
                      title="Close enrolment"
                      variant="secondary"
                      onPress={async () => {
                        await regionalCentreApi.closeSession(s.id);
                        await load();
                      }}
                    />
                  ) : null}
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {menu === 'profile' ? (
          <>
            <PanelHeader title="Centre profile" subtitle="Preassigned RC login" />
            <DataCard>
              <SectionLabel>Centre</SectionLabel>
              <Text style={styles.name}>{center.name}</Text>
              <Text style={styles.meta}>{center.place}</Text>
              <Text style={styles.meta}>District: {center.district}</Text>
              <SectionLabel>Login</SectionLabel>
              <Text style={styles.meta}>Email: {center.email}</Text>
              <Text style={styles.meta}>Demo password: {center.password}</Text>
            </DataCard>
          </>
        ) : null}
      </ScrollView>
    </RcShell>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: colors.textMuted },
  lead: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontWeight: '800', color: colors.text, fontSize: 15, flex: 1 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  enroll: {
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 14,
  },
});

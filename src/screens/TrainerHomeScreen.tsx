import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AdminShell } from '../components/AdminShell';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { FormField, PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { TrainerFeedback, TrainerRecord } from '../types/trainer';
import { requesterLabel } from '../utils/courseRequestLabels';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerHome'>;
type MenuKey = 'home' | 'sessions' | 'documents' | 'history' | 'feedback' | 'profile';

export function TrainerHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<MenuKey>('home');
  const [profile, setProfile] = useState<TrainerRecord | null>(null);
  const [sessions, setSessions] = useState<CourseRequest[]>([]);
  const [history, setHistory] = useState<CourseRequest[]>([]);
  const [feedback, setFeedback] = useState<TrainerFeedback[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certYear, setCertYear] = useState('');
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achYear, setAchYear] = useState('');

  const load = useCallback(async () => {
    if (!user?.trainerId) return;
    const id = user.trainerId;
    setProfile(await trainerApi.getTrainer(id));
    setSessions(await trainerApi.listAssignedSessions(id));
    setHistory(await trainerApi.listTrainingHistory(id));
    setFeedback(await trainerApi.listFeedback(id));
  }, [user?.trainerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const primary = useMemo(
    () => sessions.filter((s) => s.trainerId === user?.trainerId),
    [sessions, user?.trainerId],
  );
  const backup = useMemo(
    () => sessions.filter((s) => s.backupTrainerId === user?.trainerId),
    [sessions, user?.trainerId],
  );
  const upNext = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...primary, ...backup]
      .filter((s) => s.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [primary, backup]);
  const isActive = profile?.status === 'active';

  const uploadResume = async () => {
    if (!user?.trainerId) return;
    try {
      const file = await pickMockDocument();
      await trainerApi.setResume(user.trainerId, {
        ...file,
        uploadedAt: new Date().toISOString(),
      });
      Alert.alert('Resume uploaded', `${file.fileName} saved to your profile.`);
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const addCert = async () => {
    if (!user?.trainerId) return;
    try {
      let file;
      try {
        file = await pickMockDocument();
      } catch {
        file = undefined;
      }
      await trainerApi.addCertificate(user.trainerId, {
        title: certTitle,
        issuer: certIssuer,
        year: certYear,
        file: file ? { ...file, uploadedAt: new Date().toISOString() } : undefined,
      });
      setCertTitle('');
      setCertIssuer('');
      setCertYear('');
      await load();
    } catch (e) {
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    }
  };

  const addAchievement = async () => {
    if (!user?.trainerId) return;
    try {
      await trainerApi.addAchievement(user.trainerId, {
        title: achTitle,
        description: achDesc,
        year: achYear,
      });
      setAchTitle('');
      setAchDesc('');
      setAchYear('');
      await load();
    } catch (e) {
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    }
  };

  const openSession = (requestId: string) => {
    navigation.navigate('TrainerSessionDetail', { requestId });
  };

  const SessionCard = ({
    item,
    role,
  }: {
    item: CourseRequest;
    role: 'Primary trainer' | 'Backup trainer';
  }) => (
    <Pressable style={styles.sessionCard} onPress={() => openSession(item.id)}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{item.courseName}</Text>
        <StatusBadge status="approved" />
      </View>
      <Text style={styles.rolePill}>{role}</Text>
      <Text style={styles.meta}>{requesterLabel(item)}</Text>
      <Text style={styles.meta}>
        {item.startDate} → {item.endDate} · {item.branch} · Batch {item.batchSize}
      </Text>
      <Text style={styles.openLink}>Open session workspace →</Text>
    </Pressable>
  );

  return (
    <AdminShell
      brandTitle="TASK Trainer"
      userName={user?.name || 'Trainer'}
      active={menu}
      onChange={(key) => setMenu(key as MenuKey)}
      onSignOut={onSignOut}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      onHome={() => setMenu('home')}
      menu={[
        { key: 'home', label: 'Home' },
        { key: 'sessions', label: 'My sessions', badge: sessions.length || undefined },
        { key: 'documents', label: 'Documents' },
        { key: 'history', label: 'History' },
        { key: 'feedback', label: 'Feedback', badge: feedback.length || undefined },
        { key: 'profile', label: 'Profile' },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
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
              title={profile ? `Hi, ${profile.firstName}` : 'Trainer home'}
              subtitle={
                profile
                  ? `${profile.city} · ${profile.skills.join(' · ')}`
                  : 'Your assigned TASK batches'
              }
            />

            {profile ? (
              <DataCard>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>
                    {profile.firstName} {profile.lastName}
                  </Text>
                  <StatusBadge status={profile.status} />
                </View>
                <Text style={styles.meta}>
                  {profile.experienceYears} yrs experience · {user?.email}
                </Text>
                {profile.status === 'active' ? (
                  <Text style={styles.ok}>
                    Active trainer — open My sessions to run materials, student attendance, session photos, and certificates.
                  </Text>
                ) : profile.status === 'inactive' ? (
                  <Text style={styles.warn}>
                    Account inactive. Contact TASK Admin if you need access restored.
                  </Text>
                ) : (
                  <Text style={styles.warn}>
                    Account not active yet. Contact TASK Admin for credentials support.
                  </Text>
                )}
              </DataCard>
            ) : (
              <EmptyState title="Loading profile…" />
            )}

            {isActive ? (
              <>
                <StatTiles
                  items={[
                    {
                      label: 'Primary sessions',
                      value: String(primary.length),
                      hint: 'You lead these',
                      onPress: () => setMenu('sessions'),
                    },
                    {
                      label: 'Backup sessions',
                      value: String(backup.length),
                      hint: 'Support role',
                      onPress: () => setMenu('sessions'),
                    },
                    {
                      label: 'Past trainings',
                      value: String(history.length),
                      onPress: () => setMenu('history'),
                    },
                    {
                      label: 'Feedback notes',
                      value: String(feedback.length),
                      onPress: () => setMenu('feedback'),
                    },
                  ]}
                />

                <SectionLabel>Up next</SectionLabel>
                {upNext.length === 0 ? (
                  <EmptyState
                    title="No sessions assigned yet"
                    body="TASK Admin assigns you to approved college and Regional Centre batches. Check back after assignment."
                  />
                ) : (
                  upNext.map((item) => (
                    <SessionCard
                      key={item.id}
                      item={item}
                      role={
                        item.trainerId === user?.trainerId
                          ? 'Primary trainer'
                          : 'Backup trainer'
                      }
                    />
                  ))
                )}

                <View style={styles.gap} />
                <PrimaryButton title="Go to My sessions" onPress={() => setMenu('sessions')} />
              </>
            ) : null}
          </>
        ) : null}

        {menu === 'sessions' ? (
          <>
            <PanelHeader
              title="My sessions"
              subtitle="Open a batch workspace for materials, assignments, student attendance, session photos, certificates, and queries"
            />
            {!isActive ? (
              <EmptyState
                title="Sessions locked"
                body="Your trainer account must be active. Contact TASK Admin."
              />
            ) : (
              <>
                <SectionLabel>{`Primary (${primary.length})`}</SectionLabel>
                {primary.length === 0 ? (
                  <EmptyState title="No primary assignments" body="You are not lead trainer on any batch yet." />
                ) : (
                  primary.map((item) => (
                    <SessionCard key={item.id} item={item} role="Primary trainer" />
                  ))
                )}

                <SectionLabel>{`Backup (${backup.length})`}</SectionLabel>
                {backup.length === 0 ? (
                  <Text style={styles.muted}>No backup assignments.</Text>
                ) : (
                  backup.map((item) => (
                    <SessionCard key={item.id} item={item} role="Backup trainer" />
                  ))
                )}
              </>
            )}
          </>
        ) : null}

        {menu === 'documents' ? (
          <>
            <PanelHeader
              title="Documents"
              subtitle="Keep resume, certificates, and achievements up to date"
            />
            {!profile ? (
              <EmptyState title="Loading…" />
            ) : (
              <>
                <SectionLabel>Resume</SectionLabel>
                <DataCard>
                  {profile.resume ? (
                    <Text style={styles.meta}>
                      {profile.resume.fileName} · {profile.resume.sizeLabel} ·{' '}
                      {new Date(profile.resume.uploadedAt).toLocaleDateString()}
                    </Text>
                  ) : (
                    <Text style={styles.muted}>No resume uploaded yet.</Text>
                  )}
                  <View style={styles.gap} />
                  <PrimaryButton
                    title="Upload / replace resume"
                    variant="secondary"
                    onPress={uploadResume}
                  />
                </DataCard>

                <SectionLabel>Certificates</SectionLabel>
                {(profile.certificates || []).map((c) => (
                  <DataCard key={c.id}>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.meta}>
                      {c.issuer} · {c.year || 'Year n/a'}
                    </Text>
                    {c.file ? <Text style={styles.meta}>File: {c.file.fileName}</Text> : null}
                    <Pressable
                      onPress={async () => {
                        if (!user?.trainerId) return;
                        await trainerApi.removeCertificate(user.trainerId, c.id);
                        await load();
                      }}
                    >
                      <Text style={styles.linkDanger}>Remove</Text>
                    </Pressable>
                  </DataCard>
                ))}
                <DataCard>
                  <FormField label="Certificate title" value={certTitle} onChangeText={setCertTitle} />
                  <FormField label="Issuer" value={certIssuer} onChangeText={setCertIssuer} />
                  <FormField
                    label="Year"
                    value={certYear}
                    onChangeText={setCertYear}
                    keyboardType="number-pad"
                  />
                  <PrimaryButton title="Add certificate" onPress={addCert} />
                </DataCard>

                <SectionLabel>Achievements</SectionLabel>
                {(profile.achievements || []).map((a) => (
                  <DataCard key={a.id}>
                    <Text style={styles.cardTitle}>{a.title}</Text>
                    <Text style={styles.meta}>{a.description}</Text>
                    <Text style={styles.meta}>{a.year || 'Year n/a'}</Text>
                    <Pressable
                      onPress={async () => {
                        if (!user?.trainerId) return;
                        await trainerApi.removeAchievement(user.trainerId, a.id);
                        await load();
                      }}
                    >
                      <Text style={styles.linkDanger}>Remove</Text>
                    </Pressable>
                  </DataCard>
                ))}
                <DataCard>
                  <FormField label="Achievement title" value={achTitle} onChangeText={setAchTitle} />
                  <FormField label="Description" value={achDesc} onChangeText={setAchDesc} />
                  <FormField
                    label="Year"
                    value={achYear}
                    onChangeText={setAchYear}
                    keyboardType="number-pad"
                  />
                  <PrimaryButton title="Add achievement" onPress={addAchievement} />
                </DataCard>
              </>
            )}
          </>
        ) : null}

        {menu === 'history' ? (
          <>
            <PanelHeader title="Training history" subtitle="Past batches you delivered" />
            {history.length === 0 ? (
              <EmptyState title="No completed trainings yet" />
            ) : (
              history.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.cardTitle}>{item.courseName}</Text>
                  <Text style={styles.meta}>{requesterLabel(item)}</Text>
                  <Text style={styles.meta}>
                    {item.startDate} → {item.endDate} · Batch {item.batchSize}
                  </Text>
                  <PrimaryButton
                    title="View session"
                    variant="secondary"
                    onPress={() => openSession(item.id)}
                  />
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {menu === 'feedback' ? (
          <>
            <PanelHeader
              title="Feedback"
              subtitle="Notes from TASK Admin, colleges, and students"
            />
            {feedback.length === 0 ? (
              <EmptyState title="No feedback yet" body="Feedback appears after sessions run." />
            ) : (
              feedback.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.cardTitle}>
                    {item.fromName} · {item.fromRole.replace(/_/g, ' ')}
                    {item.rating ? ` · ${item.rating}/5` : ''}
                  </Text>
                  {item.courseName ? <Text style={styles.meta}>{item.courseName}</Text> : null}
                  <Text style={styles.body}>{item.comment}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {menu === 'profile' ? (
          <>
            <PanelHeader
              title="My profile"
              subtitle="Contact details and skills — credentials were issued by TASK Admin"
            />
            {!profile ? (
              <EmptyState title="Loading…" />
            ) : (
              <DataCard>
                <Text style={styles.cardTitle}>
                  {profile.firstName} {profile.lastName}
                </Text>
                <Text style={styles.meta}>Email: {profile.email}</Text>
                <Text style={styles.meta}>Mobile: {profile.mobile}</Text>
                <Text style={styles.meta}>
                  City: {profile.city} · Experience: {profile.experienceYears} yrs
                </Text>
                <Text style={styles.meta}>Skills: {profile.skills.join(' · ')}</Text>
                <Text style={styles.body}>{profile.bio}</Text>
                <View style={styles.gap} />
                <PrimaryButton
                  title="Edit profile & password"
                  onPress={() => navigation.navigate('ProfileEdit')}
                />
              </DataCard>
            )}
          </>
        ) : null}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '800', color: colors.text, fontSize: 15, flex: 1 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  body: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  muted: { color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  ok: { marginTop: 8, color: colors.success, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  warn: { marginTop: 8, color: colors.warning, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  gap: { height: 10 },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 14,
    marginBottom: 10,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 2,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  openLink: { marginTop: 10, color: colors.primary, fontWeight: '700', fontSize: 13 },
  linkDanger: { color: colors.danger, marginTop: 8, fontWeight: '700', fontSize: 13 },
});

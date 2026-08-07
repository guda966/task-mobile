import React, { useCallback, useState } from 'react';
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
import { FormField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { TrainerFeedback, TrainerRecord } from '../types/trainer';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerHome'>;
type Tab = 'sessions' | 'credentials' | 'history' | 'feedback';

export function TrainerHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('sessions');
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

  const uploadResume = async () => {
    if (!user?.trainerId) return;
    try {
      const file = await pickMockDocument();
      await trainerApi.setResume(user.trainerId, {
        ...file,
        uploadedAt: new Date().toISOString(),
      });
      Alert.alert('Resume uploaded', `${file.fileName} saved to your profile (demo storage).`);
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
        file: file
          ? { ...file, uploadedAt: new Date().toISOString() }
          : undefined,
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

  const primary = sessions.filter((s) => s.trainerId === user?.trainerId);
  const backup = sessions.filter((s) => s.backupTrainerId === user?.trainerId);

  return (
    <Screen
      title="Trainer Dashboard"
      subtitle={user ? `${user.name} · ${user.email}` : 'Trainer'}
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
        {profile ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>
                {profile.firstName} {profile.lastName}
              </Text>
              <StatusBadge status={profile.status} />
            </View>
            <Text style={styles.meta}>
              {profile.city} · {profile.experienceYears} yrs experience
            </Text>
            <Text style={styles.skills}>{profile.skills.join(' · ')}</Text>
            {profile.status === 'pending' ? (
              <Text style={styles.warn}>
                Your trainer account is not active yet. Contact TASK Admin if you cannot access
                sessions.
              </Text>
            ) : null}
            {profile.status === 'rejected' ? (
              <Text style={styles.danger}>
                This trainer account is inactive or blocked
                {profile.rejectionReason ? `: ${profile.rejectionReason}` : '.'} Contact TASK Admin.
              </Text>
            ) : null}
            {profile.status === 'active' ? (
              <Text style={styles.ok}>Active TASK trainer — assigned sessions appear below.</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.muted}>Loading profile…</Text>
        )}

        <PrimaryButton title="Edit profile" onPress={() => navigation.navigate('ProfileEdit')} />
        <View style={styles.gap} />

        {profile?.status === 'active' ? (
          <>
            <View style={styles.tabs}>
              {(
                [
                  ['sessions', 'Sessions'],
                  ['credentials', 'Docs'],
                  ['history', 'History'],
                  ['feedback', 'Feedback'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  style={[styles.tab, tab === key && styles.tabActive]}
                >
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'sessions' ? (
              <>
                <Text style={styles.h2}>Assigned sessions (primary)</Text>
                {primary.length === 0 ? (
                  <Text style={styles.muted}>No primary assignments yet.</Text>
                ) : (
                  primary.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.session}
                      onPress={() =>
                        navigation.navigate('TrainerSessionDetail', { requestId: item.id })
                      }
                    >
                      <Text style={styles.sessionTitle}>{item.courseName}</Text>
                      <Text style={styles.meta}>{item.collegeName}</Text>
                      <Text style={styles.meta}>
                        {item.startDate} → {item.endDate}
                      </Text>
                      <Text style={styles.meta}>
                        {item.branch} · Batch {item.batchSize}
                      </Text>
                      <Text style={styles.openLink}>Open session workspace →</Text>
                    </Pressable>
                  ))
                )}
                {backup.length > 0 ? (
                  <>
                    <Text style={styles.h2}>Backup assignments</Text>
                    {backup.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.session}
                        onPress={() =>
                          navigation.navigate('TrainerSessionDetail', { requestId: item.id })
                        }
                      >
                        <Text style={styles.sessionTitle}>{item.courseName}</Text>
                        <Text style={styles.meta}>
                          {item.collegeName} · Primary: {item.trainerName}
                        </Text>
                        <Text style={styles.openLink}>Open session workspace →</Text>
                      </Pressable>
                    ))}
                  </>
                ) : null}
              </>
            ) : null}

            {tab === 'credentials' ? (
              <>
                <Text style={styles.h2}>Resume</Text>
                {profile?.resume ? (
                  <Text style={styles.meta}>
                    {profile.resume.fileName} · {profile.resume.sizeLabel} · uploaded{' '}
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

                <Text style={styles.h2}>Certificates (optional)</Text>
                {(profile?.certificates || []).map((c) => (
                  <View key={c.id} style={styles.session}>
                    <Text style={styles.sessionTitle}>{c.title}</Text>
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
                  </View>
                ))}
                <FormField label="Certificate title" value={certTitle} onChangeText={setCertTitle} />
                <FormField label="Issuer" value={certIssuer} onChangeText={setCertIssuer} />
                <FormField
                  label="Year"
                  value={certYear}
                  onChangeText={setCertYear}
                  keyboardType="number-pad"
                />
                <PrimaryButton title="Add certificate (+ optional file)" onPress={addCert} />

                <Text style={styles.h2}>Achievements (optional)</Text>
                {(profile?.achievements || []).map((a) => (
                  <View key={a.id} style={styles.session}>
                    <Text style={styles.sessionTitle}>{a.title}</Text>
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
                  </View>
                ))}
                <FormField label="Achievement title" value={achTitle} onChangeText={setAchTitle} />
                <FormField label="Description" value={achDesc} onChangeText={setAchDesc} />
                <FormField
                  label="Year"
                  value={achYear}
                  onChangeText={setAchYear}
                  keyboardType="number-pad"
                />
                <PrimaryButton title="Add achievement" onPress={addAchievement} />
              </>
            ) : null}

            {tab === 'history' ? (
              <>
                <Text style={styles.h2}>Previous trainings</Text>
                {history.length === 0 ? (
                  <Text style={styles.muted}>No completed trainings yet.</Text>
                ) : (
                  history.map((item) => (
                    <View key={item.id} style={styles.session}>
                      <Text style={styles.sessionTitle}>{item.courseName}</Text>
                      <Text style={styles.meta}>{item.collegeName}</Text>
                      <Text style={styles.meta}>
                        {item.startDate} → {item.endDate} · Batch {item.batchSize}
                      </Text>
                    </View>
                  ))
                )}
              </>
            ) : null}

            {tab === 'feedback' ? (
              <>
                <Text style={styles.h2}>Feedback</Text>
                {feedback.length === 0 ? (
                  <Text style={styles.muted}>
                    No feedback yet from TASK Admin, colleges, or students.
                  </Text>
                ) : (
                  feedback.map((item) => (
                    <View key={item.id} style={styles.session}>
                      <Text style={styles.sessionTitle}>
                        {item.fromName} ({item.fromRole.replace('_', ' ')})
                        {item.rating ? ` · ${item.rating}/5` : ''}
                      </Text>
                      {item.courseName ? <Text style={styles.meta}>{item.courseName}</Text> : null}
                      <Text style={styles.bio}>{item.comment}</Text>
                      <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  ))
                )}
              </>
            ) : null}
          </>
        ) : null}

        <View style={styles.gap} />
        <PrimaryButton title="Sign Out" variant="secondary" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  name: { flex: 1, fontWeight: '800', color: colors.text, fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  skills: { marginTop: 6, color: colors.primaryDark, fontWeight: '600', fontSize: 12 },
  bio: { marginTop: 8, color: colors.text, lineHeight: 20, fontSize: 13 },
  warn: { marginTop: 8, color: colors.warning, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  danger: { marginTop: 8, color: colors.danger, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  ok: { marginTop: 8, color: colors.success, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  h2: { marginTop: 16, marginBottom: 8, fontWeight: '800', color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  session: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  sessionTitle: { fontWeight: '700', color: colors.text, marginBottom: 2, flex: 1 },
  openLink: {
    marginTop: 10,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  gap: { height: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  linkDanger: { color: colors.danger, marginTop: 6, fontWeight: '600', fontSize: 12 },
});

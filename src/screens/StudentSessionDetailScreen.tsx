import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { DropdownField, FormField, PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { sessionContentApi } from '../services/sessionContentApi';
import { studentApi } from '../services/studentApi';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type {
  AssignmentSubmission,
  SessionAssignment,
  SessionAttendance,
  SessionCertificate,
  SessionMaterial,
} from '../types/sessionContent';
import type { StudentRecord } from '../types/student';
import type { StudentTrainerQuery, TrainerFeedback } from '../types/trainer';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSessionDetail'>;
type Tab =
  | 'materials'
  | 'assignments'
  | 'attendance'
  | 'certificates'
  | 'feedback'
  | 'queries';

const RATING_OPTIONS = [
  { label: '5 — Excellent', value: '5' },
  { label: '4 — Good', value: '4' },
  { label: '3 — Average', value: '3' },
  { label: '2 — Poor', value: '2' },
  { label: '1 — Very poor', value: '1' },
];

const TABS: { key: Tab; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'queries', label: 'Queries' },
];

function fileExt(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

function demoOpenFile(fileName: string) {
  Alert.alert(
    'Demo file',
    `${fileName}\n\nIn production this would open or download the document. For this UAT build, file viewing is simulated.`,
  );
}

export function StudentSessionDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('materials');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [session, setSession] = useState<CourseRequest | null>(null);
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [certificates, setCertificates] = useState<SessionCertificate[]>([]);
  const [myFeedback, setMyFeedback] = useState<TrainerFeedback[]>([]);
  const [queries, setQueries] = useState<StudentTrainerQuery[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');
  const [submitNotes, setSubmitNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.studentId) return;
    const profile = await studentApi.getStudent(user.studentId);
    setStudent(profile);
    const item = await sessionContentApi.getSession(requestId);
    setSession(item);
    setMaterials(await sessionContentApi.listMaterials(requestId));
    setAssignments(await sessionContentApi.listAssignments(requestId));
    setSubmissions(await sessionContentApi.listMySubmissions(requestId, user.studentId));
    setAttendance(await sessionContentApi.listAttendanceForStudent(requestId, user.studentId));
    const allCerts = await sessionContentApi.listCertificates(requestId);
    setCertificates(allCerts.filter((c) => c.studentId === user.studentId));
    if (item?.trainerId) {
      const allFb = await trainerApi.listFeedback(item.trainerId);
      setMyFeedback(
        allFb.filter(
          (f) =>
            f.requestId === requestId &&
            f.fromRole === 'student' &&
            f.studentId === user.studentId,
        ),
      );
    } else {
      setMyFeedback([]);
    }
    setQueries(
      (await trainerApi.listQueriesForStudent(user.studentId)).filter(
        (q) => q.requestId === requestId,
      ),
    );
  }, [requestId, user?.studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submissionByAssignment = useMemo(() => {
    const map: Record<string, AssignmentSubmission> = {};
    for (const s of submissions) map[s.assignmentId] = s;
    return map;
  }, [submissions]);

  const presentCount = attendance.filter(
    (a) => a.status === 'present' || a.status === 'late',
  ).length;
  const pendingAssignments = assignments.filter((a) => {
    const mine = submissionByAssignment[a.id];
    return !mine || mine.status === 'needs_revision';
  }).length;

  const tabCounts: Partial<Record<Tab, number>> = {
    materials: materials.length,
    assignments: assignments.length,
    attendance: attendance.length,
    certificates: certificates.length,
    feedback: myFeedback.length,
    queries: queries.length,
  };

  const submitWork = async (assignmentId: string) => {
    if (!student) return;
    try {
      setSaving(true);
      const file = await pickMockDocument();
      await sessionContentApi.submitAssignment({
        assignmentId,
        requestId,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        file: { ...file, uploadedAt: new Date().toISOString() },
        notes: submitNotes[assignmentId],
      });
      setSubmitNotes((prev) => ({ ...prev, [assignmentId]: '' }));
      Alert.alert('Submitted', 'Your assignment was sent to the trainer.');
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Unable to submit', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = async () => {
    if (!student || !session?.trainerId) return;
    try {
      setSaving(true);
      await trainerApi.addFeedback({
        trainerId: session.trainerId,
        requestId: session.id,
        courseName: session.courseName,
        fromRole: 'student',
        fromName: `${student.firstName} ${student.lastName}`,
        studentId: student.id,
        rating: rating ? Number(rating) : undefined,
        comment,
      });
      setComment('');
      setRating('');
      Alert.alert('Thanks', 'Your feedback was sent to the trainer.');
      await load();
    } catch (e) {
      Alert.alert('Unable to send', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const askQuery = async () => {
    if (!student || !session?.trainerId) return;
    try {
      setSaving(true);
      await trainerApi.submitStudentQuery({
        trainerId: session.trainerId,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        collegeName: student.collegeName,
        requestId: session.id,
        courseName: session.courseName,
        question,
      });
      setQuestion('');
      Alert.alert('Sent', 'Your query was sent to the trainer.');
      await load();
    } catch (e) {
      Alert.alert('Unable to send', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
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
        <PanelHeader
          title={session?.courseName || 'Session'}
          subtitle={
            session
              ? `${session.startDate} to ${session.endDate} · ${session.branch || 'Batch'}`
              : 'Loading session…'
          }
        />

        <StatTiles
          items={[
            { label: 'Trainer', value: session?.trainerName || 'TBA' },
            { label: 'Materials', value: materials.length },
            { label: 'Pending work', value: pendingAssignments },
            { label: 'Days marked', value: presentCount },
          ]}
        />

        {!session?.trainerId ? (
          <DataCard>
            <Text style={styles.warnTitle}>Trainer not assigned yet</Text>
            <Text style={styles.warnBody}>
              Materials, feedback, and queries unlock after TASK Admin assigns a trainer.
            </Text>
          </DataCard>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          style={styles.tabScroll}
        >
          {TABS.map((item) => {
            const active = tab === item.key;
            const count = tabCounts[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
                {typeof count === 'number' ? (
                  <View style={[styles.countPill, active && styles.countPillActive]}>
                    <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'materials' ? (
          <>
            <SectionLabel>Learning materials</SectionLabel>
            {materials.length === 0 ? (
              <EmptyState
                title="No materials yet"
                body="Your trainer will upload slides and notes here."
              />
            ) : (
              materials.map((item) => (
                <DataCard key={item.id} accent>
                  <View style={styles.cardTop}>
                    <View style={styles.fileChip}>
                      <Text style={styles.fileChipText}>{fileExt(item.file.fileName)}</Text>
                    </View>
                    <View style={styles.cardMain}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.meta}>{item.description}</Text>
                      ) : null}
                      <Text style={styles.meta}>
                        {item.file.fileName} · {item.file.sizeLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.ghostBtn}
                      onPress={() => demoOpenFile(item.file.fileName)}
                    >
                      <Text style={styles.ghostBtnText}>Open</Text>
                    </Pressable>
                    <Pressable
                      style={styles.primarySoftBtn}
                      onPress={() => demoOpenFile(item.file.fileName)}
                    >
                      <Text style={styles.primarySoftBtnText}>Download</Text>
                    </Pressable>
                  </View>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'assignments' ? (
          <>
            <SectionLabel>Assignments</SectionLabel>
            {assignments.length === 0 ? (
              <EmptyState title="No assignments posted" body="Check back after the trainer posts work." />
            ) : (
              assignments.map((item) => {
                const mine = submissionByAssignment[item.id];
                return (
                  <DataCard key={item.id} accent>
                    <View style={styles.row}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {mine ? <StatusBadge status={mine.status} /> : (
                        <StatusBadge status="pending" />
                      )}
                    </View>
                    <Text style={styles.body}>{item.instructions}</Text>
                    {item.dueDate ? <Text style={styles.meta}>Due: {item.dueDate}</Text> : null}
                    {item.file ? (
                      <Pressable
                        onPress={() => demoOpenFile(item.file!.fileName)}
                        style={styles.inlineLink}
                      >
                        <Text style={styles.linkText}>
                          Attachment: {item.file.fileName} · {item.file.sizeLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                    {mine ? (
                      <>
                        <Text style={styles.meta}>
                          Your file: {mine.file.fileName} · {mine.file.sizeLabel}
                        </Text>
                        {mine.trainerRemark ? (
                          <Text style={styles.ok}>Trainer: {mine.trainerRemark}</Text>
                        ) : null}
                        {mine.status === 'needs_revision' ? (
                          <Text style={styles.warnBody}>Please resubmit after revising.</Text>
                        ) : null}
                      </>
                    ) : null}
                    {!mine || mine.status === 'needs_revision' ? (
                      <>
                        <FormField
                          label="Notes (optional)"
                          value={submitNotes[item.id] || ''}
                          onChangeText={(v) =>
                            setSubmitNotes((prev) => ({ ...prev, [item.id]: v }))
                          }
                        />
                        <PrimaryButton
                          title={
                            saving
                              ? 'Uploading…'
                              : mine
                                ? 'Resubmit assignment'
                                : 'Submit assignment'
                          }
                          onPress={() => submitWork(item.id)}
                          disabled={saving}
                        />
                      </>
                    ) : null}
                  </DataCard>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'attendance' ? (
          <>
            <SectionLabel>Your attendance</SectionLabel>
            {attendance.length === 0 ? (
              <EmptyState
                title="No attendance marked"
                body="Days appear here after the trainer marks the register."
              />
            ) : (
              attendance.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.sessionDate}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.meta}>
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </Text>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'certificates' ? (
          <>
            <SectionLabel>Your certificates</SectionLabel>
            {certificates.length === 0 ? (
              <EmptyState
                title="No certificate yet"
                body="Needs at least 75% attendance (Present/Late) and all assignments accepted."
              />
            ) : (
              certificates.map((item) => (
                <DataCard key={item.id} accent>
                  <Text style={styles.itemTitle}>{item.courseName}</Text>
                  <Text style={styles.ok}>{item.certificateCode}</Text>
                  <Text style={styles.meta}>
                    Issued by {item.issuedByName} · {new Date(item.issuedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.meta}>{item.collegeName}</Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.primarySoftBtn}
                      onPress={() =>
                        Alert.alert(
                          'Certificate',
                          `${item.certificateCode}\n\nDownload is simulated in this UAT demo.`,
                        )
                      }
                    >
                      <Text style={styles.primarySoftBtnText}>Download certificate</Text>
                    </Pressable>
                  </View>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            <SectionLabel>Your feedback</SectionLabel>
            {myFeedback.length === 0 ? (
              <EmptyState
                title="No feedback submitted"
                body="Share a short rating and comment after attending the session."
              />
            ) : (
              myFeedback.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.itemTitle}>
                    Submitted{item.rating ? ` · ${item.rating}/5` : ''}
                  </Text>
                  <Text style={styles.body}>{item.comment}</Text>
                </DataCard>
              ))
            )}
            {session?.trainerId ? (
              <>
                <SectionLabel>Share feedback with trainer</SectionLabel>
                <DataCard>
                  <DropdownField
                    label="Rating (optional)"
                    value={rating}
                    onChange={setRating}
                    options={RATING_OPTIONS}
                    placeholder="Select rating"
                  />
                  <FormField
                    label="Comments"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                    required
                  />
                  <PrimaryButton
                    title={saving ? 'Sending…' : 'Submit feedback'}
                    onPress={submitFeedback}
                    disabled={saving}
                  />
                </DataCard>
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'queries' ? (
          <>
            <SectionLabel>Your queries</SectionLabel>
            {queries.length === 0 ? (
              <EmptyState
                title="No queries yet"
                body="Ask the trainer if you need help with this session."
              />
            ) : (
              queries.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>Your question</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.body}>{item.question}</Text>
                  {item.answer ? (
                    <Text style={styles.ok}>Trainer: {item.answer}</Text>
                  ) : (
                    <Text style={styles.meta}>Awaiting trainer response…</Text>
                  )}
                </DataCard>
              ))
            )}
            {session?.trainerId ? (
              <>
                <SectionLabel>Ask the trainer</SectionLabel>
                <DataCard>
                  <TextInput
                    style={styles.queryInput}
                    placeholder="Type your question…"
                    placeholderTextColor={colors.textMuted}
                    value={question}
                    onChangeText={setQuestion}
                    multiline
                  />
                  <PrimaryButton
                    title={saving ? 'Sending…' : 'Send query'}
                    onPress={askQuery}
                    disabled={saving}
                  />
                </DataCard>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  tabScroll: { marginBottom: 8, marginHorizontal: -4 },
  tabRow: { paddingHorizontal: 4, gap: 8, paddingBottom: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  countPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  countTextActive: { color: colors.white },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardMain: { flex: 1 },
  fileChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  fileChipText: { color: colors.primaryDark, fontWeight: '800', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  ghostBtnText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  primarySoftBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
  },
  primarySoftBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  inlineLink: { marginTop: 6, alignSelf: 'flex-start' },
  linkText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  itemTitle: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20, fontSize: 13 },
  ok: { marginTop: 8, color: colors.success, fontWeight: '600', fontSize: 12, lineHeight: 18 },
  warnTitle: { fontWeight: '700', color: colors.warning, marginBottom: 4 },
  warnBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  queryInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
});

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
import { DropdownField, FormField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
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
    if (item.trainerId) {
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
    <Screen
      title={session?.courseName || 'Session'}
      subtitle={
        session
          ? `${session.startDate} → ${session.endDate} · Trainer: ${session.trainerName || 'TBA'}`
          : 'Loading…'
      }
      showLogo={false}
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
        {!session?.trainerId ? (
          <Text style={styles.warn}>
            Trainer is not assigned yet. Materials, feedback, and queries unlock after TASK Admin
            assigns a trainer.
          </Text>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['materials', 'Materials'],
              ['assignments', 'Assignments'],
              ['attendance', 'Attendance'],
              ['certificates', 'Certificates'],
              ['feedback', 'Feedback'],
              ['queries', 'Queries'],
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

        {tab === 'materials' ? (
          <>
            <Text style={styles.h2}>Learning materials</Text>
            {materials.length === 0 ? (
              <Text style={styles.muted}>No materials uploaded by the trainer yet.</Text>
            ) : (
              materials.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
                  <Text style={styles.meta}>
                    {item.file.fileName} · {item.file.sizeLabel}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'assignments' ? (
          <>
            <Text style={styles.h2}>Assignments</Text>
            {assignments.length === 0 ? (
              <Text style={styles.muted}>No assignments posted yet.</Text>
            ) : (
              assignments.map((item) => {
                const mine = submissionByAssignment[item.id];
                return (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.row}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {mine ? <StatusBadge status={mine.status} /> : null}
                    </View>
                    <Text style={styles.body}>{item.instructions}</Text>
                    {item.dueDate ? <Text style={styles.meta}>Due: {item.dueDate}</Text> : null}
                    {item.file ? (
                      <Text style={styles.meta}>
                        Attachment: {item.file.fileName} · {item.file.sizeLabel}
                      </Text>
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
                          <Text style={styles.warn}>Please resubmit after revising.</Text>
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
                  </View>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'attendance' ? (
          <>
            <Text style={styles.h2}>Your attendance</Text>
            {attendance.length === 0 ? (
              <Text style={styles.muted}>No attendance marked yet for this session.</Text>
            ) : (
              attendance.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.sessionDate}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.meta}>
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'certificates' ? (
          <>
            <Text style={styles.h2}>Your certificates</Text>
            {certificates.length === 0 ? (
              <Text style={styles.muted}>
                No certificate yet. Criteria: minimum 75% attendance (Present/Late) and all
                assignments accepted by the trainer.
              </Text>
            ) : (
              certificates.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{item.courseName}</Text>
                  <Text style={styles.ok}>{item.certificateCode}</Text>
                  <Text style={styles.meta}>
                    Issued by {item.issuedByName} · {new Date(item.issuedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.meta}>{item.collegeName}</Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            <Text style={styles.h2}>Your feedback</Text>
            {myFeedback.length === 0 ? (
              <Text style={styles.muted}>You have not submitted feedback for this session yet.</Text>
            ) : (
              myFeedback.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>
                    Submitted{item.rating ? ` · ${item.rating}/5` : ''}
                  </Text>
                  <Text style={styles.body}>{item.comment}</Text>
                </View>
              ))
            )}
            {session?.trainerId ? (
              <>
                <Text style={styles.h2}>Share feedback with trainer</Text>
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
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'queries' ? (
          <>
            <Text style={styles.h2}>Your queries</Text>
            {queries.length === 0 ? (
              <Text style={styles.muted}>No queries raised for this session yet.</Text>
            ) : (
              queries.map((item) => (
                <View key={item.id} style={styles.item}>
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
                </View>
              ))
            )}
            {session?.trainerId ? (
              <>
                <Text style={styles.h2}>Ask the trainer</Text>
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
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
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
  h2: { marginTop: 14, marginBottom: 8, fontWeight: '800', color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  warn: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  itemTitle: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20, fontSize: 13 },
  ok: { marginTop: 8, color: colors.success, fontWeight: '600', fontSize: 12, lineHeight: 18 },
  queryInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
});

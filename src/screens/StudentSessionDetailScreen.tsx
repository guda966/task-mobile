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

function formatDueLabel(dueDate?: string): { text: string; urgent: boolean } | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Overdue · was due ${dueDate}`, urgent: true };
  if (days === 0) return { text: `Due today · ${dueDate}`, urgent: true };
  if (days === 1) return { text: `Due tomorrow · ${dueDate}`, urgent: true };
  if (days <= 3) return { text: `Due in ${days} days · ${dueDate}`, urgent: true };
  return { text: `Due ${dueDate}`, urgent: false };
}

function submissionStatusCopy(status?: string): { label: string; hint: string } {
  if (!status) {
    return {
      label: 'Not submitted',
      hint: 'Upload your file below, then tap Submit assignment.',
    };
  }
  if (status === 'submitted') {
    return {
      label: 'Submitted — awaiting trainer review',
      hint: 'You can wait for acceptance or a revision request.',
    };
  }
  if (status === 'needs_revision') {
    return {
      label: 'Needs revision',
      hint: 'Update your file using the trainer remark, then resubmit.',
    };
  }
  if (status === 'accepted') {
    return {
      label: 'Accepted',
      hint: 'This assignment is complete. No further action needed.',
    };
  }
  return { label: status, hint: '' };
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

        <View style={styles.tabGrid}>
          {TABS.map((item) => {
            const active = tab === item.key;
            const count = tabCounts[item.key] ?? 0;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'materials' ? (
          <>
            <SectionLabel>Learning materials</SectionLabel>
            <Text style={styles.helpText}>
              Use these files to prepare for class. Open to preview or Download to save a copy.
            </Text>
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
                      <Text style={styles.meta}>
                        Posted {new Date(item.createdAt).toLocaleDateString('en-IN')}
                        {session?.trainerName ? ` · by ${session.trainerName}` : ''}
                      </Text>
                    </View>
                  </View>
                  {item.description ? (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>What this is</Text>
                      <Text style={styles.infoBody}>{item.description}</Text>
                    </View>
                  ) : null}
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>File</Text>
                    <Text style={styles.infoBody}>
                      {item.file.fileName} · {item.file.sizeLabel}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.ghostBtn}
                      onPress={() => demoOpenFile(item.file.fileName)}
                    >
                      <Text style={styles.ghostBtnText}>Open / preview</Text>
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
            <Text style={styles.helpText}>
              Read the instructions, download any template, upload your work, then submit before the
              due date.
            </Text>
            {assignments.length === 0 ? (
              <EmptyState
                title="No assignments posted"
                body="Check back after the trainer posts work."
              />
            ) : (
              assignments.map((item) => {
                const mine = submissionByAssignment[item.id];
                const due = formatDueLabel(item.dueDate);
                const statusCopy = submissionStatusCopy(mine?.status);
                const canSubmit = !mine || mine.status === 'needs_revision';
                return (
                  <DataCard key={item.id} accent>
                    <View style={styles.row}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <StatusBadge status={mine?.status || 'pending'} />
                    </View>

                    {due ? (
                      <View style={[styles.dueBox, due.urgent && styles.dueBoxUrgent]}>
                        <Text style={[styles.dueText, due.urgent && styles.dueTextUrgent]}>
                          {due.text}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.statusBox, mine?.status === 'accepted' && styles.statusOk]}>
                      <Text style={styles.infoLabel}>Your submission status</Text>
                      <Text style={styles.statusLabel}>{statusCopy.label}</Text>
                      <Text style={styles.infoBody}>{statusCopy.hint}</Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>What to do</Text>
                      <Text style={styles.infoBody}>{item.instructions}</Text>
                    </View>

                    {item.file ? (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Template / attachment from trainer</Text>
                        <Text style={styles.infoBody}>
                          {item.file.fileName} · {item.file.sizeLabel}
                        </Text>
                        <Pressable
                          onPress={() => demoOpenFile(item.file!.fileName)}
                          style={styles.inlineLink}
                        >
                          <Text style={styles.linkText}>Download template</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {mine ? (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Your uploaded file</Text>
                        <Text style={styles.infoBody}>
                          {mine.file.fileName} · {mine.file.sizeLabel}
                        </Text>
                        <Text style={styles.meta}>
                          Submitted {new Date(mine.submittedAt).toLocaleString('en-IN')}
                        </Text>
                        {mine.trainerRemark ? (
                          <Text style={styles.ok}>Trainer remark: {mine.trainerRemark}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {canSubmit ? (
                      <View style={styles.submitBox}>
                        <Text style={styles.infoLabel}>
                          {mine ? 'Step: resubmit your work' : 'Step: submit your work'}
                        </Text>
                        <Text style={styles.stepLine}>1. Prepare your file (PDF / DOC)</Text>
                        <Text style={styles.stepLine}>2. Add optional notes for the trainer</Text>
                        <Text style={styles.stepLine}>
                          3. Tap {mine ? 'Resubmit' : 'Submit'} — a demo file picker will open
                        </Text>
                        <FormField
                          label="Notes for trainer (optional)"
                          value={submitNotes[item.id] || ''}
                          onChangeText={(v) =>
                            setSubmitNotes((prev) => ({ ...prev, [item.id]: v }))
                          }
                          placeholder="Example: uploaded revised reflection"
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
                      </View>
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
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 12,
  },
  tab: {
    width: '32%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 11,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: colors.white },
  countText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
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
  helpText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    marginTop: -4,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  infoLabel: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  dueBox: {
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dueBoxUrgent: { backgroundColor: colors.warningSoft },
  dueText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  dueTextUrgent: { color: colors.warning },
  statusBox: {
    marginTop: 10,
    backgroundColor: colors.pendingSoft,
    borderRadius: 8,
    padding: 10,
  },
  statusOk: { backgroundColor: colors.successSoft },
  statusLabel: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 2 },
  submitBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
  },
  stepLine: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 2 },
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

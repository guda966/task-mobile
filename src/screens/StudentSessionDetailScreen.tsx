import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
  SegmentedTabs,
  StatTiles,
} from '../components/college/PanelChrome';
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
  SessionEvidence,
  SessionMaterial,
} from '../types/sessionContent';
import type { StudentRecord } from '../types/student';
import type { StudentTrainerQuery, TrainerFeedback } from '../types/trainer';
import { requesterLabel } from '../utils/courseRequestLabels';
import { mapsUrl } from '../utils/geoPhoto';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSessionDetail'>;
type Tab =
  | 'overview'
  | 'materials'
  | 'assignments'
  | 'results'
  | 'attendance'
  | 'evidence'
  | 'certificates'
  | 'feedback'
  | 'queries';

type Eligibility = {
  eligible: boolean;
  attendancePercent: number;
  attendedDays: number;
  totalDays: number;
  assignmentsTotal: number;
  assignmentsAccepted: number;
  reasons: string[];
};

const RATING_OPTIONS = [
  { label: '5 — Excellent', value: '5' },
  { label: '4 — Good', value: '4' },
  { label: '3 — Average', value: '3' },
  { label: '2 — Poor', value: '2' },
  { label: '1 — Very poor', value: '1' },
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
    return { label: 'Not submitted', hint: 'Choose a file from your device, then submit.' };
  }
  if (status === 'submitted') {
    return { label: 'Under review', hint: 'Trainer will accept, score, or ask for revision.' };
  }
  if (status === 'needs_revision') {
    return {
      label: 'Needs revision',
      hint: 'Update your file using the trainer remark, then resubmit.',
    };
  }
  if (status === 'accepted') {
    return { label: 'Accepted', hint: 'Score (if entered) appears under Results.' };
  }
  return { label: status, hint: '' };
}

export function StudentSessionDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [session, setSession] = useState<CourseRequest | null>(null);
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [certificates, setCertificates] = useState<SessionCertificate[]>([]);
  const [evidence, setEvidence] = useState<SessionEvidence[]>([]);
  const [myFeedback, setMyFeedback] = useState<TrainerFeedback[]>([]);
  const [queries, setQueries] = useState<StudentTrainerQuery[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');
  const [submitNotes, setSubmitNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAskQuery, setShowAskQuery] = useState(false);

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
    setEvidence(await sessionContentApi.listEvidence(requestId));
    setEligibility(
      await sessionContentApi.getCertificateEligibility(requestId, user.studentId),
    );
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

  const actionAssignments = useMemo(
    () =>
      assignments.filter((a) => {
        const mine = submissionByAssignment[a.id];
        return !mine || mine.status === 'needs_revision';
      }),
    [assignments, submissionByAssignment],
  );

  const scoredResults = useMemo(
    () =>
      submissions.filter((s) => s.status === 'accepted' || s.score !== undefined),
    [submissions],
  );

  const openQueries = useMemo(() => queries.filter((q) => q.status === 'open'), [queries]);
  const answeredQueries = useMemo(
    () => queries.filter((q) => q.status === 'answered'),
    [queries],
  );

  const attendanceStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const row of attendance) {
      if (row.status === 'present') present += 1;
      else if (row.status === 'late') late += 1;
      else if (row.status === 'absent') absent += 1;
    }
    const marked = attendance.length;
    const good = present + late;
    const pct = marked === 0 ? 0 : Math.round((good / marked) * 100);
    return { present, late, absent, marked, pct };
  }, [attendance]);

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'materials', label: `Materials (${materials.length})` },
    {
      value: 'assignments',
      label: actionAssignments.length
        ? `Assignments (${actionAssignments.length})`
        : 'Assignments',
    },
    {
      value: 'results',
      label: scoredResults.length ? `Results (${scoredResults.length})` : 'Results',
    },
    { value: 'attendance', label: 'Student attendance' },
    {
      value: 'evidence',
      label: evidence.length ? `Session photos (${evidence.length})` : 'Session photos',
    },
    { value: 'certificates', label: certificates.length ? 'Certificate' : 'Certificate' },
    {
      value: 'feedback',
      label: myFeedback.length ? 'Feedback ✓' : 'Feedback',
    },
    {
      value: 'queries',
      label: openQueries.length ? `Queries (${openQueries.length})` : 'Queries',
    },
  ];

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
      Alert.alert(
        'Submitted',
        'Your file was sent to the trainer. Check Results after it is reviewed and scored.',
      );
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
    if (!comment.trim()) {
      Alert.alert('Comment required', 'Write a short comment about this training.');
      return;
    }
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
      Alert.alert('Thanks', 'Your training feedback was saved.');
      await load();
      setTab('certificates');
    } catch (e) {
      Alert.alert('Unable to send', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const askQuery = async () => {
    if (!student || !session?.trainerId) return;
    if (!question.trim()) {
      Alert.alert('Question required', 'Type your question for the trainer.');
      return;
    }
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
      setShowAskQuery(false);
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
          ? `${requesterLabel(session)} · ${session.startDate} → ${session.endDate}`
          : 'Loading session…'
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
        keyboardShouldPersistTaps="handled"
      >
        {session ? (
          <DataCard>
            <Text style={styles.eyebrow}>Your training session</Text>
            <Text style={styles.meta}>{requesterLabel(session)}</Text>
            <Text style={styles.meta}>
              {session.branch} · YOG {session.yearOfGraduation}
              {session.trainerName ? ` · Trainer ${session.trainerName}` : ''}
            </Text>
            {!session.trainerId ? (
              <Text style={styles.warn}>
                Trainer not assigned yet — materials and assignments appear after TASK assigns one.
              </Text>
            ) : null}
          </DataCard>
        ) : null}

        <SegmentedTabs value={tab} options={tabOptions} onChange={setTab} />

        {tab === 'overview' ? (
          <>
            <PanelHeader
              title="Session overview"
              subtitle="What to do next in this training"
            />
            <StatTiles
              items={[
                {
                  label: 'Action items',
                  value: String(actionAssignments.length),
                  hint: 'Assignments to submit',
                  onPress: () => setTab('assignments'),
                },
                {
                  label: 'Student attendance',
                  value: `${attendanceStats.pct}%`,
                  hint: `${attendanceStats.marked} day(s) marked`,
                  onPress: () => setTab('attendance'),
                },
                {
                  label: 'Session photos',
                  value: String(evidence.length),
                  hint: 'With location',
                  onPress: () => setTab('evidence'),
                },
                {
                  label: 'Scores',
                  value: String(scoredResults.length),
                  onPress: () => setTab('results'),
                },
                {
                  label: 'Certificate',
                  value: certificates.length ? 'Issued' : eligibility?.eligible ? 'Ready' : 'Pending',
                  onPress: () => setTab('certificates'),
                },
              ]}
            />

            <SectionLabel>Suggested path</SectionLabel>
            <DataCard>
              <Text style={styles.body}>
                1. Open Materials → 2. Submit Assignments → 3. Check student attendance → 4. View
                session photos → 5. View Results → 6. Share Feedback → 7. Collect Certificate when
                ready.
              </Text>
            </DataCard>

            {actionAssignments.length > 0 ? (
              <PrimaryButton
                title={`Submit ${actionAssignments.length} assignment(s)`}
                onPress={() => setTab('assignments')}
              />
            ) : null}
            <View style={styles.gap} />
            {myFeedback.length === 0 && session?.trainerId ? (
              <PrimaryButton
                title="Share training feedback"
                variant="secondary"
                onPress={() => setTab('feedback')}
              />
            ) : null}
            <View style={styles.gap} />
            {openQueries.length > 0 ? (
              <PrimaryButton
                title={`View ${openQueries.length} open quer${openQueries.length === 1 ? 'y' : 'ies'}`}
                variant="secondary"
                onPress={() => setTab('queries')}
              />
            ) : null}
          </>
        ) : null}

        {tab === 'materials' ? (
          <>
            <PanelHeader
              title="Learning materials"
              subtitle="Slides and notes uploaded by your trainer"
            />
            {materials.length === 0 ? (
              <EmptyState
                title="No materials yet"
                body="Your trainer will upload slides and notes here."
              />
            ) : (
              materials.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.cardTop}>
                    <View style={styles.fileChip}>
                      <Text style={styles.fileChipText}>{fileExt(item.file.fileName)}</Text>
                    </View>
                    <View style={styles.cardMain}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.meta}>{item.description}</Text>
                      ) : null}
                      <Text style={styles.meta}>
                        {item.file.fileName} · {item.file.sizeLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gap} />
                  <PrimaryButton
                    title="View / download"
                    variant="secondary"
                    onPress={() => demoOpenFile(item.file.fileName)}
                  />
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'assignments' ? (
          <>
            <PanelHeader
              title="Assignments"
              subtitle="Submit from your device. Scores appear under Results after the trainer reviews."
            />
            {actionAssignments.length > 0 ? (
              <SectionLabel>{`Needs your action (${actionAssignments.length})`}</SectionLabel>
            ) : null}
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
                  <DataCard key={item.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <StatusBadge status={mine?.status || 'pending'} />
                    </View>
                    {due ? (
                      <View style={[styles.dueChip, due.urgent && styles.dueChipUrgent]}>
                        <Text
                          style={[styles.dueChipText, due.urgent && styles.dueChipTextUrgent]}
                        >
                          {due.text}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.body}>{item.instructions}</Text>
                    {item.file ? (
                      <Pressable
                        onPress={() => demoOpenFile(item.file!.fileName)}
                        style={styles.templateBtn}
                      >
                        <Text style={styles.templateBtnText}>
                          Download template · {item.file.fileName}
                        </Text>
                      </Pressable>
                    ) : null}
                    <View style={styles.statusPanel}>
                      <Text style={styles.statusPanelLabel}>{statusCopy.label}</Text>
                      <Text style={styles.statusHint}>{statusCopy.hint}</Text>
                      {mine ? (
                        <Text style={styles.meta}>
                          Uploaded: {mine.file.fileName} · {mine.file.sizeLabel}
                        </Text>
                      ) : null}
                      {mine?.trainerRemark ? (
                        <Text style={styles.remark}>Trainer: {mine.trainerRemark}</Text>
                      ) : null}
                      {mine?.score !== undefined && mine.maxScore !== undefined ? (
                        <Text style={styles.scoreLine}>
                          Score: {mine.score} / {mine.maxScore}
                        </Text>
                      ) : null}
                    </View>
                    {canSubmit ? (
                      <View style={styles.submitPanel}>
                        <Text style={styles.submitTitle}>Submit your work</Text>
                        <Text style={styles.stepLine}>1. Download template if provided</Text>
                        <Text style={styles.stepLine}>2. Prepare your PDF or DOC</Text>
                        <Text style={styles.stepLine}>3. Choose file & submit below</Text>
                        <FormField
                          label="Notes for trainer (optional)"
                          value={submitNotes[item.id] || ''}
                          onChangeText={(v) =>
                            setSubmitNotes((prev) => ({ ...prev, [item.id]: v }))
                          }
                          placeholder="Optional message"
                        />
                        <PrimaryButton
                          title={
                            saving
                              ? 'Uploading…'
                              : mine
                                ? 'Choose file & resubmit'
                                : 'Choose file & submit'
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

        {tab === 'results' ? (
          <>
            <PanelHeader
              title="Results & scores"
              subtitle="Shown after the trainer accepts your submission (out of 20)"
            />
            {scoredResults.length === 0 ? (
              <EmptyState
                title="No scores yet"
                body="When your trainer accepts an assignment, the score and remark show here."
              />
            ) : (
              assignments.map((item) => {
                const mine = submissionByAssignment[item.id];
                if (!mine || (mine.status !== 'accepted' && mine.score === undefined)) {
                  return null;
                }
                const pct =
                  mine.score !== undefined && mine.maxScore
                    ? Math.round((mine.score / mine.maxScore) * 100)
                    : null;
                return (
                  <DataCard key={item.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <StatusBadge status={mine.status} />
                    </View>
                    {mine.score !== undefined && mine.maxScore !== undefined ? (
                      <View style={styles.scoreHero}>
                        <Text style={styles.scoreHeroValue}>
                          {mine.score}
                          <Text style={styles.scoreHeroMax}> / {mine.maxScore}</Text>
                        </Text>
                        {pct !== null ? (
                          <Text style={styles.scoreHeroPct}>{pct}%</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.meta}>Accepted — score not entered by trainer</Text>
                    )}
                    {mine.trainerRemark ? (
                      <Text style={styles.remark}>Remark: {mine.trainerRemark}</Text>
                    ) : null}
                    <Text style={styles.meta}>
                      Reviewed{' '}
                      {mine.reviewedAt
                        ? new Date(mine.reviewedAt).toLocaleDateString('en-IN')
                        : '—'}
                    </Text>
                  </DataCard>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'attendance' ? (
          <>
            <PanelHeader
              title="Your attendance"
              subtitle="Days the trainer has marked for this batch"
            />
            {attendance.length === 0 ? (
              <EmptyState
                title="No attendance marked yet"
                body="Days appear here after the trainer marks the register."
              />
            ) : (
              <>
                <StatTiles
                  items={[
                    { label: 'Present / Late', value: `${attendanceStats.pct}%` },
                    { label: 'Present', value: String(attendanceStats.present) },
                    { label: 'Late', value: String(attendanceStats.late) },
                    { label: 'Absent', value: String(attendanceStats.absent) },
                  ]}
                />
                <SectionLabel>Day-wise register</SectionLabel>
                {attendance.map((item) => (
                  <DataCard key={item.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>{item.sessionDate}</Text>
                      <StatusBadge status={item.status} />
                    </View>
                  </DataCard>
                ))}
              </>
            )}
          </>
        ) : null}

        {tab === 'evidence' ? (
          <>
            <PanelHeader
              title="Session photos"
              subtitle="Photos with location posted by your trainer"
            />
            {evidence.length === 0 ? (
              <EmptyState
                title="No session photos yet"
                body="When your trainer posts a session photo with location, it will appear here."
              />
            ) : (
              evidence.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.evCardRow}>
                    {item.photo.dataUrl ? (
                      <Image
                        source={{ uri: item.photo.dataUrl }}
                        style={styles.evThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.evThumb, styles.evThumbPlaceholder]} />
                    )}
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{item.sessionDate}</Text>
                      {item.caption ? <Text style={styles.body}>{item.caption}</Text> : null}
                      <Text style={styles.meta}>
                        {item.trainerName} · {item.geo.latitude}, {item.geo.longitude}
                      </Text>
                      <Pressable
                        onPress={() =>
                          Linking.openURL(mapsUrl(item.geo.latitude, item.geo.longitude))
                        }
                      >
                        <Text style={styles.link}>Open location in Maps</Text>
                      </Pressable>
                    </View>
                  </View>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'certificates' ? (
          <>
            <PanelHeader
              title="Certificate"
              subtitle="Issued by your trainer when eligibility rules are met"
            />
            {certificates.length > 0 ? (
              certificates.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.cardTitle}>{item.courseName}</Text>
                  <Text style={styles.okHero}>{item.certificateCode}</Text>
                  <Text style={styles.meta}>
                    Issued {new Date(item.issuedAt).toLocaleDateString()} · {item.issuedByName}
                  </Text>
                  <View style={styles.gap} />
                  <PrimaryButton
                    title="Download (demo)"
                    variant="secondary"
                    onPress={() =>
                      Alert.alert(
                        'Certificate',
                        `${item.certificateCode}\n\nDownload is simulated in this UAT demo.`,
                      )
                    }
                  />
                </DataCard>
              ))
            ) : (
              <DataCard>
                <Text style={styles.cardTitle}>
                  {eligibility?.eligible ? 'Ready for certificate' : 'Not ready yet'}
                </Text>
                <Text style={styles.meta}>
                  Rules: ≥75% attendance (Present/Late) and all assignments accepted by the trainer.
                </Text>
                {eligibility ? (
                  <>
                    <Text style={styles.meta}>
                      Attendance {eligibility.attendancePercent}% ({eligibility.attendedDays}/
                      {eligibility.totalDays} days) · Assignments{' '}
                      {eligibility.assignmentsAccepted}/{eligibility.assignmentsTotal} accepted
                    </Text>
                    {eligibility.reasons.map((r) => (
                      <Text key={r} style={styles.remark}>
                        · {r}
                      </Text>
                    ))}
                  </>
                ) : null}
                <View style={styles.gap} />
                <PrimaryButton
                  title="Check assignments"
                  variant="secondary"
                  onPress={() => setTab('assignments')}
                />
              </DataCard>
            )}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            <PanelHeader
              title="Training feedback"
              subtitle="Tell TASK how this batch went for you"
            />
            {myFeedback.length > 0 ? (
              <>
                <SectionLabel>Your submitted feedback</SectionLabel>
                {myFeedback.map((item) => (
                  <DataCard key={item.id}>
                    <Text style={styles.cardTitle}>
                      Submitted{item.rating ? ` · ${item.rating}/5` : ''}
                    </Text>
                    <Text style={styles.body}>{item.comment}</Text>
                    <Text style={styles.meta}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </DataCard>
                ))}
              </>
            ) : null}

            {session?.trainerId && myFeedback.length === 0 ? (
              <DataCard>
                <Text style={styles.cardTitle}>Share feedback</Text>
                <Text style={styles.meta}>
                  Rating and a short comment help improve future TASK batches.
                </Text>
                <DropdownField
                  label="Rating"
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
                  placeholder="What went well? What can improve?"
                />
                <PrimaryButton
                  title={saving ? 'Sending…' : 'Submit feedback'}
                  onPress={submitFeedback}
                  disabled={saving}
                />
              </DataCard>
            ) : null}

            {session?.trainerId && myFeedback.length > 0 ? (
              <EmptyState
                title="Feedback already submitted"
                body="You can still ask questions under Queries if you need help."
              />
            ) : null}

            {!session?.trainerId ? (
              <EmptyState title="Trainer not assigned" body="Feedback opens after a trainer is assigned." />
            ) : null}
          </>
        ) : null}

        {tab === 'queries' ? (
          <>
            <PanelHeader
              title="Ask your trainer"
              subtitle="Questions about this batch only"
              action={
                session?.trainerId ? (
                  <PrimaryButton
                    title={showAskQuery ? 'Cancel' : 'New query'}
                    variant="secondary"
                    onPress={() => setShowAskQuery((v) => !v)}
                  />
                ) : undefined
              }
            />

            {showAskQuery && session?.trainerId ? (
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
            ) : null}

            <SectionLabel>{`Open (${openQueries.length})`}</SectionLabel>
            {openQueries.length === 0 ? (
              <EmptyState title="No open queries" body="Use New query if you need help." />
            ) : (
              openQueries.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>Your question</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.body}>{item.question}</Text>
                  <Text style={styles.meta}>Awaiting trainer response…</Text>
                </DataCard>
              ))
            )}

            {answeredQueries.length > 0 ? (
              <>
                <SectionLabel>{`Answered (${answeredQueries.length})`}</SectionLabel>
                {answeredQueries.map((item) => (
                  <DataCard key={item.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>Your question</Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text style={styles.body}>{item.question}</Text>
                    <Text style={styles.ok}>Trainer: {item.answer}</Text>
                  </DataCard>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  eyebrow: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20, fontSize: 13 },
  warn: { marginTop: 8, color: colors.warning, fontWeight: '600', fontSize: 12, lineHeight: 17 },
  ok: { marginTop: 8, color: colors.success, fontWeight: '600', fontSize: 12, lineHeight: 18 },
  okHero: {
    marginTop: 8,
    color: colors.success,
    fontWeight: '800',
    fontSize: 18,
  },
  gap: { height: 10 },
  flex: { flex: 1 },
  link: {
    color: colors.primaryDark,
    marginTop: 8,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  evCardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  evThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  evThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },
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
  dueChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    marginBottom: 4,
  },
  dueChipUrgent: { backgroundColor: colors.warningSoft },
  dueChipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 11 },
  dueChipTextUrgent: { color: colors.warning },
  templateBtn: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  statusPanel: {
    marginTop: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
  },
  statusPanelLabel: { fontWeight: '800', color: colors.text, fontSize: 13, marginBottom: 2 },
  statusHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  remark: { marginTop: 8, color: colors.warning, fontWeight: '600', fontSize: 12, lineHeight: 17 },
  scoreLine: { marginTop: 8, color: colors.success, fontWeight: '800', fontSize: 14 },
  submitPanel: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDCDC',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
  },
  submitTitle: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 13,
    marginBottom: 6,
  },
  stepLine: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  scoreHeroValue: { fontSize: 32, fontWeight: '800', color: colors.primaryDark },
  scoreHeroMax: { fontSize: 18, fontWeight: '600', color: colors.textMuted },
  scoreHeroPct: { marginBottom: 6, color: colors.success, fontWeight: '800', fontSize: 14 },
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DateField } from '../components/DateField';
import { FormField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { sessionContentApi } from '../services/sessionContentApi';
import { trainerApi } from '../services/trainerApi';
import { trainingApi } from '../services/trainingApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type {
  AssignmentSubmission,
  AttendanceStatus,
  SessionAssignment,
  SessionAttendance,
  SessionCertificate,
  SessionEvidence,
  SessionMaterial,
} from '../types/sessionContent';
import type { StudentTrainerQuery, TrainerFeedback } from '../types/trainer';
import type { TrainingRegistration } from '../types/training';
import { requesterLabel } from '../utils/courseRequestLabels';
import { getCurrentPosition, mapsUrl, pickImageWithPreview, type GeoPosition, type PickedImage } from '../utils/geoPhoto';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerSessionDetail'>;
type Tab =
  | 'overview'
  | 'materials'
  | 'assignments'
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function clampDate(date: string, start: string, end: string): string {
  if (date < start) return start;
  if (date > end) return end;
  return date;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function StatusChip({
  label,
  active,
  tone,
  onPress,
}: {
  label: string;
  active?: boolean;
  tone?: 'ok' | 'warn' | 'danger' | 'neutral';
  onPress: () => void;
}) {
  const toneStyle =
    tone === 'ok'
      ? styles.chipOk
      : tone === 'warn'
        ? styles.chipWarn
        : tone === 'danger'
          ? styles.chipDanger
          : styles.chipNeutral;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, toneStyle, active && styles.chipActive]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function TrainerSessionDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [session, setSession] = useState<CourseRequest | null>(null);
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [roster, setRoster] = useState<TrainingRegistration[]>([]);
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [certificates, setCertificates] = useState<SessionCertificate[]>([]);
  const [evidence, setEvidence] = useState<SessionEvidence[]>([]);
  const [eligibility, setEligibility] = useState<Record<string, Eligibility>>({});
  const [feedback, setFeedback] = useState<TrainerFeedback[]>([]);
  const [queries, setQueries] = useState<StudentTrainerQuery[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(todayIso());
  const [evidenceDate, setEvidenceDate] = useState(todayIso());
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<PickedImage | null>(null);
  const [evidenceGeo, setEvidenceGeo] = useState<GeoPosition | null>(null);
  const [dateReady, setDateReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [showPostAssignment, setShowPostAssignment] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Record<string, boolean>>({});
  const [selectedCerts, setSelectedCerts] = useState<Record<string, boolean>>({});

  const loadCore = useCallback(async () => {
    if (!user?.trainerId) return;
    const item = await sessionContentApi.getSession(requestId);
    setSession(item);
    if (item && !dateReady) {
      const preferred = clampDate(todayIso(), item.startDate, item.endDate);
      setAttendanceDate(preferred);
      setEvidenceDate(preferred);
      setDateReady(true);
    }
    setMaterials(await sessionContentApi.listMaterials(requestId));
    setAssignments(await sessionContentApi.listAssignments(requestId));
    setSubmissions(await sessionContentApi.listSubmissions(requestId));
    setCertificates(await sessionContentApi.listCertificates(requestId));
    setEvidence(await sessionContentApi.listEvidence(requestId));
    const regs = await trainingApi.listRegistrationsForSession(requestId);
    setRoster(regs);
    const nextElig: Record<string, Eligibility> = {};
    for (const reg of regs) {
      nextElig[reg.studentId] = await sessionContentApi.getCertificateEligibility(
        requestId,
        reg.studentId,
      );
    }
    setEligibility(nextElig);
    const allFb = await trainerApi.listFeedback(user.trainerId);
    setFeedback(allFb.filter((f) => f.requestId === requestId));
    const allQ = await trainerApi.listQueries(user.trainerId);
    setQueries(allQ.filter((q) => q.requestId === requestId));
  }, [dateReady, requestId, user?.trainerId]);

  const loadAttendance = useCallback(async () => {
    if (!DATE_RE.test(attendanceDate)) {
      setAttendance([]);
      return;
    }
    setAttendance(await sessionContentApi.listAttendance(requestId, attendanceDate));
  }, [attendanceDate, requestId]);

  useFocusEffect(
    useCallback(() => {
      loadCore();
    }, [loadCore]),
  );

  useEffect(() => {
    if (!dateReady) return;
    loadAttendance();
  }, [dateReady, loadAttendance]);

  const refreshAll = async () => {
    setRefreshing(true);
    await loadCore();
    await loadAttendance();
    setRefreshing(false);
  };

  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const row of attendance) map[row.studentId] = row.status;
    return map;
  }, [attendance]);

  const certifiedIds = useMemo(
    () => new Set(certificates.map((c) => c.studentId)),
    [certificates],
  );

  const openQueries = useMemo(() => queries.filter((q) => q.status === 'open'), [queries]);
  const answeredQueries = useMemo(
    () => queries.filter((q) => q.status === 'answered'),
    [queries],
  );
  const pendingSubs = useMemo(
    () => submissions.filter((s) => s.status === 'submitted'),
    [submissions],
  );
  const eligibleForCert = useMemo(
    () =>
      roster.filter(
        (r) => !certifiedIds.has(r.studentId) && eligibility[r.studentId]?.eligible,
      ),
    [roster, certifiedIds, eligibility],
  );
  const notReadyCert = useMemo(
    () =>
      roster.filter(
        (r) => !certifiedIds.has(r.studentId) && !eligibility[r.studentId]?.eligible,
      ),
    [roster, certifiedIds, eligibility],
  );

  const attStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;
    for (const reg of roster) {
      const s = attendanceMap[reg.studentId];
      if (s === 'present') present += 1;
      else if (s === 'late') late += 1;
      else if (s === 'absent') absent += 1;
      else unmarked += 1;
    }
    return { present, late, absent, unmarked };
  }, [roster, attendanceMap]);

  const selectedAttendanceList = useMemo(
    () => roster.filter((r) => selectedAttendance[r.studentId]),
    [roster, selectedAttendance],
  );
  const selectedCertList = useMemo(
    () => roster.filter((r) => selectedCerts[r.studentId]),
    [roster, selectedCerts],
  );

  const roleLabel =
    session?.trainerId === user?.trainerId ? 'Primary trainer' : 'Backup trainer';

  const setDateWithinSession = (next: string) => {
    if (!session) {
      setAttendanceDate(next);
      return;
    }
    if (!DATE_RE.test(next)) {
      setAttendanceDate(next);
      return;
    }
    setAttendanceDate(clampDate(next, session.startDate, session.endDate));
    setSelectedAttendance({});
  };

  const setEvidenceDateWithinSession = (next: string) => {
    if (!session) {
      setEvidenceDate(next);
      return;
    }
    if (!DATE_RE.test(next)) {
      setEvidenceDate(next);
      return;
    }
    setEvidenceDate(clampDate(next, session.startDate, session.endDate));
  };

  const addMaterial = async () => {
    if (!user?.trainerId) return;
    if (!matTitle.trim()) {
      Alert.alert('Title required', 'Enter a material title before uploading.');
      return;
    }
    try {
      setSaving(true);
      const file = await pickMockDocument();
      await sessionContentApi.addMaterial({
        requestId,
        trainerId: user.trainerId,
        title: matTitle,
        description: matDesc,
        file: { ...file, uploadedAt: new Date().toISOString() },
      });
      setMatTitle('');
      setMatDesc('');
      setShowAddMaterial(false);
      Alert.alert('Published', 'Students can now see this material.');
      await loadCore();
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const addAssignment = async () => {
    if (!user?.trainerId) return;
    if (!asgTitle.trim() || !asgInstructions.trim()) {
      Alert.alert('Missing details', 'Title and instructions are required.');
      return;
    }
    try {
      setSaving(true);
      let file;
      try {
        file = await pickMockDocument();
      } catch {
        file = undefined;
      }
      await sessionContentApi.addAssignment({
        requestId,
        trainerId: user.trainerId,
        title: asgTitle,
        instructions: asgInstructions,
        dueDate: asgDue,
        file: file ? { ...file, uploadedAt: new Date().toISOString() } : undefined,
      });
      setAsgTitle('');
      setAsgInstructions('');
      setAsgDue('');
      setShowPostAssignment(false);
      Alert.alert('Posted', 'Assignment is visible to registered students.');
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const mark = async (reg: TrainingRegistration, status: AttendanceStatus) => {
    if (!user?.trainerId) return;
    if (!DATE_RE.test(attendanceDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD within the batch dates.');
      return;
    }
    try {
      await sessionContentApi.markAttendance({
        requestId,
        trainerId: user.trainerId,
        studentId: reg.studentId,
        studentName: reg.studentName,
        sessionDate: attendanceDate,
        status,
      });
      await loadAttendance();
      await loadCore();
    } catch (e) {
      Alert.alert('Attendance failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const markMany = async (regs: TrainingRegistration[], status: AttendanceStatus) => {
    if (!user?.trainerId) return;
    if (!DATE_RE.test(attendanceDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD within the batch dates.');
      return;
    }
    if (regs.length === 0) {
      Alert.alert('No students', 'Select students or use Mark all.');
      return;
    }
    try {
      setSaving(true);
      for (const reg of regs) {
        await sessionContentApi.markAttendance({
          requestId,
          trainerId: user.trainerId,
          studentId: reg.studentId,
          studentName: reg.studentName,
          sessionDate: attendanceDate,
          status,
        });
      }
      setSelectedAttendance({});
      Alert.alert(
        'Saved',
        `Marked ${regs.length} student(s) as ${status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent'}.`,
      );
      await loadAttendance();
      await loadCore();
    } catch (e) {
      Alert.alert('Attendance failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const review = async (
    submissionId: string,
    status: 'accepted' | 'needs_revision',
  ) => {
    if (!user?.trainerId) return;
    try {
      const scoreRaw = scoreDrafts[submissionId]?.trim();
      const score =
        status === 'accepted' && scoreRaw
          ? Number(scoreRaw)
          : undefined;
      if (status === 'accepted' && scoreRaw && (Number.isNaN(score!) || score! < 0 || score! > 20)) {
        Alert.alert('Invalid score', 'Enter a score between 0 and 20, or leave blank.');
        return;
      }
      await sessionContentApi.reviewSubmission({
        submissionId,
        trainerId: user.trainerId,
        status,
        remark: reviewDrafts[submissionId],
        score,
        maxScore: 20,
      });
      setReviewDrafts((prev) => ({ ...prev, [submissionId]: '' }));
      setScoreDrafts((prev) => ({ ...prev, [submissionId]: '' }));
      await loadCore();
    } catch (e) {
      Alert.alert('Review failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const issueOne = async (reg: TrainingRegistration) => {
    if (!user?.trainerId) return;
    try {
      await sessionContentApi.issueCertificate({
        requestId,
        trainerId: user.trainerId,
        trainerName: user.name,
        studentId: reg.studentId,
        studentName: reg.studentName,
        collegeName: reg.collegeName,
      });
      Alert.alert('Issued', `Certificate issued to ${reg.studentName}.`);
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
    }
  };

  const issueSelected = async () => {
    if (!user?.trainerId) return;
    const targets = selectedCertList.filter(
      (r) => !certifiedIds.has(r.studentId) && eligibility[r.studentId]?.eligible,
    );
    if (targets.length === 0) {
      Alert.alert('Select eligible students', 'Only eligible students can receive certificates.');
      return;
    }
    try {
      setSaving(true);
      let count = 0;
      for (const reg of targets) {
        try {
          await sessionContentApi.issueCertificate({
            requestId,
            trainerId: user.trainerId,
            trainerName: user.name,
            studentId: reg.studentId,
            studentName: reg.studentName,
            collegeName: reg.collegeName,
          });
          count += 1;
        } catch {
          // skip individual failures
        }
      }
      setSelectedCerts({});
      Alert.alert('Certificates', `Issued ${count} certificate(s).`);
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const issueAllEligible = async () => {
    if (!user?.trainerId) return;
    try {
      setSaving(true);
      const count = await sessionContentApi.issueCertificatesForEligible({
        requestId,
        trainerId: user.trainerId,
        trainerName: user.name,
      });
      Alert.alert(
        'Certificates',
        count === 0
          ? 'No one is eligible yet. Need ≥75% attendance (Present/Late) and all assignments accepted.'
          : `Issued ${count} certificate(s).`,
      );
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const answerQuery = async (queryId: string) => {
    const answer = (answerDrafts[queryId] || '').trim();
    if (!answer) {
      Alert.alert('Answer required', 'Type a reply before sending.');
      return;
    }
    try {
      await trainerApi.answerQuery(queryId, answer);
      setAnswerDrafts((prev) => ({ ...prev, [queryId]: '' }));
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to answer', e instanceof Error ? e.message : 'Try again');
    }
  };

  const captureGeo = async () => {
    try {
      setSaving(true);
      const pos = await getCurrentPosition();
      setEvidenceGeo(pos);
      Alert.alert(
        'Location captured',
        `${pos.latitude}, ${pos.longitude}${
          pos.accuracyMeters ? ` (±${pos.accuracyMeters} m)` : ''
        }`,
      );
    } catch (e) {
      Alert.alert('Location failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const pickEvidencePhoto = async () => {
    try {
      const photo = await pickImageWithPreview();
      setEvidencePhoto(photo);
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Photo failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const postEvidence = async () => {
    if (!user?.trainerId || !user.name) return;
    if (!evidencePhoto) {
      Alert.alert('Photo required', 'Take or choose a session photo first.');
      return;
    }
    if (!evidenceGeo) {
      Alert.alert('Location required', 'Capture GPS location to geo-tag this photo.');
      return;
    }
    try {
      setSaving(true);
      await sessionContentApi.addEvidence({
        requestId,
        trainerId: user.trainerId,
        trainerName: user.name,
        sessionDate: evidenceDate,
        caption: evidenceCaption,
        photo: {
          fileName: evidencePhoto.fileName,
          sizeLabel: evidencePhoto.sizeLabel,
          uploadedAt: new Date().toISOString(),
          dataUrl: evidencePhoto.dataUrl,
        },
        geo: evidenceGeo,
      });
      setEvidenceCaption('');
      setEvidencePhoto(null);
      setEvidenceGeo(null);
      Alert.alert('Evidence posted', 'Geo-tagged session photo saved for this day.');
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to post', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const removeEvidence = async (id: string) => {
    if (!user?.trainerId) return;
    try {
      await sessionContentApi.removeEvidence(id, user.trainerId);
      await loadCore();
    } catch (e) {
      Alert.alert('Unable to remove', e instanceof Error ? e.message : 'Try again');
    }
  };

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'materials', label: `Materials (${materials.length})` },
    {
      value: 'assignments',
      label: pendingSubs.length ? `Assignments (${pendingSubs.length})` : 'Assignments',
    },
    {
      value: 'attendance',
      label: attStats.unmarked ? `Attendance (${attStats.unmarked})` : 'Attendance',
    },
    {
      value: 'evidence',
      label: evidence.length ? `Evidence (${evidence.length})` : 'Evidence',
    },
    {
      value: 'certificates',
      label: eligibleForCert.length ? `Certificates (${eligibleForCert.length})` : 'Certificates',
    },
    { value: 'feedback', label: `Feedback (${feedback.length})` },
    {
      value: 'queries',
      label: openQueries.length ? `Queries (${openQueries.length})` : 'Queries',
    },
  ];

  return (
    <Screen
      title={session?.courseName || 'Session workspace'}
      subtitle={
        session
          ? `${requesterLabel(session)} · ${session.startDate} → ${session.endDate}`
          : 'Loading batch…'
      }
      showLogo={false}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {session ? (
          <DataCard>
            <Text style={styles.eyebrow}>Session workspace</Text>
            <Text style={styles.meta}>{requesterLabel(session)}</Text>
            <Text style={styles.meta}>
              {session.branch} · Batch {session.batchSize} · YOG {session.yearOfGraduation}
            </Text>
            <Text style={styles.meta}>
              {roleLabel} · {roster.length} student{roster.length === 1 ? '' : 's'} enrolled
            </Text>
          </DataCard>
        ) : null}

        <SegmentedTabs value={tab} options={tabOptions} onChange={setTab} />

        {tab === 'overview' ? (
          <>
            <PanelHeader
              title="What needs attention"
              subtitle="Jump to the work that is waiting on you"
            />
            <StatTiles
              items={[
                {
                  label: 'Pending reviews',
                  value: String(pendingSubs.length),
                  hint: 'Assignment submissions',
                  onPress: () => setTab('assignments'),
                },
                {
                  label: 'Open queries',
                  value: String(openQueries.length),
                  onPress: () => setTab('queries'),
                },
                {
                  label: 'Unmarked today',
                  value: String(attStats.unmarked),
                  hint: attendanceDate,
                  onPress: () => setTab('attendance'),
                },
                {
                  label: 'Evidence photos',
                  value: String(evidence.length),
                  hint: 'Geo-tagged',
                  onPress: () => setTab('evidence'),
                },
                {
                  label: 'Ready for cert',
                  value: String(eligibleForCert.length),
                  onPress: () => setTab('certificates'),
                },
              ]}
            />
            <SectionLabel>Suggested workflow</SectionLabel>
            <DataCard>
              <Text style={styles.body}>
                1. Upload materials → 2. Post assignments → 3. Mark attendance each day → 4. Post
                geo-tagged session photo evidence → 5. Review submissions → 6. Issue certificates
                when eligible.
              </Text>
            </DataCard>
            {pendingSubs.length > 0 ? (
              <PrimaryButton
                title={`Review ${pendingSubs.length} submission(s)`}
                onPress={() => setTab('assignments')}
              />
            ) : null}
            <View style={styles.gap} />
            {openQueries.length > 0 ? (
              <PrimaryButton
                title={`Answer ${openQueries.length} open quer${openQueries.length === 1 ? 'y' : 'ies'}`}
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
              subtitle="Students see these in their session Materials tab"
              action={
                <PrimaryButton
                  title={showAddMaterial ? 'Cancel' : 'Add material'}
                  variant="secondary"
                  onPress={() => setShowAddMaterial((v) => !v)}
                />
              }
            />
            {showAddMaterial ? (
              <DataCard>
                <FormField
                  label="Title"
                  required
                  value={matTitle}
                  onChangeText={setMatTitle}
                  placeholder="e.g. Day 1 slides"
                />
                <FormField
                  label="Description (optional)"
                  value={matDesc}
                  onChangeText={setMatDesc}
                />
                <PrimaryButton
                  title={saving ? 'Uploading…' : 'Choose file & publish'}
                  onPress={addMaterial}
                  disabled={saving}
                />
              </DataCard>
            ) : null}
            {materials.length === 0 ? (
              <EmptyState
                title="No materials yet"
                body="Add slides, notes, or handouts so students can download them."
              />
            ) : (
              materials.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
                  <Text style={styles.meta}>
                    {item.file.fileName} · {item.file.sizeLabel}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      if (!user?.trainerId) return;
                      await sessionContentApi.removeMaterial(item.id, user.trainerId);
                      await loadCore();
                    }}
                  >
                    <Text style={styles.linkDanger}>Remove</Text>
                  </Pressable>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'assignments' ? (
          <>
            <PanelHeader
              title="Assignments"
              subtitle="Post work, then accept or send back for revision (score out of 20 on accept)"
              action={
                <PrimaryButton
                  title={showPostAssignment ? 'Cancel' : 'Post assignment'}
                  variant="secondary"
                  onPress={() => setShowPostAssignment((v) => !v)}
                />
              }
            />

            {showPostAssignment ? (
              <DataCard>
                <FormField label="Title" required value={asgTitle} onChangeText={setAsgTitle} />
                <FormField
                  label="Instructions"
                  required
                  value={asgInstructions}
                  onChangeText={setAsgInstructions}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
                <FormField
                  label="Due date (YYYY-MM-DD, optional)"
                  value={asgDue}
                  onChangeText={setAsgDue}
                  placeholder="2026-08-20"
                />
                <PrimaryButton
                  title={saving ? 'Saving…' : 'Choose optional file & post'}
                  onPress={addAssignment}
                  disabled={saving}
                />
              </DataCard>
            ) : null}

            {pendingSubs.length > 0 ? (
              <>
                <SectionLabel>{`Needs your review (${pendingSubs.length})`}</SectionLabel>
                {pendingSubs.map((sub) => {
                  const asgTitle =
                    assignments.find((a) => a.id === sub.assignmentId)?.title || 'Assignment';
                  return (
                  <DataCard key={sub.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>{sub.studentName}</Text>
                      <StatusBadge status={sub.status} />
                    </View>
                    <Text style={styles.meta}>{asgTitle}</Text>
                    <Text style={styles.meta}>
                      {sub.file.fileName} · {sub.file.sizeLabel}
                    </Text>
                    {sub.notes ? <Text style={styles.meta}>Student note: {sub.notes}</Text> : null}
                    <TextInput
                      style={styles.answerBox}
                      placeholder="Remark to student (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={reviewDrafts[sub.id] || ''}
                      onChangeText={(v) =>
                        setReviewDrafts((prev) => ({ ...prev, [sub.id]: v }))
                      }
                    />
                    <FormField
                      label="Score / 20 (optional when accepting)"
                      value={scoreDrafts[sub.id] || ''}
                      onChangeText={(v) =>
                        setScoreDrafts((prev) => ({ ...prev, [sub.id]: v }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="e.g. 16"
                    />
                    <View style={styles.rowBtns}>
                      <PrimaryButton title="Accept" onPress={() => review(sub.id, 'accepted')} />
                      <PrimaryButton
                        title="Needs revision"
                        variant="secondary"
                        onPress={() => review(sub.id, 'needs_revision')}
                      />
                    </View>
                  </DataCard>
                  );
                })}
              </>
            ) : (
              <EmptyState
                title="No pending reviews"
                body="When students submit work, it appears here for Accept / Needs revision."
              />
            )}

            <SectionLabel>{`Posted assignments (${assignments.length})`}</SectionLabel>
            {assignments.length === 0 ? (
              <EmptyState title="No assignments posted" body="Use Post assignment to create one." />
            ) : (
              assignments.map((item) => {
                const subs = submissions.filter((s) => s.assignmentId === item.id);
                const waiting = subs.filter((s) => s.status === 'submitted').length;
                return (
                  <DataCard key={item.id}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.body}>{item.instructions}</Text>
                    {item.dueDate ? <Text style={styles.meta}>Due: {item.dueDate}</Text> : null}
                    {item.file ? (
                      <Text style={styles.meta}>
                        File: {item.file.fileName} · {item.file.sizeLabel}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      Submissions: {subs.length}
                      {waiting ? ` · ${waiting} waiting review` : ''}
                    </Text>
                    <Pressable
                      onPress={async () => {
                        if (!user?.trainerId) return;
                        Alert.alert('Remove assignment?', 'Students will no longer see it.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              await sessionContentApi.removeAssignment(item.id, user.trainerId!);
                              await loadCore();
                            },
                          },
                        ]);
                      }}
                    >
                      <Text style={styles.linkDanger}>Remove assignment</Text>
                    </Pressable>
                  </DataCard>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'attendance' ? (
          <>
            <PanelHeader
              title="Daily attendance"
              subtitle={
                session
                  ? `${session.startDate} → ${session.endDate}`
                  : 'Mark Present, Late, or Absent'
              }
            />

            <View style={styles.attDayBar}>
              <Pressable
                style={styles.attNavBtn}
                onPress={() => {
                  if (!session || !DATE_RE.test(attendanceDate)) return;
                  setDateWithinSession(shiftDate(attendanceDate, -1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Previous day"
              >
                <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
              </Pressable>
              <View style={styles.attDateGrow}>
                <DateField
                  label="Session day"
                  required
                  value={attendanceDate}
                  onChange={setDateWithinSession}
                  minimumDate={
                    session ? new Date(`${session.startDate}T00:00:00`) : undefined
                  }
                />
              </View>
              <Pressable
                style={styles.attNavBtn}
                onPress={() => {
                  if (!session || !DATE_RE.test(attendanceDate)) return;
                  setDateWithinSession(shiftDate(attendanceDate, 1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Next day"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
              </Pressable>
            </View>

            {roster.length === 0 ? (
              <EmptyState
                title="No students enrolled"
                body="Attendance appears after students register for this batch."
              />
            ) : (
              <>
                <View style={styles.attSummary}>
                  {(
                    [
                      { key: 'present', label: 'Present', value: attStats.present, tone: 'ok' },
                      { key: 'late', label: 'Late', value: attStats.late, tone: 'warn' },
                      { key: 'absent', label: 'Absent', value: attStats.absent, tone: 'danger' },
                      {
                        key: 'unmarked',
                        label: 'Open',
                        value: attStats.unmarked,
                        tone: 'muted',
                      },
                    ] as const
                  ).map((item) => (
                    <View
                      key={item.key}
                      style={[
                        styles.attSummaryItem,
                        item.tone === 'ok' && styles.attToneOk,
                        item.tone === 'warn' && styles.attToneWarn,
                        item.tone === 'danger' && styles.attToneDanger,
                        item.tone === 'muted' && styles.attToneMuted,
                      ]}
                    >
                      <Text style={styles.attSummaryValue}>{item.value}</Text>
                      <Text style={styles.attSummaryLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.attActions}>
                  <PrimaryButton
                    title={saving ? 'Saving…' : 'Mark all present'}
                    onPress={() => markMany(roster, 'present')}
                    disabled={saving}
                  />
                  <PrimaryButton
                    title="Mark unmarked absent"
                    variant="secondary"
                    onPress={() =>
                      markMany(
                        roster.filter((r) => !attendanceMap[r.studentId]),
                        'absent',
                      )
                    }
                    disabled={saving || attStats.unmarked === 0}
                  />
                </View>

                <View style={styles.attSelectRow}>
                  <Text style={styles.attSelectHint}>
                    {selectedAttendanceList.length > 0
                      ? `${selectedAttendanceList.length} selected`
                      : 'Tap students to select, then apply a status'}
                  </Text>
                  <View style={styles.attSelectBtns}>
                    <Pressable
                      style={styles.attSelectChip}
                      onPress={() => {
                        const next: Record<string, boolean> = {};
                        for (const r of roster) next[r.studentId] = true;
                        setSelectedAttendance(next);
                      }}
                    >
                      <Text style={styles.attSelectChipText}>Select all</Text>
                    </Pressable>
                    <Pressable
                      style={styles.attSelectChip}
                      onPress={() => setSelectedAttendance({})}
                    >
                      <Text style={styles.attSelectChipText}>Clear</Text>
                    </Pressable>
                  </View>
                </View>

                {selectedAttendanceList.length > 0 ? (
                  <View style={styles.attApplyBar}>
                    <Text style={styles.attApplyLabel}>Apply status to selected</Text>
                    <View style={styles.chipRow}>
                      <StatusChip
                        label="Present"
                        tone="ok"
                        onPress={() => markMany(selectedAttendanceList, 'present')}
                      />
                      <StatusChip
                        label="Late"
                        tone="warn"
                        onPress={() => markMany(selectedAttendanceList, 'late')}
                      />
                      <StatusChip
                        label="Absent"
                        tone="danger"
                        onPress={() => markMany(selectedAttendanceList, 'absent')}
                      />
                    </View>
                  </View>
                ) : null}

                <Text style={styles.attRosterLabel}>
                  Roster · {roster.length} student{roster.length === 1 ? '' : 's'}
                </Text>
                <View style={styles.attRoster}>
                  {roster.map((reg, index) => {
                    const status = attendanceMap[reg.studentId];
                    const checked = !!selectedAttendance[reg.studentId];
                    return (
                      <View
                        key={reg.id}
                        style={[
                          styles.attRow,
                          index < roster.length - 1 && styles.attRowBorder,
                        ]}
                      >
                        <Pressable
                          style={styles.attRowMain}
                          onPress={() =>
                            setSelectedAttendance((prev) => ({
                              ...prev,
                              [reg.studentId]: !prev[reg.studentId],
                            }))
                          }
                        >
                          <View style={[styles.check, checked && styles.checkOn]}>
                            {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.attName}>{reg.studentName}</Text>
                            <Text style={styles.attEmail} numberOfLines={1}>
                              {reg.studentEmail}
                            </Text>
                          </View>
                          {status ? (
                            <StatusBadge status={status} />
                          ) : (
                            <Text style={styles.unmarked}>—</Text>
                          )}
                        </Pressable>
                        <View style={styles.chipRow}>
                          <StatusChip
                            label="Present"
                            tone="ok"
                            active={status === 'present'}
                            onPress={() => mark(reg, 'present')}
                          />
                          <StatusChip
                            label="Late"
                            tone="warn"
                            active={status === 'late'}
                            onPress={() => mark(reg, 'late')}
                          />
                          <StatusChip
                            label="Absent"
                            tone="danger"
                            active={status === 'absent'}
                            onPress={() => mark(reg, 'absent')}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        ) : null}

        {tab === 'evidence' ? (
          <>
            <PanelHeader
              title="Session evidence"
              subtitle={
                session
                  ? `Geo-tagged photo proof for each day · ${session.startDate} → ${session.endDate}`
                  : 'Capture GPS, attach a photo, then post'
              }
            />

            <DataCard>
              <Text style={styles.sectionHint}>Post evidence for a session day</Text>
              <Text style={styles.meta}>
                1. Choose the day · 2. Capture GPS · 3. Attach photo · 4. Post
              </Text>
              <View style={styles.gap} />
              <View style={styles.attDayBar}>
                <Pressable
                  style={styles.attNavBtn}
                  onPress={() => {
                    if (!session || !DATE_RE.test(evidenceDate)) return;
                    setEvidenceDateWithinSession(shiftDate(evidenceDate, -1));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Previous evidence day"
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
                </Pressable>
                <View style={styles.attDateGrow}>
                  <DateField
                    label="Session day"
                    required
                    value={evidenceDate}
                    onChange={setEvidenceDateWithinSession}
                    minimumDate={
                      session ? new Date(`${session.startDate}T00:00:00`) : undefined
                    }
                  />
                </View>
                <Pressable
                  style={styles.attNavBtn}
                  onPress={() => {
                    if (!session || !DATE_RE.test(evidenceDate)) return;
                    setEvidenceDateWithinSession(shiftDate(evidenceDate, 1));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Next evidence day"
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
                </Pressable>
              </View>

              <View style={styles.evStepRow}>
                <PrimaryButton
                  title={evidenceGeo ? 'Location captured ✓' : 'Capture GPS'}
                  variant="secondary"
                  onPress={captureGeo}
                  disabled={saving}
                />
                <PrimaryButton
                  title={evidencePhoto ? 'Change photo' : 'Take / choose photo'}
                  variant="secondary"
                  onPress={pickEvidencePhoto}
                  disabled={saving}
                />
              </View>

              {evidenceGeo ? (
                <View style={styles.evGeoBox}>
                  <Text style={styles.evGeoTitle}>Geo tag ready</Text>
                  <Text style={styles.meta}>
                    {evidenceGeo.latitude}, {evidenceGeo.longitude}
                    {evidenceGeo.accuracyMeters
                      ? ` · ±${evidenceGeo.accuracyMeters} m`
                      : ''}
                  </Text>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(mapsUrl(evidenceGeo.latitude, evidenceGeo.longitude))
                    }
                  >
                    <Text style={styles.link}>Open in Maps</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.warnLine}>GPS not captured yet.</Text>
              )}

              {evidencePhoto ? (
                <View style={styles.evPreviewWrap}>
                  <Image
                    source={{ uri: evidencePhoto.dataUrl }}
                    style={styles.evPreview}
                    resizeMode="cover"
                  />
                  <Text style={styles.meta}>
                    {evidencePhoto.fileName} · {evidencePhoto.sizeLabel}
                  </Text>
                </View>
              ) : (
                <Text style={styles.warnLine}>No photo attached yet.</Text>
              )}

              <FormField
                label="Caption (optional)"
                value={evidenceCaption}
                onChangeText={setEvidenceCaption}
                placeholder="e.g. Day 2 lab session — campus lab block B"
              />
              <PrimaryButton
                title={saving ? 'Posting…' : 'Post geo-tagged evidence'}
                onPress={postEvidence}
                disabled={saving}
              />
            </DataCard>

            <SectionLabel>
              {`Posted evidence${evidence.length ? ` (${evidence.length})` : ''}`}
            </SectionLabel>
            {evidence.length === 0 ? (
              <EmptyState
                title="No evidence yet"
                body="Post a geo-tagged photo after each session day as proof of delivery."
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
                      <View style={[styles.evThumb, styles.evThumbPlaceholder]}>
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{item.sessionDate}</Text>
                      {item.caption ? <Text style={styles.body}>{item.caption}</Text> : null}
                      <Text style={styles.meta}>
                        {item.geo.latitude}, {item.geo.longitude}
                        {item.geo.accuracyMeters
                          ? ` · ±${item.geo.accuracyMeters} m`
                          : ''}
                      </Text>
                      <Text style={styles.meta}>
                        {item.photo.fileName} · {item.photo.sizeLabel} · posted{' '}
                        {item.createdAt.slice(0, 10)}
                      </Text>
                      <Pressable
                        onPress={() =>
                          Linking.openURL(mapsUrl(item.geo.latitude, item.geo.longitude))
                        }
                      >
                        <Text style={styles.link}>Open location in Maps</Text>
                      </Pressable>
                      <Pressable onPress={() => removeEvidence(item.id)}>
                        <Text style={styles.linkDanger}>Remove</Text>
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
              title="Certificates"
              subtitle="Issue only when attendance ≥75% (Present/Late) and all assignments are accepted"
            />
            <StatTiles
              items={[
                { label: 'Issued', value: String(certificates.length) },
                { label: 'Eligible now', value: String(eligibleForCert.length) },
                { label: 'Not ready', value: String(notReadyCert.length) },
              ]}
            />

            {roster.length === 0 ? (
              <EmptyState title="No students in this batch" />
            ) : (
              <>
                <View style={styles.rowBtns}>
                  <PrimaryButton
                    title={saving ? 'Issuing…' : 'Issue all eligible'}
                    onPress={issueAllEligible}
                    disabled={saving || eligibleForCert.length === 0}
                  />
                  <PrimaryButton
                    title="Select all eligible"
                    variant="secondary"
                    onPress={() => {
                      const next: Record<string, boolean> = {};
                      for (const r of eligibleForCert) next[r.studentId] = true;
                      setSelectedCerts(next);
                    }}
                  />
                </View>
                <View style={styles.rowBtns}>
                  <PrimaryButton
                    title={`Issue selected (${selectedCertList.length})`}
                    variant="secondary"
                    onPress={issueSelected}
                    disabled={saving || selectedCertList.length === 0}
                  />
                  <PrimaryButton
                    title="Clear selection"
                    variant="secondary"
                    onPress={() => setSelectedCerts({})}
                  />
                </View>

                <SectionLabel>Students</SectionLabel>
                {roster.map((reg) => {
                  const issued = certifiedIds.has(reg.studentId);
                  const cert = certificates.find((c) => c.studentId === reg.studentId);
                  const elig = eligibility[reg.studentId];
                  const canSelect = !issued && !!elig?.eligible;
                  const checked = !!selectedCerts[reg.studentId];
                  return (
                    <DataCard key={reg.id}>
                      <Pressable
                        style={styles.row}
                        onPress={() => {
                          if (!canSelect) return;
                          setSelectedCerts((prev) => ({
                            ...prev,
                            [reg.studentId]: !prev[reg.studentId],
                          }));
                        }}
                        disabled={!canSelect}
                      >
                        {canSelect ? (
                          <View style={[styles.check, checked && styles.checkOn]}>
                            {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                          </View>
                        ) : (
                          <View style={styles.checkSpacer} />
                        )}
                        <Text style={[styles.cardTitle, styles.flex]}>{reg.studentName}</Text>
                        <StatusBadge
                          status={issued ? 'issued' : elig?.eligible ? 'eligible' : 'pending'}
                        />
                      </Pressable>
                      {elig && !issued ? (
                        <Text style={styles.meta}>
                          Attendance {elig.attendancePercent}% ({elig.attendedDays}/
                          {elig.totalDays} days) · Assignments {elig.assignmentsAccepted}/
                          {elig.assignmentsTotal} accepted
                        </Text>
                      ) : null}
                      {elig && !issued && !elig.eligible
                        ? elig.reasons.map((reason) => (
                            <Text key={reason} style={styles.warnLine}>
                              · {reason}
                            </Text>
                          ))
                        : null}
                      {cert ? (
                        <Text style={styles.ok}>
                          {cert.certificateCode} · issued{' '}
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </Text>
                      ) : canSelect ? (
                        <>
                          <View style={styles.gap} />
                          <PrimaryButton
                            title="Issue certificate"
                            onPress={() => issueOne(reg)}
                          />
                        </>
                      ) : null}
                    </DataCard>
                  );
                })}
              </>
            )}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            <PanelHeader
              title="Student feedback"
              subtitle="Ratings and comments for this batch only"
            />
            {feedback.length === 0 ? (
              <EmptyState
                title="No feedback yet"
                body="Feedback appears after students submit it for this session."
              />
            ) : (
              feedback.map((item) => (
                <DataCard key={item.id}>
                  <Text style={styles.cardTitle}>
                    {item.fromName}
                    {item.rating ? ` · ${item.rating}/5` : ''}
                  </Text>
                  <Text style={styles.body}>{item.comment}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </DataCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'queries' ? (
          <>
            <PanelHeader
              title="Student queries"
              subtitle="Answer open questions; answered threads stay for reference"
            />
            <SectionLabel>{`Open (${openQueries.length})`}</SectionLabel>
            {openQueries.length === 0 ? (
              <EmptyState title="No open queries" body="New student questions will show here." />
            ) : (
              openQueries.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>{item.studentName}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.body}>{item.question}</Text>
                  <TextInput
                    style={styles.answerBox}
                    placeholder="Type your answer"
                    placeholderTextColor={colors.textMuted}
                    value={answerDrafts[item.id] || ''}
                    onChangeText={(v) =>
                      setAnswerDrafts((prev) => ({ ...prev, [item.id]: v }))
                    }
                    multiline
                  />
                  <PrimaryButton title="Send answer" onPress={() => answerQuery(item.id)} />
                </DataCard>
              ))
            )}

            {answeredQueries.length > 0 ? (
              <>
                <SectionLabel>{`Answered (${answeredQueries.length})`}</SectionLabel>
                {answeredQueries.map((item) => (
                  <DataCard key={item.id}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>{item.studentName}</Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text style={styles.body}>{item.question}</Text>
                    <Text style={styles.ok}>Answer: {item.answer}</Text>
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
  content: { paddingBottom: 40, gap: 0 },
  eyebrow: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 6 },
  ok: { marginTop: 8, color: colors.success, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  warnLine: { color: colors.warning, fontSize: 12, marginTop: 4, fontWeight: '600' },
  linkDanger: { color: colors.danger, marginTop: 10, fontWeight: '700', fontSize: 13 },
  link: {
    color: colors.primaryDark,
    marginTop: 8,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  gap: { height: 10 },
  evStepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  evGeoBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  evGeoTitle: { fontWeight: '800', color: colors.primaryDark, fontSize: 13, marginBottom: 2 },
  evPreviewWrap: { marginBottom: 10, gap: 6 },
  evPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  evCardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  evThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  evThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  rowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  answerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    marginTop: 8,
    marginBottom: 8,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dateField: { flex: 1 },
  sectionHint: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  attDayBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  attNavBtn: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  attDateGrow: { flex: 1 },
  attSummary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  attSummaryItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  attToneOk: { backgroundColor: '#E7F5EC' },
  attToneWarn: { backgroundColor: '#FFF6E5' },
  attToneDanger: { backgroundColor: '#FBECEC' },
  attToneMuted: { backgroundColor: '#EEF2F3' },
  attSummaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  attSummaryLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  attActions: {
    gap: 8,
    marginBottom: 12,
  },
  attSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
    paddingRight: 4,
  },
  attSelectHint: {
    flex: 1,
    minWidth: 160,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  attSelectBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  attSelectChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attSelectChipText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  attApplyBar: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  attApplyLabel: { fontWeight: '700', color: colors.primaryDark, fontSize: 13 },
  attRosterLabel: {
    fontWeight: '700',
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  attRoster: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  attRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  attRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attName: { fontWeight: '700', color: colors.text, fontSize: 14 },
  attEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    minWidth: 40,
    alignItems: 'center',
  },
  chipNeutral: {},
  chipOk: { borderColor: '#8FCB9B' },
  chipWarn: { borderColor: '#E0B35A' },
  chipDanger: { borderColor: '#E08A8A' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', fontSize: 12, color: colors.text },
  chipTextActive: { color: colors.white },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.white, fontWeight: '800', fontSize: 12 },
  checkSpacer: { width: 22 },
  unmarked: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});

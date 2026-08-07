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
import { FormField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
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
  SessionMaterial,
} from '../types/sessionContent';
import type { StudentTrainerQuery, TrainerFeedback } from '../types/trainer';
import type { TrainingRegistration } from '../types/training';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerSessionDetail'>;
type Tab =
  | 'materials'
  | 'assignments'
  | 'attendance'
  | 'certificates'
  | 'feedback'
  | 'queries';

const todayIso = () => new Date().toISOString().slice(0, 10);

export function TrainerSessionDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('materials');
  const [session, setSession] = useState<CourseRequest | null>(null);
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [roster, setRoster] = useState<TrainingRegistration[]>([]);
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [certificates, setCertificates] = useState<SessionCertificate[]>([]);
  const [eligibility, setEligibility] = useState<
    Record<
      string,
      {
        eligible: boolean;
        attendancePercent: number;
        attendedDays: number;
        totalDays: number;
        assignmentsTotal: number;
        assignmentsAccepted: number;
        reasons: string[];
      }
    >
  >({});
  const [feedback, setFeedback] = useState<TrainerFeedback[]>([]);
  const [queries, setQueries] = useState<StudentTrainerQuery[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(todayIso());
  const [refreshing, setRefreshing] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Record<string, boolean>>({});
  const [selectedCerts, setSelectedCerts] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user?.trainerId) return;
    const item = await sessionContentApi.getSession(requestId);
    setSession(item);
    setMaterials(await sessionContentApi.listMaterials(requestId));
    setAssignments(await sessionContentApi.listAssignments(requestId));
    setSubmissions(await sessionContentApi.listSubmissions(requestId));
    setAttendance(await sessionContentApi.listAttendance(requestId, attendanceDate));
    setCertificates(await sessionContentApi.listCertificates(requestId));
    const regs = await trainingApi.listRegistrationsForSession(requestId);
    setRoster(regs);
    const nextElig: Record<
      string,
      {
        eligible: boolean;
        attendancePercent: number;
        attendedDays: number;
        totalDays: number;
        assignmentsTotal: number;
        assignmentsAccepted: number;
        reasons: string[];
      }
    > = {};
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
  }, [attendanceDate, requestId, user?.trainerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const row of attendance) map[row.studentId] = row.status;
    return map;
  }, [attendance]);

  const certifiedIds = useMemo(
    () => new Set(certificates.map((c) => c.studentId)),
    [certificates],
  );

  const addMaterial = async () => {
    if (!user?.trainerId) return;
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
      Alert.alert('Added', 'Material is available to registered students.');
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const addAssignment = async () => {
    if (!user?.trainerId) return;
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
      Alert.alert('Added', 'Assignment is visible to registered students.');
      await load();
    } catch (e) {
      Alert.alert('Unable to add', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const mark = async (reg: TrainingRegistration, status: AttendanceStatus) => {
    if (!user?.trainerId) return;
    try {
      await sessionContentApi.markAttendance({
        requestId,
        trainerId: user.trainerId,
        studentId: reg.studentId,
        studentName: reg.studentName,
        sessionDate: attendanceDate,
        status,
      });
      await load();
    } catch (e) {
      Alert.alert('Attendance failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const selectedAttendanceList = useMemo(
    () => roster.filter((r) => selectedAttendance[r.studentId]),
    [roster, selectedAttendance],
  );

  const eligibleForCert = useMemo(
    () =>
      roster.filter(
        (r) => !certifiedIds.has(r.studentId) && eligibility[r.studentId]?.eligible,
      ),
    [roster, certifiedIds, eligibility],
  );

  const selectedCertList = useMemo(
    () => roster.filter((r) => selectedCerts[r.studentId]),
    [roster, selectedCerts],
  );

  const toggleAttendance = (studentId: string) => {
    setSelectedAttendance((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const toggleCert = (studentId: string) => {
    setSelectedCerts((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const selectAllAttendance = () => {
    const next: Record<string, boolean> = {};
    for (const r of roster) next[r.studentId] = true;
    setSelectedAttendance(next);
  };

  const clearAttendanceSelection = () => setSelectedAttendance({});

  const selectAllEligibleCerts = () => {
    const next: Record<string, boolean> = {};
    for (const r of eligibleForCert) next[r.studentId] = true;
    setSelectedCerts(next);
  };

  const clearCertSelection = () => setSelectedCerts({});

  const markSelected = async (status: AttendanceStatus) => {
    if (!user?.trainerId) return;
    if (selectedAttendanceList.length === 0) {
      Alert.alert('Select students', 'Select one or more students to mark attendance.');
      return;
    }
    try {
      setSaving(true);
      for (const reg of selectedAttendanceList) {
        await sessionContentApi.markAttendance({
          requestId,
          trainerId: user.trainerId,
          studentId: reg.studentId,
          studentName: reg.studentName,
          sessionDate: attendanceDate,
          status,
        });
      }
      clearAttendanceSelection();
      Alert.alert(
        'Attendance saved',
        `Marked ${selectedAttendanceList.length} student(s) as ${status.replace('_', ' ')}.`,
      );
      await load();
    } catch (e) {
      Alert.alert('Attendance failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const issueSelected = async () => {
    if (!user?.trainerId) return;
    const targets = selectedCertList.filter(
      (r) => !certifiedIds.has(r.studentId) && eligibility[r.studentId]?.eligible,
    );
    if (targets.length === 0) {
      Alert.alert(
        'Select students',
        'Select one or more eligible students to issue certificates.',
      );
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
          // skip failures for individual students
        }
      }
      clearCertSelection();
      Alert.alert('Certificates', `Issued ${count} certificate(s).`);
      await load();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
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
        status === 'accepted' && scoreRaw !== undefined && scoreRaw !== ''
          ? Number(scoreRaw)
          : undefined;
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
      await load();
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
      await load();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
    }
  };

  const issueAll = async () => {
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
          ? 'No new certificates issued. Need ≥75% attendance (Present/Late) and all assignments accepted.'
          : `Issued ${count} certificate(s).`,
      );
      await load();
    } catch (e) {
      Alert.alert('Unable to issue', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const answerQuery = async (queryId: string) => {
    try {
      await trainerApi.answerQuery(queryId, answerDrafts[queryId] || '');
      setAnswerDrafts((prev) => ({ ...prev, [queryId]: '' }));
      await load();
    } catch (e) {
      Alert.alert('Unable to answer', e instanceof Error ? e.message : 'Try again');
    }
  };

  const openQueries = queries.filter((q) => q.status === 'open').length;
  const pendingSubs = submissions.filter((s) => s.status === 'submitted').length;

  return (
    <Screen
      title={session?.courseName || 'Session'}
      subtitle={
        session
          ? `${session.collegeName} · ${session.startDate} → ${session.endDate}`
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
        {session ? (
          <View style={styles.card}>
            <Text style={styles.meta}>
              {session.branch} · Batch {session.batchSize} · Grad year {session.yearOfGraduation}
            </Text>
            <Text style={styles.meta}>
              Role:{' '}
              {session.trainerId === user?.trainerId ? 'Primary trainer' : 'Backup trainer'}
            </Text>
            <Text style={styles.meta}>Registered students: {roster.length}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['materials', 'Materials'],
              ['assignments', `Assignments${pendingSubs ? ` (${pendingSubs})` : ''}`],
              ['attendance', 'Attendance'],
              ['certificates', 'Certificates'],
              ['feedback', 'Feedback'],
              ['queries', `Queries${openQueries ? ` (${openQueries})` : ''}`],
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
            <Text style={styles.h2}>Session materials</Text>
            {materials.length === 0 ? (
              <Text style={styles.muted}>No materials yet. Upload PDFs, slides, or notes.</Text>
            ) : (
              materials.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
                  <Text style={styles.meta}>
                    {item.file.fileName} · {item.file.sizeLabel}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      if (!user?.trainerId) return;
                      await sessionContentApi.removeMaterial(item.id, user.trainerId);
                      await load();
                    }}
                  >
                    <Text style={styles.linkDanger}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Text style={styles.h2}>Add material</Text>
            <FormField label="Title" value={matTitle} onChangeText={setMatTitle} required />
            <FormField label="Description (optional)" value={matDesc} onChangeText={setMatDesc} />
            <PrimaryButton
              title={saving ? 'Uploading…' : 'Upload material file'}
              onPress={addMaterial}
              disabled={saving}
            />
          </>
        ) : null}

        {tab === 'assignments' ? (
          <>
            <Text style={styles.h2}>Assignments & submissions</Text>
            {assignments.length === 0 ? (
              <Text style={styles.muted}>No assignments posted for this session.</Text>
            ) : (
              assignments.map((item) => {
                const subs = submissions.filter((s) => s.assignmentId === item.id);
                return (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.body}>{item.instructions}</Text>
                    {item.dueDate ? <Text style={styles.meta}>Due: {item.dueDate}</Text> : null}
                    {item.file ? (
                      <Text style={styles.meta}>
                        File: {item.file.fileName} · {item.file.sizeLabel}
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={async () => {
                        if (!user?.trainerId) return;
                        await sessionContentApi.removeAssignment(item.id, user.trainerId);
                        await load();
                      }}
                    >
                      <Text style={styles.linkDanger}>Remove assignment</Text>
                    </Pressable>

                    <Text style={styles.subHead}>Submissions ({subs.length})</Text>
                    {subs.length === 0 ? (
                      <Text style={styles.muted}>No student submissions yet.</Text>
                    ) : (
                      subs.map((sub) => (
                        <View key={sub.id} style={styles.subCard}>
                          <View style={styles.row}>
                            <Text style={styles.itemTitle}>{sub.studentName}</Text>
                            <StatusBadge status={sub.status} />
                          </View>
                          <Text style={styles.meta}>
                            {sub.file.fileName} · {sub.file.sizeLabel}
                          </Text>
                          {sub.notes ? <Text style={styles.meta}>Note: {sub.notes}</Text> : null}
                          {sub.trainerRemark ? (
                            <Text style={styles.ok}>Remark: {sub.trainerRemark}</Text>
                          ) : null}
                          {sub.score !== undefined && sub.maxScore !== undefined ? (
                            <Text style={styles.ok}>
                              Score: {sub.score} / {sub.maxScore}
                            </Text>
                          ) : null}
                          {sub.status === 'submitted' ? (
                            <>
                              <TextInput
                                style={styles.answerBox}
                                placeholder="Review remark (optional)"
                                placeholderTextColor={colors.textMuted}
                                value={reviewDrafts[sub.id] || ''}
                                onChangeText={(v) =>
                                  setReviewDrafts((prev) => ({ ...prev, [sub.id]: v }))
                                }
                              />
                              <FormField
                                label="Score out of 20 (optional, on Accept)"
                                value={scoreDrafts[sub.id] || ''}
                                onChangeText={(v) =>
                                  setScoreDrafts((prev) => ({ ...prev, [sub.id]: v }))
                                }
                                keyboardType="decimal-pad"
                                placeholder="e.g. 16"
                              />
                              <View style={styles.rowBtns}>
                                <PrimaryButton
                                  title="Accept"
                                  onPress={() => review(sub.id, 'accepted')}
                                />
                                <PrimaryButton
                                  title="Needs revision"
                                  variant="secondary"
                                  onPress={() => review(sub.id, 'needs_revision')}
                                />
                              </View>
                            </>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                );
              })
            )}
            <Text style={styles.h2}>Post assignment</Text>
            <FormField label="Title" value={asgTitle} onChangeText={setAsgTitle} required />
            <FormField
              label="Instructions"
              value={asgInstructions}
              onChangeText={setAsgInstructions}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              required
            />
            <FormField
              label="Due date (YYYY-MM-DD, optional)"
              value={asgDue}
              onChangeText={setAsgDue}
              placeholder="2026-08-20"
            />
            <PrimaryButton
              title={saving ? 'Saving…' : 'Add assignment (+ optional file)'}
              onPress={addAssignment}
              disabled={saving}
            />
          </>
        ) : null}

        {tab === 'attendance' ? (
          <>
            <Text style={styles.h2}>Mark attendance</Text>
            <FormField
              label="Session date"
              value={attendanceDate}
              onChangeText={setAttendanceDate}
              placeholder="YYYY-MM-DD"
            />
            <PrimaryButton title="Load date" variant="secondary" onPress={load} />

            {roster.length === 0 ? (
              <Text style={styles.muted}>No registered students in this batch yet.</Text>
            ) : (
              <>
                <View style={styles.bulkBar}>
                  <Text style={styles.bulkTitle}>
                    Bulk select · {selectedAttendanceList.length} selected
                  </Text>
                  <View style={styles.rowBtns}>
                    <PrimaryButton title="Select all" variant="secondary" onPress={selectAllAttendance} />
                    <PrimaryButton
                      title="Clear"
                      variant="secondary"
                      onPress={clearAttendanceSelection}
                    />
                  </View>
                  <View style={styles.rowBtns}>
                    <PrimaryButton
                      title={saving ? 'Saving…' : 'Mark Present'}
                      onPress={() => markSelected('present')}
                      disabled={saving || selectedAttendanceList.length === 0}
                    />
                    <PrimaryButton
                      title="Mark Late"
                      variant="secondary"
                      onPress={() => markSelected('late')}
                      disabled={saving || selectedAttendanceList.length === 0}
                    />
                    <PrimaryButton
                      title="Mark Absent"
                      variant="danger"
                      onPress={() => markSelected('absent')}
                      disabled={saving || selectedAttendanceList.length === 0}
                    />
                  </View>
                </View>

                {roster.map((reg) => {
                  const status = attendanceMap[reg.studentId];
                  const checked = !!selectedAttendance[reg.studentId];
                  return (
                    <View
                      key={reg.id}
                      style={[styles.item, checked && styles.itemSelected]}
                    >
                      <Pressable style={styles.row} onPress={() => toggleAttendance(reg.studentId)}>
                        <View style={[styles.check, checked && styles.checkOn]}>
                          {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                        </View>
                        <Text style={styles.itemTitle}>{reg.studentName}</Text>
                        {status ? <StatusBadge status={status} /> : null}
                      </Pressable>
                      <Text style={styles.meta}>{reg.studentEmail}</Text>
                      <View style={styles.rowBtns}>
                        <PrimaryButton title="Present" onPress={() => mark(reg, 'present')} />
                        <PrimaryButton
                          title="Late"
                          variant="secondary"
                          onPress={() => mark(reg, 'late')}
                        />
                        <PrimaryButton
                          title="Absent"
                          variant="danger"
                          onPress={() => mark(reg, 'absent')}
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : null}

        {tab === 'certificates' ? (
          <>
            <Text style={styles.h2}>Issue certificates</Text>
            <Text style={styles.muted}>
              Criteria: minimum 75% attendance (Present or Late across marked session days) and all
              posted assignments accepted. Issuing marks the registration as completed.
            </Text>

            {roster.length === 0 ? (
              <Text style={styles.muted}>No registered students.</Text>
            ) : (
              <>
                <View style={styles.bulkBar}>
                  <Text style={styles.bulkTitle}>
                    Bulk issue · {selectedCertList.length} selected · {eligibleForCert.length}{' '}
                    eligible
                  </Text>
                  <View style={styles.rowBtns}>
                    <PrimaryButton
                      title="Select all eligible"
                      variant="secondary"
                      onPress={selectAllEligibleCerts}
                    />
                    <PrimaryButton
                      title="Clear"
                      variant="secondary"
                      onPress={clearCertSelection}
                    />
                  </View>
                  <View style={styles.rowBtns}>
                    <PrimaryButton
                      title={saving ? 'Issuing…' : 'Issue selected'}
                      onPress={issueSelected}
                      disabled={saving || selectedCertList.length === 0}
                    />
                    <PrimaryButton
                      title="Issue all eligible"
                      variant="secondary"
                      onPress={issueAll}
                      disabled={saving || eligibleForCert.length === 0}
                    />
                  </View>
                </View>

                {roster.map((reg) => {
                  const issued = certifiedIds.has(reg.studentId);
                  const cert = certificates.find((c) => c.studentId === reg.studentId);
                  const elig = eligibility[reg.studentId];
                  const canSelect = !issued && !!elig?.eligible;
                  const checked = !!selectedCerts[reg.studentId];
                  return (
                    <View
                      key={reg.id}
                      style={[styles.item, checked && styles.itemSelected]}
                    >
                      <Pressable
                        style={styles.row}
                        onPress={() => {
                          if (canSelect) toggleCert(reg.studentId);
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
                        <Text style={styles.itemTitle}>{reg.studentName}</Text>
                        <StatusBadge
                          status={issued ? 'issued' : elig?.eligible ? 'eligible' : 'pending'}
                        />
                      </Pressable>
                      {elig && !issued ? (
                        <Text style={styles.meta}>
                          Attendance {elig.attendancePercent}% ({elig.attendedDays}/
                          {elig.totalDays}) · Assignments {elig.assignmentsAccepted}/
                          {elig.assignmentsTotal} accepted
                        </Text>
                      ) : null}
                      {elig && !issued && !elig.eligible
                        ? elig.reasons.map((reason) => (
                            <Text key={reason} style={styles.warnLine}>
                              {reason}
                            </Text>
                          ))
                        : null}
                      {cert ? (
                        <Text style={styles.ok}>
                          {cert.certificateCode} · {new Date(cert.issuedAt).toLocaleDateString()}
                        </Text>
                      ) : canSelect ? (
                        <PrimaryButton title="Issue certificate" onPress={() => issueOne(reg)} />
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : null}

        {tab === 'feedback' ? (
          <>
            <Text style={styles.h2}>Student feedback for this session</Text>
            {feedback.length === 0 ? (
              <Text style={styles.muted}>No student feedback yet for this session.</Text>
            ) : (
              feedback.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>
                    {item.fromName}
                    {item.rating ? ` · ${item.rating}/5` : ''}
                  </Text>
                  <Text style={styles.body}>{item.comment}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'queries' ? (
          <>
            <Text style={styles.h2}>Student queries for this session</Text>
            {queries.length === 0 ? (
              <Text style={styles.muted}>No queries from students for this session.</Text>
            ) : (
              queries.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.studentName}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.body}>{item.question}</Text>
                  {item.answer ? (
                    <Text style={styles.ok}>Answer: {item.answer}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>
              ))
            )}
          </>
        ) : null}
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
    padding: 12,
    marginBottom: 12,
  },
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
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  bulkBar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  bulkTitle: { fontWeight: '700', color: colors.text, marginBottom: 8, fontSize: 13 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: colors.background,
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: colors.white, fontSize: 12, fontWeight: '800' },
  checkSpacer: { width: 30 },
  subCard: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  rowBtns: { marginTop: 8, gap: 8 },
  itemTitle: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20, fontSize: 13 },
  ok: { marginTop: 8, color: colors.success, fontWeight: '600', fontSize: 12, lineHeight: 18 },
  warnLine: { marginTop: 4, color: colors.warning, fontSize: 12, lineHeight: 17 },
  linkDanger: { color: colors.danger, marginTop: 6, fontWeight: '600', fontSize: 12 },
  subHead: { marginTop: 12, fontWeight: '700', color: colors.primaryDark, fontSize: 13 },
  gap: { height: 10 },
  answerBox: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
});

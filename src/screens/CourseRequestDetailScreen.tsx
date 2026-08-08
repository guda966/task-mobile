import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { TrainerRecord } from '../types/trainer';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseRequestDetail'>;

const NO_BACKUP = '__none__';

export function CourseRequestDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [item, setItem] = useState<CourseRequest | null>(null);
  const [trainers, setTrainers] = useState<TrainerRecord[]>([]);
  const [primaryId, setPrimaryId] = useState('');
  const [backupId, setBackupId] = useState(NO_BACKUP);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(false);

  const load = useCallback(async () => {
    const request = await collegePortalApi.getCourseRequest(route.params.requestId);
    setItem(request);
    await trainerApi.ensureDemoTrainer();
    const list = await trainerApi.listActiveTrainers();
    setTrainers(list);
    if (request?.trainerId) setPrimaryId(request.trainerId);
    else setPrimaryId('');
    setBackupId(request?.backupTrainerId || NO_BACKUP);
  }, [route.params.requestId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const trainerOptions = useMemo(
    () => [
      { value: '', label: 'Select trainer' },
      ...trainers.map((t) => ({
        value: t.id,
        label: `${t.firstName} ${t.lastName} (${t.skills.join(', ')})`,
      })),
    ],
    [trainers],
  );

  const backupOptions = useMemo(
    () => [
      { value: NO_BACKUP, label: 'None (optional)' },
      ...trainers
        .filter((t) => t.id !== primaryId)
        .map((t) => ({
          value: t.id,
          label: `${t.firstName} ${t.lastName}`,
        })),
    ],
    [trainers, primaryId],
  );

  const approve = async () => {
    try {
      setLoading(true);
      await collegePortalApi.approveCourseRequest(route.params.requestId);
      Alert.alert('Approved', 'Now assign a primary trainer (and optional backup).');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    try {
      setLoading(true);
      await collegePortalApi.rejectCourseRequest(route.params.requestId, reason);
      Alert.alert('Rejected', 'Requester can view the rejection reason.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    try {
      setLoading(true);
      const backup =
        !backupId || backupId === NO_BACKUP ? undefined : backupId;
      await trainerApi.assignTrainers(route.params.requestId, primaryId, backup);
      setEditingAssignment(false);
      Alert.alert('Assigned', 'Trainer assignment saved. It will show on the requester calendar.');
      await load();
    } catch (e) {
      Alert.alert('Assignment failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  if (!item) {
    return (
      <Screen title="Course Request" showLogo={false}>
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  const isAdmin = user?.role === 'task_admin' || user?.role === 'super_admin';
  const isRcRequest = item.requesterType === 'regional_center';
  const orgLabel = isRcRequest ? 'Regional Centre' : 'College';
  const orgName = isRcRequest
    ? item.regionalCenterName || item.collegeName
    : item.collegeName;

  return (
    <Screen title="Course Request" subtitle={item.courseName} showLogo={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <StatusBadge status={item.status} />
          </View>
          <Detail label="Requester" value={isRcRequest ? 'Regional Centre' : 'College'} />
          <Detail label={orgLabel} value={orgName} />
          <Detail label="Course" value={item.courseName} />
          <Detail label="Category" value={item.category} />
          <Detail label="Year of Graduation" value={item.yearOfGraduation} />
          <Detail label="Branch" value={item.branch} />
          <Detail label="Start Date" value={item.startDate} />
          <Detail label="End Date" value={item.endDate} />
          <Detail label="Batch size" value={String(item.batchSize)} />
          <Detail label="Requested On" value={new Date(item.requestedOn).toLocaleString()} />
          {item.rejectionReason ? (
            <Detail label="Rejection reason" value={item.rejectionReason} />
          ) : null}
          {item.adminRemark ? <Detail label="Admin remark" value={item.adminRemark} /> : null}
          {item.trainerName ? <Detail label="Primary trainer" value={item.trainerName} /> : null}
          {item.backupTrainerName ? (
            <Detail label="Backup trainer" value={item.backupTrainerName} />
          ) : null}
        </View>

        {isAdmin && item.status === 'pending' ? (
          <>
            <PrimaryButton
              title={loading ? 'Working…' : 'Approve Request'}
              onPress={approve}
              disabled={loading}
            />
            <Text style={styles.rejectLabel}>Or reject with reason</Text>
            <TextInput
              style={styles.reason}
              multiline
              placeholder="Rejection reason"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
            />
            <PrimaryButton
              title="Reject Request"
              variant="danger"
              onPress={reject}
              disabled={loading}
            />
          </>
        ) : null}

        {isAdmin &&
        item.status === 'approved' &&
        (!item.trainerId || editingAssignment) ? (
          <View style={styles.assignBox}>
            <Text style={styles.assignTitle}>
              {item.trainerId ? 'Edit trainer assignment' : 'Assign trainers'}
            </Text>
            <Text style={styles.assignLead}>
              Only approved (authorised) trainers appear here. Colleges will see the assigned
              trainer details on their calendar.
            </Text>
            <DropdownField
              label="Primary trainer"
              required
              value={primaryId}
              onChange={(v) => {
                setPrimaryId(v);
                if (v && v === backupId) setBackupId(NO_BACKUP);
              }}
              options={trainerOptions}
            />
            <DropdownField
              label="Backup trainer"
              placeholder="None (optional)"
              value={backupId}
              onChange={setBackupId}
              options={backupOptions}
            />
            <PrimaryButton
              title={loading ? 'Saving…' : item.trainerId ? 'Save changes' : 'Assign trainers'}
              onPress={assign}
              disabled={loading}
            />
            {item.trainerId ? (
              <>
                <View style={{ height: 10 }} />
                <PrimaryButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditingAssignment(false);
                    setPrimaryId(item.trainerId || '');
                    setBackupId(item.backupTrainerId || NO_BACKUP);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {item.status === 'approved' && item.trainerId && !(isAdmin && editingAssignment) ? (
          <View style={styles.assignBox}>
            <Text style={styles.assignTitle}>Assigned trainer details</Text>
            <Detail label="Primary trainer" value={item.trainerName || '—'} />
            {item.trainerEmail ? <Detail label="Email" value={item.trainerEmail} /> : null}
            {item.trainerMobile ? <Detail label="Mobile" value={item.trainerMobile} /> : null}
            {item.trainerCity ? <Detail label="City" value={item.trainerCity} /> : null}
            {item.trainerExperienceYears ? (
              <Detail label="Experience" value={`${item.trainerExperienceYears} years`} />
            ) : null}
            {item.trainerSkills ? <Detail label="Skills" value={item.trainerSkills} /> : null}
            {item.backupTrainerName ? (
              <Detail
                label="Backup trainer"
                value={`${item.backupTrainerName}${
                  item.backupTrainerMobile ? ` · ${item.backupTrainerMobile}` : ''
                }`}
              />
            ) : (
              <Detail label="Backup trainer" value="None" />
            )}
            {isAdmin ? (
              <>
                <View style={{ height: 10 }} />
                <PrimaryButton
                  title="Edit assignment"
                  variant="secondary"
                  onPress={() => {
                    setPrimaryId(item.trainerId || '');
                    setBackupId(item.backupTrainerId || NO_BACKUP);
                    setEditingAssignment(true);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {!isAdmin && item.status === 'approved' && !item.trainerId ? (
          <View style={styles.assignBox}>
            <Text style={styles.assignTitle}>Assigned trainer details</Text>
            <Text style={styles.muted}>TASK Admin has not assigned a trainer yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { fontWeight: '700', color: colors.text },
  detail: { marginBottom: 8 },
  detailLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  detailValue: { color: colors.text, fontSize: 14 },
  rejectLabel: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: colors.text },
  reason: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.text,
    marginBottom: 10,
  },
  assignBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  assignTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  assignLead: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
});

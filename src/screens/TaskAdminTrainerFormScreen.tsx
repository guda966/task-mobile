import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  CheckboxRow,
  DropdownField,
  FormField,
  PrimaryButton,
  Screen,
  StatusBadge,
} from '../components/ui';
import { TRAINER_SKILL_OPTIONS } from '../constants/trainer';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseCategory } from '../types/collegePortal';
import type {
  TrainerAchievement,
  TrainerCertificate,
  TrainerDraft,
  TrainerFileRef,
  TrainerRecord,
} from '../types/trainer';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminTrainerForm'>;

const emptyDraft = (): TrainerDraft => ({
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  skills: [],
  bio: '',
  experienceYears: '',
  city: '',
  password: '',
  confirmPassword: '',
  resume: undefined,
  certificates: [],
  achievements: [],
});

export function TaskAdminTrainerFormScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const trainerId = route.params.trainerId;
  const isEdit = Boolean(trainerId);
  const [draft, setDraft] = useState<TrainerDraft>(emptyDraft());
  const [record, setRecord] = useState<TrainerRecord | null>(null);
  const [status, setStatus] = useState('active');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [loading, setLoading] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certYear, setCertYear] = useState('');
  const [certFile, setCertFile] = useState<TrainerFileRef | undefined>();
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achYear, setAchYear] = useState('');

  const load = useCallback(async () => {
    if (!trainerId) return;
    const trainer = await trainerApi.getTrainer(trainerId);
    if (!trainer) {
      Alert.alert('Not found', 'Trainer record missing.');
      navigation.goBack();
      return;
    }
    setRecord(trainer);
    setDraft({
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      mobile: trainer.mobile,
      skills: trainer.skills,
      bio: trainer.bio,
      experienceYears: trainer.experienceYears,
      city: trainer.city,
      password: '',
      confirmPassword: '',
      resume: trainer.resume,
      certificates: trainer.certificates,
      achievements: trainer.achievements,
    });
    setStatus(trainer.status);
  }, [trainerId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const set = <K extends keyof TrainerDraft>(key: K, value: TrainerDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSkill = (skill: CourseCategory) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const uploadResume = async () => {
    try {
      const file = await pickMockDocument();
      set('resume', { ...file, uploadedAt: new Date().toISOString() });
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const addCertificate = async () => {
    if (!certTitle.trim() || !certIssuer.trim()) {
      Alert.alert('Certificate incomplete', 'Title and issuer are required.');
      return;
    }
    const next: Omit<TrainerCertificate, 'id'> = {
      title: certTitle.trim(),
      issuer: certIssuer.trim(),
      year: certYear.trim(),
      file: certFile,
    };
    setDraft((prev) => ({ ...prev, certificates: [...prev.certificates, next] }));
    setCertTitle('');
    setCertIssuer('');
    setCertYear('');
    setCertFile(undefined);
  };

  const addAchievement = () => {
    if (!achTitle.trim() || !achDesc.trim()) {
      Alert.alert('Achievement incomplete', 'Title and description are required.');
      return;
    }
    const next: Omit<TrainerAchievement, 'id'> = {
      title: achTitle.trim(),
      description: achDesc.trim(),
      year: achYear.trim(),
    };
    setDraft((prev) => ({ ...prev, achievements: [...prev.achievements, next] }));
    setAchTitle('');
    setAchDesc('');
    setAchYear('');
  };

  const save = async () => {
    try {
      setLoading(true);
      if (isEdit && trainerId) {
        const existing = await trainerApi.getTrainer(trainerId);
        if (!existing) throw new Error('Trainer not found.');
        await trainerApi.updateTrainer(trainerId, {
          firstName: draft.firstName,
          lastName: draft.lastName,
          mobile: draft.mobile,
          skills: draft.skills,
          bio: draft.bio,
          experienceYears: draft.experienceYears,
          city: draft.city,
          status: status as TrainerRecord['status'],
          currentPassword: draft.password ? existing.passwordHash : undefined,
          newPassword: draft.password || undefined,
        });
        Alert.alert('Saved', 'Trainer profile updated.');
      } else {
        await trainerApi.createTrainer(draft);
        Alert.alert('Created', 'Trainer profile and login credentials are ready.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to save', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const addFeedback = async () => {
    if (!trainerId) return;
    try {
      await trainerApi.addFeedback({
        trainerId,
        fromRole: 'task_admin',
        fromName: user?.name || 'TASK Administrator',
        rating: Number(feedbackRating) || undefined,
        comment: feedbackComment,
      });
      setFeedbackComment('');
      Alert.alert('Saved', 'Feedback added to trainer profile.');
    } catch (e) {
      Alert.alert('Unable to save', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Screen
      title={isEdit ? 'Edit Trainer' : 'Create Trainer'}
      subtitle={
        isEdit
          ? 'Update trainer profile, status, or credentials'
          : 'Create trainer profile and login credentials for assignment'
      }
      showLogo={false}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {record ? (
          <View style={styles.banner}>
            <View style={styles.row}>
              <Text style={styles.bannerTitle}>Trainer status</Text>
              <StatusBadge status={record.status} />
            </View>
            <Text style={styles.meta}>
              Created by TASK Admin · credentials for trainer login
            </Text>
            {record.rejectionReason ? (
              <Text style={styles.danger}>Rejection reason: {record.rejectionReason}</Text>
            ) : null}
          </View>
        ) : null}

        <FormField
          label="First name"
          required
          value={draft.firstName}
          onChangeText={(v) => set('firstName', v)}
        />
        <FormField
          label="Last name"
          required
          value={draft.lastName}
          onChangeText={(v) => set('lastName', v)}
        />
        <FormField
          label="Email"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={draft.email}
          onChangeText={(v) => set('email', v)}
          editable={!isEdit}
        />
        <FormField
          label="Mobile"
          required
          keyboardType="phone-pad"
          value={draft.mobile}
          onChangeText={(v) => set('mobile', v)}
        />
        <FormField label="City" required value={draft.city} onChangeText={(v) => set('city', v)} />
        <FormField
          label="Experience (years)"
          required
          keyboardType="number-pad"
          value={draft.experienceYears}
          onChangeText={(v) => set('experienceYears', v)}
        />
        <FormField
          label="Bio / profile summary"
          required
          value={draft.bio}
          onChangeText={(v) => set('bio', v)}
          multiline
          style={styles.bio}
        />

        <Text style={styles.h2}>Skills / domains *</Text>
        {TRAINER_SKILL_OPTIONS.map((skill) => (
          <CheckboxRow
            key={skill}
            label={skill}
            checked={draft.skills.includes(skill)}
            onToggle={() => toggleSkill(skill)}
          />
        ))}

        {!isEdit ? (
          <>
            <Text style={styles.h2}>Resume *</Text>
            {draft.resume ? (
              <Text style={styles.meta}>
                {draft.resume.fileName} · {draft.resume.sizeLabel}
              </Text>
            ) : (
              <Text style={styles.meta}>No resume uploaded.</Text>
            )}
            {!isEdit ? (
              <>
                <View style={styles.gap} />
                <PrimaryButton
                  title={draft.resume ? 'Replace resume' : 'Upload resume'}
                  variant="secondary"
                  onPress={uploadResume}
                />
              </>
            ) : null}

            <Text style={styles.h2}>Certificates (optional)</Text>
            {draft.certificates.map((c, index) => (
              <View key={`${c.title}-${index}`} style={styles.item}>
                <Text style={styles.itemTitle}>{c.title}</Text>
                <Text style={styles.meta}>
                  {c.issuer} · {c.year || 'n/a'}
                  {c.file ? ` · ${c.file.fileName}` : ''}
                </Text>
                {!isEdit ? (
                  <Pressable
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        certificates: prev.certificates.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {!isEdit ? (
              <>
                <FormField label="Certificate title" value={certTitle} onChangeText={setCertTitle} />
                <FormField label="Issuer" value={certIssuer} onChangeText={setCertIssuer} />
                <FormField
                  label="Year"
                  value={certYear}
                  onChangeText={setCertYear}
                  keyboardType="number-pad"
                />
                <PrimaryButton
                  title="Attach cert file"
                  variant="secondary"
                  onPress={async () => {
                    try {
                      const file = await pickMockDocument();
                      setCertFile({ ...file, uploadedAt: new Date().toISOString() });
                    } catch {
                      /* cancelled */
                    }
                  }}
                />
                <View style={styles.gap} />
                <PrimaryButton title="Add certificate" onPress={addCertificate} />
              </>
            ) : null}

            <Text style={styles.h2}>Achievements (optional)</Text>
            {draft.achievements.map((a, index) => (
              <View key={`${a.title}-${index}`} style={styles.item}>
                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.meta}>{a.description}</Text>
                {!isEdit ? (
                  <Pressable
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        achievements: prev.achievements.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {!isEdit ? (
              <>
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
          </>
        ) : null}

        {isEdit ? (
          <DropdownField
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        ) : null}

        <FormField
          label={isEdit ? 'New password (optional)' : 'Password'}
          required={!isEdit}
          secureTextEntry
          value={draft.password}
          onChangeText={(v) => set('password', v)}
          placeholder="Min 8 characters"
        />
        {!isEdit ? (
          <FormField
            label="Confirm password"
            required
            secureTextEntry
            value={draft.confirmPassword}
            onChangeText={(v) => set('confirmPassword', v)}
          />
        ) : null}

        <PrimaryButton
          title={loading ? 'Saving…' : isEdit ? 'Save profile' : 'Add authorised trainer'}
          onPress={save}
          disabled={loading}
        />

        {isEdit && trainerId ? (
          <>
            <Text style={styles.h2}>Add feedback</Text>
            <FormField
              label="Rating (1-5)"
              keyboardType="number-pad"
              value={feedbackRating}
              onChangeText={setFeedbackRating}
            />
            <FormField
              label="Comment"
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
              style={styles.bio}
            />
            <PrimaryButton title="Save feedback" variant="secondary" onPress={addFeedback} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  h2: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: colors.text },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  banner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerTitle: { fontWeight: '800', color: colors.primaryDark },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  danger: { color: colors.danger, marginTop: 6, fontSize: 12 },
  actions: { marginBottom: 16 },
  rejectLabel: { marginTop: 12, marginBottom: 8, fontWeight: '700', color: colors.text },
  reason: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.text,
    marginBottom: 10,
  },
  gap: { height: 8 },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  itemTitle: { fontWeight: '700', color: colors.text },
  remove: { color: colors.danger, marginTop: 6, fontWeight: '600', fontSize: 12 },
});

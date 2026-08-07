import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckboxRow, FormField, PrimaryButton, Screen } from '../components/ui';
import { TRAINER_SKILL_OPTIONS, createTrainerRegistrationSeed } from '../constants/trainer';
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
} from '../types/trainer';
import { pickMockDocument } from '../utils/mockFilePick';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerRegistration'>;

type CertDraft = Omit<TrainerCertificate, 'id'>;
type AchDraft = Omit<TrainerAchievement, 'id'>;

export function TrainerRegistrationScreen({ navigation, route }: Props) {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<TrainerDraft>(() =>
    createTrainerRegistrationSeed(route.params.email, route.params.mobile),
  );
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certYear, setCertYear] = useState('');
  const [certFile, setCertFile] = useState<TrainerFileRef | undefined>();
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achYear, setAchYear] = useState('');

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

  const pickCertFile = async () => {
    try {
      const file = await pickMockDocument();
      setCertFile({ ...file, uploadedAt: new Date().toISOString() });
    } catch (e) {
      if (e instanceof Error && e.message === 'Cancelled') return;
    }
  };

  const addCertificate = () => {
    if (!certTitle.trim() || !certIssuer.trim()) {
      Alert.alert('Certificate incomplete', 'Title and issuer are required.');
      return;
    }
    const next: CertDraft = {
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
    const next: AchDraft = {
      title: achTitle.trim(),
      description: achDesc.trim(),
      year: achYear.trim(),
    };
    setDraft((prev) => ({ ...prev, achievements: [...prev.achievements, next] }));
    setAchTitle('');
    setAchDesc('');
    setAchYear('');
  };

  const submit = async () => {
    try {
      setLoading(true);
      const session = await trainerApi.registerSelf({
        ...draft,
        email: route.params.email,
        mobile: route.params.mobile,
      });
      setUser(session);
      Alert.alert(
        'Profile submitted',
        'Your complete profile is pending TASK Admin approval. You cannot be assigned to courses until approved.',
      );
      navigation.reset({ index: 0, routes: [{ name: 'TrainerHome' }] });
    } catch (e) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Create Mentor Profile"
      subtitle="Upload resume (required). Certificates and achievements are optional."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.seedBanner}>
          <Text style={styles.seedTitle}>Demo seed profile loaded</Text>
          <Text style={styles.seedBody}>
            Profile fields and resume are prefilled. Certificates and achievements are optional —
            edit or clear them before submit.
          </Text>
        </View>

        <FormField
          label="Email"
          value={route.params.email}
          onChangeText={() => undefined}
          editable={false}
        />
        <FormField
          label="Mobile"
          value={route.params.mobile}
          onChangeText={() => undefined}
          editable={false}
        />
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

        <Text style={styles.h2}>Resume *</Text>
        {draft.resume ? (
          <Text style={styles.meta}>
            {draft.resume.fileName} · {draft.resume.sizeLabel}
          </Text>
        ) : (
          <Text style={styles.muted}>No resume uploaded yet.</Text>
        )}
        <View style={styles.gap} />
        <PrimaryButton
          title={draft.resume ? 'Replace resume' : 'Upload resume'}
          variant="secondary"
          onPress={uploadResume}
        />

        <Text style={styles.h2}>Certificates (optional)</Text>
        {draft.certificates.map((c, index) => (
          <View key={`${c.title}-${index}`} style={styles.item}>
            <Text style={styles.itemTitle}>{c.title}</Text>
            <Text style={styles.meta}>
              {c.issuer} · {c.year || 'Year n/a'}
              {c.file ? ` · ${c.file.fileName}` : ''}
            </Text>
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
        <Text style={styles.meta}>
          Cert file: {certFile ? `${certFile.fileName}` : 'optional'}
        </Text>
        <View style={styles.rowBtns}>
          <PrimaryButton title="Attach cert file" variant="secondary" onPress={pickCertFile} />
          <View style={styles.gap} />
          <PrimaryButton title="Add certificate" onPress={addCertificate} />
        </View>

        <Text style={styles.h2}>Achievements (optional)</Text>
        {draft.achievements.map((a, index) => (
          <View key={`${a.title}-${index}`} style={styles.item}>
            <Text style={styles.itemTitle}>{a.title}</Text>
            <Text style={styles.meta}>{a.description}</Text>
            <Text style={styles.meta}>{a.year || 'Year n/a'}</Text>
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

        <Text style={styles.h2}>Account password *</Text>
        <FormField
          label="Password"
          required
          secureTextEntry
          value={draft.password}
          onChangeText={(v) => set('password', v)}
        />
        <FormField
          label="Confirm password"
          required
          secureTextEntry
          value={draft.confirmPassword}
          onChangeText={(v) => set('confirmPassword', v)}
        />

        <PrimaryButton
          title={loading ? 'Submitting…' : 'Submit complete profile'}
          onPress={submit}
          disabled={loading}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  h2: { marginTop: 14, marginBottom: 8, fontWeight: '700', color: colors.text },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  muted: { color: colors.textMuted, fontSize: 12 },
  gap: { height: 8 },
  seedBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  seedTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  seedBody: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
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
  rowBtns: { marginBottom: 8 },
});

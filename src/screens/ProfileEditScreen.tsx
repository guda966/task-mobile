import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { CheckboxRow, FormField, PrimaryButton, Screen } from '../components/ui';
import { TRAINER_SKILL_OPTIONS } from '../constants/trainer';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { accountApi } from '../services/accountApi';
import { adminUsersApi } from '../services/adminUsersApi';
import { mockApi } from '../services/mockApi';
import { studentApi } from '../services/studentApi';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseCategory } from '../types/collegePortal';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props) {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');

  const [contactName, setContactName] = useState('');
  const [designation, setDesignation] = useState('');
  const [officialMobile, setOfficialMobile] = useState('');

  const [skills, setSkills] = useState<CourseCategory[]>([]);
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [city, setCity] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    if (user.role === 'student' && user.studentId) {
      const profile = await studentApi.getStudent(user.studentId);
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setMobile(profile.mobile);
      }
    } else if (user.role === 'college_admin' && user.enrollmentId) {
      const enrollment = await mockApi.getEnrollment(user.enrollmentId);
      if (enrollment) {
        setContactName(enrollment.contactPersonName);
        setDesignation(enrollment.contactDesignation);
        setOfficialMobile(enrollment.officialMobile);
      }
    } else if (user.role === 'trainer' && user.trainerId) {
      const profile = await trainerApi.getTrainer(user.trainerId);
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setMobile(profile.mobile);
        setSkills(profile.skills);
        setBio(profile.bio);
        setExperienceYears(profile.experienceYears);
        setCity(profile.city);
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSkill = (skill: CourseCategory) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const validatePasswordChange = (): string | null => {
    if (!newPassword && !currentPassword && !confirmPassword) return null;
    if (!currentPassword) return 'Enter your current password to change it.';
    if (newPassword.length < 8) return 'New password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'New password and confirmation do not match.';
    return null;
  };

  const onSave = async () => {
    if (!user) return;
    const pwdError = validatePasswordChange();
    if (pwdError) {
      Alert.alert('Check password', pwdError);
      return;
    }

    try {
      setLoading(true);
      if (user.role === 'student' && user.studentId) {
        const session = await accountApi.updateStudentProfile(user.studentId, {
          firstName,
          lastName,
          mobile,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        });
        setUser(session);
      } else if (user.role === 'college_admin' && user.enrollmentId) {
        const session = await accountApi.updateCollegeAdminProfile(user.enrollmentId, {
          contactPersonName: contactName,
          contactDesignation: designation,
          officialMobile,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        });
        setUser(session);
      } else if (user.role === 'trainer' && user.trainerId) {
        const session = await trainerApi.updateOwnProfile(user.trainerId, {
          firstName,
          lastName,
          mobile,
          skills,
          bio,
          experienceYears,
          city,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        });
        setUser(session);
      } else if (
        user.role === 'task_admin' ||
        user.role === 'super_admin' ||
        user.role === 'placement_coordinator'
      ) {
        if (!newPassword) {
          Alert.alert('Nothing to save', 'Update your password to save changes.');
          return;
        }
        if (!user.adminUserId) {
          const byEmail = await adminUsersApi.getByEmail(user.email);
          if (!byEmail) throw new Error('Admin profile not found.');
          await adminUsersApi.updateOwnPassword(byEmail.id, currentPassword, newPassword);
        } else {
          await adminUsersApi.updateOwnPassword(user.adminUserId, currentPassword, newPassword);
        }
      } else {
        throw new Error('Unsupported account type.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Saved', 'Your profile was updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Screen title="Edit Profile" subtitle="Sign in required">
        <Text style={styles.muted}>Please sign in again.</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Edit Profile"
      subtitle={
        user.role === 'task_admin' ||
        user.role === 'super_admin' ||
        user.role === 'placement_coordinator'
          ? 'Change staff password'
          : user.role === 'trainer'
            ? 'Update your trainer profile'
            : 'Update contact details and password'
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField
          label="Email ID"
          value={user.email}
          onChangeText={() => undefined}
          editable={false}
        />
        <Text style={styles.note}>Email cannot be changed after registration.</Text>

        {user.role === 'student' ? (
          <>
            <FormField label="First name" required value={firstName} onChangeText={setFirstName} />
            <FormField label="Last name" required value={lastName} onChangeText={setLastName} />
            <FormField
              label="Mobile"
              required
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile"
            />
          </>
        ) : null}

        {user.role === 'college_admin' ? (
          <>
            <FormField
              label="Contact person name"
              required
              value={contactName}
              onChangeText={setContactName}
            />
            <FormField
              label="Designation"
              required
              value={designation}
              onChangeText={setDesignation}
            />
            <FormField
              label="Official mobile"
              required
              keyboardType="phone-pad"
              value={officialMobile}
              onChangeText={setOfficialMobile}
              placeholder="10-digit mobile"
            />
          </>
        ) : null}

        {user.role === 'trainer' ? (
          <>
            <FormField label="First name" required value={firstName} onChangeText={setFirstName} />
            <FormField label="Last name" required value={lastName} onChangeText={setLastName} />
            <FormField
              label="Mobile"
              required
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
            <FormField label="City" required value={city} onChangeText={setCity} />
            <FormField
              label="Experience (years)"
              keyboardType="number-pad"
              value={experienceYears}
              onChangeText={setExperienceYears}
            />
            <FormField
              label="Bio / profile summary"
              value={bio}
              onChangeText={setBio}
              multiline
              style={styles.bio}
            />
            <Text style={styles.h2}>Skills / domains *</Text>
            {TRAINER_SKILL_OPTIONS.map((skill) => (
              <CheckboxRow
                key={skill}
                label={skill}
                checked={skills.includes(skill)}
                onToggle={() => toggleSkill(skill)}
              />
            ))}
          </>
        ) : null}

        <Text style={styles.h2}>Change password (optional)</Text>
        <FormField
          label="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Required only if changing password"
        />
        <FormField
          label="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min 8 characters"
        />
        <FormField
          label="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <PrimaryButton
          title={loading ? 'Saving…' : 'Save changes'}
          onPress={onSave}
          disabled={loading}
        />
        <View style={styles.gap} />
        <PrimaryButton title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  gap: { height: 10 },
  h2: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  note: {
    marginTop: -8,
    marginBottom: 12,
    color: colors.textMuted,
    fontSize: 12,
  },
  muted: { color: colors.textMuted },
  bio: { minHeight: 90, textAlignVertical: 'top' },
});

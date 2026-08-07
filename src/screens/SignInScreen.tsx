import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DropdownField, FormField, PrimaryButton, Screen } from '../components/ui';
import {
  DUMMY_COLLEGE_CONTACTS,
  DUMMY_COLLEGE_PASSWORD,
} from '../constants/demoData';
import { DUMMY_STUDENT } from '../constants/student';
import { DUMMY_TRAINER } from '../constants/trainer';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { UserRole } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SIGN_IN_ROLES = [
  { value: 'college_admin', label: 'College Admin' },
  { value: 'task_admin', label: 'TASK Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'student', label: 'Student' },
  { value: 'trainer', label: 'Mentor' },
] as const;

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College' },
  { value: 'student', label: 'Student' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'corporate', label: 'Corporate' },
];

const TASK_ADMIN_DEMO = {
  email: 'admin@task.telangana.gov.in',
  password: 'TaskAdmin@123',
};

const SUPER_ADMIN_DEMO = {
  email: 'superadmin@task.telangana.gov.in',
  password: 'SuperAdmin@123',
};

export function SignInScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [role, setRole] = useState<UserRole | ''>('');
  const [regType, setRegType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRoleChange = (value: string) => {
    const next = value as UserRole | '';
    setRole(next);
    if (next === 'task_admin') {
      setEmail(TASK_ADMIN_DEMO.email);
      setPassword(TASK_ADMIN_DEMO.password);
    } else if (next === 'super_admin') {
      setEmail(SUPER_ADMIN_DEMO.email);
      setPassword(SUPER_ADMIN_DEMO.password);
    } else if (next === 'college_admin') {
      setEmail(DUMMY_COLLEGE_CONTACTS.officialEmail);
      setPassword(DUMMY_COLLEGE_PASSWORD);
    } else if (next === 'student') {
      setEmail(DUMMY_STUDENT.email);
      setPassword(DUMMY_STUDENT.password);
    } else if (next === 'trainer') {
      setEmail(DUMMY_TRAINER.email);
      setPassword(DUMMY_TRAINER.password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const onSubmit = async () => {
    if (!role) {
      Alert.alert(
        'Select role',
        'Please choose College Admin, TASK Admin, Super Admin, Student, or Mentor.',
      );
      return;
    }
    try {
      setLoading(true);
      const user = await signIn(email, password);
      if (user.role !== role) {
        Alert.alert(
          'Wrong role selected',
          `These credentials belong to a ${user.role.replace('_', ' ')} account. Select the matching role.`,
        );
        return;
      }
      if (user.role === 'super_admin') {
        navigation.reset({ index: 0, routes: [{ name: 'SuperAdminHome' }] });
      } else if (user.role === 'task_admin') {
        navigation.reset({ index: 0, routes: [{ name: 'TaskAdminHome' }] });
      } else if (user.role === 'student') {
        navigation.reset({ index: 0, routes: [{ name: 'StudentHome' }] });
      } else if (user.role === 'trainer') {
        navigation.reset({ index: 0, routes: [{ name: 'TrainerHome' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'CollegeHome' }] });
      }
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Sign In" subtitle="Choose your role, then sign in">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <DropdownField
          label="Sign in as"
          required
          placeholder="Select role"
          options={SIGN_IN_ROLES.map((r) => ({ value: r.value, label: r.label }))}
          value={role}
          onChange={onRoleChange}
        />
        <FormField
          label="Email ID"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder={
            role === 'student' ? 'student@email.com' : 'official@college.ac.in'
          }
        />
        <FormField
          label="Password"
          required
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
        />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
        <PrimaryButton
          title={loading ? 'Signing in…' : 'Sign In'}
          onPress={onSubmit}
          disabled={loading}
        />

        <Text style={styles.regLabel}>New registration</Text>
        <DropdownField
          label="Register as"
          placeholder="Select registration type"
          options={REGISTRATION_OPTIONS}
          value={regType}
          onChange={setRegType}
        />
        <PrimaryButton
          title="Continue to registration"
          variant="secondary"
          onPress={() => {
            if (!regType) {
              Alert.alert(
                'Select registration type',
                'Choose College, Student, Mentor, or Corporate.',
              );
              return;
            }
            if (regType === 'college') navigation.navigate('OtpVerify');
            else if (regType === 'student') navigation.navigate('StudentOtp');
            else if (regType === 'mentor') navigation.navigate('TrainerOtp');
            else navigation.navigate('CorporateOtp');
          }}
        />
        <Text style={styles.hint}>
          {role === 'student'
            ? 'Demo student credentials are prefilled. Register first if sign-in fails.'
            : role === 'task_admin'
              ? 'Demo TASK Admin credentials are prefilled for testing.'
              : role === 'super_admin'
                ? 'Demo Super Admin credentials are prefilled — full platform + reports.'
                : role === 'college_admin'
                  ? 'Demo college credentials are prefilled.'
                  : role === 'trainer'
                    ? 'Demo mentor credentials are prefilled (approved profile).'
                    : 'Select a role to continue.'}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  forgot: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  regLabel: {
    marginTop: 20,
    marginBottom: 4,
    fontWeight: '700',
    color: colors.text,
  },
  hint: { marginTop: 16, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});

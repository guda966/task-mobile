import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DropdownField, FormField, PrimaryButton, Screen } from '../components/ui';
import {
  DUMMY_COLLEGE_CONTACTS,
  DUMMY_COLLEGE_PASSWORD,
} from '../constants/demoData';
import { DUMMY_STUDENT } from '../constants/student';
import { DUMMY_TRAINER } from '../constants/trainer';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import type { UserRole } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SIGN_IN_ROLES = [
  { value: 'college_admin', label: 'College' },
  { value: 'student', label: 'Student' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'task_admin', label: 'TASK Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const TASK_ADMIN_DEMO = {
  email: 'admin@task.telangana.gov.in',
  password: 'TaskAdmin@123',
};

const SUPER_ADMIN_DEMO = {
  email: 'superadmin@task.telangana.gov.in',
  password: 'SuperAdmin@123',
};

const CORPORATE_DEMO = {
  email: 'hr@demo-corporate.in',
  password: 'Corporate@123',
};

const CORPORATE_KEY = 'task.corporateRegistrations.v1';

type CorporateRecord = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  passwordHash: string;
  status: string;
};

export function SignInScreen({ navigation }: Props) {
  const { signIn, setUser } = useAuth();
  const [role, setRole] = useState<UserRole | ''>('');
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
    } else if (next === 'corporate') {
      setEmail(CORPORATE_DEMO.email);
      setPassword(CORPORATE_DEMO.password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const goHome = (signedRole: UserRole) => {
    if (signedRole === 'super_admin') {
      navigation.reset({ index: 0, routes: [{ name: 'SuperAdminHome' }] });
    } else if (signedRole === 'task_admin') {
      navigation.reset({ index: 0, routes: [{ name: 'TaskAdminHome' }] });
    } else if (signedRole === 'student') {
      navigation.reset({ index: 0, routes: [{ name: 'StudentHome' }] });
    } else if (signedRole === 'trainer') {
      navigation.reset({ index: 0, routes: [{ name: 'TrainerHome' }] });
    } else if (signedRole === 'corporate') {
      navigation.reset({ index: 0, routes: [{ name: 'CorporateHome' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'CollegeHome' }] });
    }
  };

  const onSubmit = async () => {
    if (!role) {
      Alert.alert('Select role', 'Please choose who you are signing in as.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter email and password.');
      return;
    }

    try {
      setLoading(true);

      if (role === 'corporate') {
        const raw = await AsyncStorage.getItem(CORPORATE_KEY);
        const items = raw ? (JSON.parse(raw) as CorporateRecord[]) : [];
        const match = items.find(
          (c) => c.email === email.trim().toLowerCase() && c.passwordHash === password,
        );
        if (!match) {
          throw new Error('Invalid corporate email or password. Register first if needed.');
        }
        const session = {
          role: 'corporate' as const,
          email: match.email,
          name: match.contactName || match.companyName,
        };
        await mockApi.setSession(session);
        setUser(session);
        goHome('corporate');
        return;
      }

      const user = await signIn(email.trim(), password);
      if (user.role !== role) {
        Alert.alert(
          'Wrong role selected',
          `These credentials belong to a ${user.role.replace(/_/g, ' ')} account.`,
        );
        return;
      }
      goHome(user.role);
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showLogo={false} subtitle="Access your TASK portal account">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/brand/task-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="TASK logo"
          />
        </View>

        <DropdownField
          label="Sign in as"
          required
          placeholder="Select College, Student, Trainer, Corporate, or Admin"
          options={SIGN_IN_ROLES}
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
          placeholder="name@example.com"
        />
        <FormField
          label="Password"
          required
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
        />

        <Pressable
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgot}
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <PrimaryButton
          title={loading ? 'Signing in…' : 'Sign In'}
          onPress={onSubmit}
          disabled={loading}
        />

        <View style={styles.gap} />
        <PrimaryButton
          title="New to TASK? Register / Sign up"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  logo: {
    width: 140,
    height: 140,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginTop: -4,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  gap: {
    height: 10,
  },
});

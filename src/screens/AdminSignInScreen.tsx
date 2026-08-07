import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import {
  DEMO_PLACEMENT_COORDINATOR,
  DEMO_SUPER_ADMIN,
  DEMO_TASK_ADMIN,
} from '../services/adminUsersApi';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { UserRole } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSignIn'>;

function homeForRole(role: UserRole): keyof RootStackParamList {
  if (role === 'super_admin') return 'SuperAdminHome';
  if (role === 'task_admin') return 'TaskAdminHome';
  if (role === 'placement_coordinator') return 'PlacementCoordinatorHome';
  return 'Welcome';
}

export function AdminSignInScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(DEMO_SUPER_ADMIN.email);
  const [password, setPassword] = useState(DEMO_SUPER_ADMIN.password);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter staff email and password.');
      return;
    }
    try {
      setLoading(true);
      const user = await signIn(email.trim(), password);
      if (
        user.role !== 'super_admin' &&
        user.role !== 'task_admin' &&
        user.role !== 'placement_coordinator'
      ) {
        Alert.alert(
          'Not a staff account',
          'Use the public Sign In for College, Student, Trainer, or Corporate.',
        );
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: homeForRole(user.role) }] });
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showLogo={false} subtitle="Staff portal — Super Admin, TASK Admin, Placement">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/brand/task-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="TASK logo"
          />
        </View>

        <Text style={styles.lead}>
          Staff accounts are created by Super Admin. This sign-in is not listed on the public portal.
        </Text>

        <View style={styles.demoBanner}>
          <Text style={styles.demoTitle}>Demo staff logins</Text>
          <Text style={styles.demoBody}>
            Super — {DEMO_SUPER_ADMIN.email} / {DEMO_SUPER_ADMIN.password}
          </Text>
          <Text style={styles.demoBody}>
            TASK Admin — {DEMO_TASK_ADMIN.email} / {DEMO_TASK_ADMIN.password}
          </Text>
          <Text style={styles.demoBody}>
            Placement — {DEMO_PLACEMENT_COORDINATOR.email} / {DEMO_PLACEMENT_COORDINATOR.password}
          </Text>
        </View>

        <FormField
          label="Staff email"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <FormField
          label="Password"
          required
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          title={loading ? 'Signing in…' : 'Staff Sign In'}
          onPress={onSubmit}
          disabled={loading}
        />
        <View style={styles.gap} />
        <PrimaryButton
          title="Back to public Sign In"
          variant="secondary"
          onPress={() => navigation.navigate('SignIn')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  logo: { width: 140, height: 140 },
  lead: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  demoBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDCDC',
  },
  demoTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 6, fontSize: 13 },
  demoBody: { color: colors.text, fontSize: 12, lineHeight: 18 },
  gap: { height: 10 },
});

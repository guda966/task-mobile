import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsTicker } from '../components/NewsTicker';
import { DropdownField, PrimaryButton, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  DEMO_CREDENTIALS_SUMMARY,
  DEMO_SEED_VERSION,
  ensureDemoData,
} from '../services/demoSeedApi';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type RegistrationType = 'college' | 'student' | 'trainer';

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College Registration' },
  { value: 'student', label: 'Student Registration' },
  { value: 'trainer', label: 'Trainer Registration' },
];

export function WelcomeScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [regType, setRegType] = useState<RegistrationType | ''>('');
  const [seedReady, setSeedReady] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureDemoData();
      } finally {
        if (alive) setSeedReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Trainer registration.');
      return;
    }
    if (regType === 'college') navigation.navigate('OtpVerify');
    else if (regType === 'student') navigation.navigate('StudentOtp');
    else navigation.navigate('TrainerOtp');
  };

  const loadFreshDemo = () => {
    const run = async () => {
      setSeeding(true);
      try {
        await signOut();
        await ensureDemoData({ force: true });
        setSeedReady(true);
        Alert.alert(
          'Fresh demo data loaded',
          `Seed ${DEMO_SEED_VERSION} is ready.\n\n${DEMO_CREDENTIALS_SUMMARY}`,
        );
      } catch (e) {
        Alert.alert('Could not load demo data', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setSeeding(false);
      }
    };

    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined'
          ? window.confirm(
              'This clears all local demo data in this browser and reloads fresh dummy records. Continue?',
            )
          : true;
      if (ok) void run();
      return;
    }

    Alert.alert(
      'Load fresh demo data?',
      'This clears all local demo data on this device and reloads fresh dummy records.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load fresh data', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  return (
    <Screen
      title="TASK Portal"
      subtitle="Telangana Academy for Skill and Knowledge (TASK)"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <NewsTicker />

        <Text style={styles.sectionTitle}>About TASK</Text>
        <Text style={styles.about}>
          TASK (Telangana Academy for Skill and Knowledge) was set up by the Government of Telangana
          to skill youth and improve employability. It connects colleges, industry, and trainers to
          offer technology and workplace skills aligned to today’s job market.
        </Text>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Important note</Text>
          <Text style={styles.bullet}>
            • Use a valid email and mobile number — all official communication is sent there.
          </Text>
          <Text style={styles.bullet}>• Fields marked * are mandatory.</Text>
          <Text style={styles.bullet}>
            • Students can register only from TASK-approved colleges.
          </Text>
          <Text style={styles.bullet}>
            • Trainers must submit a resume (certificates/achievements optional) for TASK Admin
            approval.
          </Text>
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Team demo</Text>
          <Text style={styles.demoBody}>
            {seedReady
              ? 'Dummy data is ready for this browser. Use “Load fresh demo data” before a walkthrough so every role starts clean.'
              : 'Preparing demo data…'}
          </Text>
          <PrimaryButton
            title={seeding ? 'Loading…' : 'Load fresh demo data'}
            variant="secondary"
            onPress={loadFreshDemo}
            disabled={seeding}
          />
        </View>

        <Text style={styles.group}>New registration</Text>
        <DropdownField
          label="Register as"
          required
          placeholder="Select registration type"
          options={REGISTRATION_OPTIONS}
          value={regType}
          onChange={(v) => setRegType(v as RegistrationType | '')}
        />
        <PrimaryButton title="Continue to registration" onPress={startRegistration} />
        <View style={styles.gap} />

        <Text style={styles.group}>Already registered?</Text>
        <PrimaryButton
          title="Sign In"
          variant="secondary"
          onPress={() => navigation.navigate('SignIn')}
        />

        <Text style={styles.hint}>
          Demo sign-in autofills after you select a role on the Sign In screen.{'\n'}
          Dummy OTP — Email: 111111 · Mobile: 222222
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  sectionTitle: {
    fontWeight: '800',
    color: colors.text,
    fontSize: 16,
    marginBottom: 6,
  },
  about: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  noteBox: {
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#F0D9C8',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  noteTitle: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  demoBox: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  demoTitle: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 14,
  },
  demoBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  group: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  gap: { height: 10 },
  hint: {
    marginTop: 18,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});

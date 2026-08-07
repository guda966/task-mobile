import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DropdownField, PrimaryButton, Screen } from '../components/ui';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type RegistrationType = 'college' | 'student' | 'trainer';

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College Registration' },
  { value: 'student', label: 'Student Registration' },
  { value: 'trainer', label: 'Trainer Registration' },
];

export function WelcomeScreen({ navigation }: Props) {
  const [regType, setRegType] = useState<RegistrationType | ''>('');

  const startRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Trainer registration.');
      return;
    }
    if (regType === 'college') navigation.navigate('OtpVerify');
    else if (regType === 'student') navigation.navigate('StudentOtp');
    else navigation.navigate('TrainerOtp');
  };

  return (
    <Screen
      title="TASK Portal"
      subtitle="Telangana Academy for Skill and Knowledge (TASK)"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Register colleges, students, and trainers for TASK training programs.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Please read before continuing</Text>
          <Text style={styles.bullet}>
            • Provide a valid email and contact number. All official communication goes there.
          </Text>
          <Text style={styles.bullet}>• * denotes mandatory fields.</Text>
          <Text style={styles.bullet}>
            • Students can register only from TASK-approved colleges.
          </Text>
          <Text style={styles.bullet}>
            • Trainers must submit resume, certificates, and achievements for TASK Admin approval.
          </Text>
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
          Demo TASK Admin: admin@task.telangana.gov.in / TaskAdmin@123{'\n'}
          Demo Student: student.demo@gmail.com / Student@123{'\n'}
          Demo Trainer: trainer.demo@task.telangana.gov.in / Trainer@123{'\n'}
          Dummy OTP — Email: 111111 · Mobile: 222222
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  lead: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  panelTitle: {
    color: colors.accent,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
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

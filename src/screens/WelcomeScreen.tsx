import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsTicker } from '../components/NewsTicker';
import { DropdownField, PrimaryButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

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
        <View style={styles.officials}>
          <OfficialCard
            source={require('../../assets/officials/cm-revanth-reddy.png')}
            name="Sri Anumula Revanth Reddy"
            title="Hon’ble Chief Minister"
            org="Government of Telangana"
          />
          <OfficialCard
            source={require('../../assets/officials/minister-sridhar-babu.png')}
            name="Sri D. Sridhar Babu"
            title="Hon’ble Minister for ITE&C"
            org="Industries & Commerce"
          />
        </View>

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

function OfficialCard({
  source,
  name,
  title,
  org,
}: {
  source: number;
  name: string;
  title: string;
  org: string;
}) {
  return (
    <View style={styles.official}>
      <View style={styles.photoFrame}>
        <Image
          source={source}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={name}
        />
      </View>
      <Text style={styles.officialName}>{name}</Text>
      <Text style={styles.officialTitle}>{title}</Text>
      <Text style={styles.officialOrg}>{org}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  officials: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  official: {
    flex: 1,
    alignItems: 'center',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  officialName: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  officialTitle: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 15,
  },
  officialOrg: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
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

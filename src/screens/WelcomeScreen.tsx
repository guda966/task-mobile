import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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

/** Official TASK header artwork (source asset is 1024×84). */
const BANNER_ASPECT = 1024 / 84;

export function WelcomeScreen({ navigation }: Props) {
  const [regType, setRegType] = useState<RegistrationType | ''>('');
  const { width } = useWindowDimensions();

  const startRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Trainer registration.');
      return;
    }
    if (regType === 'college') navigation.navigate('OtpVerify');
    else if (regType === 'student') navigation.navigate('StudentOtp');
    else navigation.navigate('TrainerOtp');
  };

  // Keep the official banner readable on narrow screens by scaling height up
  // and allowing horizontal scroll when needed.
  const bannerHeight = Math.max(84, Math.min(110, width * 0.12));
  const bannerWidth = Math.max(width, bannerHeight * BANNER_ASPECT);

  return (
    <Screen showLogo={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bannerBlock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={width < bannerWidth}
            bounces={false}
            style={styles.bannerScroll}
          >
            <Image
              source={require('../../assets/brand/task-official-banner.png')}
              style={{ width: bannerWidth, height: bannerHeight }}
              resizeMode="contain"
              accessibilityLabel="Telangana Academy for Skill and Knowledge — Department of ITE&C, Government of Telangana"
            />
          </ScrollView>
        </View>

        <Text style={styles.portalTitle}>TASK Portal</Text>

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

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  bannerBlock: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerScroll: {
    backgroundColor: colors.white,
  },
  portalTitle: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
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

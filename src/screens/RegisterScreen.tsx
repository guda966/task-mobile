import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DropdownField, PrimaryButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type RegistrationType = 'college' | 'student' | 'corporate';

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College' },
  { value: 'student', label: 'Student' },
  { value: 'corporate', label: 'Corporate' },
];

export function RegisterScreen({ navigation }: Props) {
  const [regType, setRegType] = useState<RegistrationType | ''>('');

  const continueRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Corporate.');
      return;
    }
    if (regType === 'college') navigation.navigate('OtpVerify');
    else if (regType === 'student') navigation.navigate('StudentOtp');
    else navigation.navigate('CorporateOtp');
  };

  return (
    <Screen showLogo={false} subtitle="Create your TASK portal account">
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
          Select your registration type to continue. College, Student, and Corporate accounts can
          register here. Trainer accounts are created by TASK Admin.
        </Text>

        <DropdownField
          label="Register as"
          required
          placeholder="Select College, Student, or Corporate"
          options={REGISTRATION_OPTIONS}
          value={regType}
          onChange={(v) => setRegType(v as RegistrationType | '')}
        />

        <PrimaryButton title="Continue" onPress={continueRegistration} />
        <View style={styles.gap} />
        <PrimaryButton
          title="Already have an account? Sign In"
          variant="secondary"
          onPress={() => navigation.navigate('SignIn')}
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
  lead: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  gap: {
    height: 10,
  },
});

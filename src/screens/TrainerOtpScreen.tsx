import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import { DUMMY_EMAIL_OTP, DUMMY_MOBILE_OTP } from '../constants/demoData';
import { TRAINER_REGISTRATION_SEED } from '../constants/trainer';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import { isValidMobile } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerOtp'>;

export function TrainerOtpScreen({ navigation }: Props) {
  const [email, setEmail] = useState(TRAINER_REGISTRATION_SEED.email);
  const [mobile, setMobile] = useState(TRAINER_REGISTRATION_SEED.mobile);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!isValidMobile(mobile)) {
      Alert.alert('Invalid mobile', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    try {
      setLoading(true);
      const res = await mockApi.sendOtp(email, mobile);
      setOtpSent(true);
      setEmailOtp(res.emailOtp);
      setMobileOtp(res.mobileOtp);
      Alert.alert(
        'Dummy OTPs generated',
        `Email OTP: ${res.emailOtp}\nMobile OTP: ${res.mobileOtp}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    try {
      setLoading(true);
      const ok = await mockApi.verifyOtp(email, mobile, emailOtp, mobileOtp);
      if (!ok) {
        Alert.alert('OTP failed', `Use Email OTP ${DUMMY_EMAIL_OTP} and Mobile OTP ${DUMMY_MOBILE_OTP}.`);
        return;
      }
      navigation.navigate('TrainerRegistration', {
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Trainer Registration" subtitle="Verify email and mobile, then create profile">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.demoBanner}>
          <Text style={styles.demoTitle}>Demo seed data</Text>
          <Text style={styles.demoBody}>
            Email / mobile are prefilled for registration testing. OTP — Email:{' '}
            {DUMMY_EMAIL_OTP} · Mobile: {DUMMY_MOBILE_OTP}
          </Text>
        </View>

        <FormField
          label="Email ID"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
        />
        <FormField
          label="Mobile"
          required
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
          placeholder="10-digit mobile"
        />

        {!otpSent ? (
          <PrimaryButton
            title={loading ? 'Sending…' : 'Send OTP'}
            onPress={sendOtp}
            disabled={loading}
          />
        ) : (
          <>
            <FormField
              label="Email OTP"
              required
              keyboardType="number-pad"
              value={emailOtp}
              onChangeText={setEmailOtp}
            />
            <FormField
              label="Mobile OTP"
              required
              keyboardType="number-pad"
              value={mobileOtp}
              onChangeText={setMobileOtp}
            />
            <PrimaryButton
              title={loading ? 'Verifying…' : 'Verify & continue'}
              onPress={verify}
              disabled={loading}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  demoBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  demoTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  demoBody: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});

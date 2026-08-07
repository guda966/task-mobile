import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import { DUMMY_EMAIL_OTP, DUMMY_MOBILE_OTP } from '../constants/demoData';
import { DUMMY_STUDENT } from '../constants/student';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import { isValidMobile } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentOtp'>;

export function StudentOtpScreen({ navigation }: Props) {
  const [email, setEmail] = useState(DUMMY_STUDENT.email);
  const [mobile, setMobile] = useState(DUMMY_STUDENT.mobile);
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
        `Email OTP: ${res.emailOtp}\nMobile OTP: ${res.mobileOtp}\n\n(No real SMS/email is sent in demo mode.)`,
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
        Alert.alert(
          'OTP failed',
          `Use Email OTP ${DUMMY_EMAIL_OTP} and Mobile OTP ${DUMMY_MOBILE_OTP}.`,
        );
        return;
      }
      navigation.navigate('StudentRegistration', {
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Student Registration"
      subtitle="Verify email and mobile before registration"
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.demoBanner}>
          <Text style={styles.demoTitle}>Demo mode</Text>
          <Text style={styles.demoBody}>
            Dummy Email OTP: {DUMMY_EMAIL_OTP} · Dummy Mobile OTP: {DUMMY_MOBILE_OTP}
          </Text>
        </View>

        <FormField
          label="Email ID"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!otpSent}
        />
        <FormField
          label="Mobile Number"
          required
          keyboardType="phone-pad"
          maxLength={10}
          value={mobile}
          onChangeText={setMobile}
          editable={!otpSent}
        />

        {!otpSent ? (
          <PrimaryButton
            title={loading ? 'Sending…' : 'Send Email & Mobile OTP'}
            onPress={sendOtp}
            disabled={loading}
          />
        ) : (
          <>
            <FormField
              label="Email OTP"
              required
              keyboardType="number-pad"
              maxLength={6}
              value={emailOtp}
              onChangeText={setEmailOtp}
            />
            <FormField
              label="Mobile OTP"
              required
              keyboardType="number-pad"
              maxLength={6}
              value={mobileOtp}
              onChangeText={setMobileOtp}
            />
            <PrimaryButton
              title={loading ? 'Verifying…' : 'Verify & Continue'}
              onPress={verify}
              disabled={loading}
            />
            <View style={styles.gap} />
            <PrimaryButton
              title="Change email / mobile"
              variant="secondary"
              onPress={() => {
                setOtpSent(false);
                setEmailOtp('');
                setMobileOtp('');
              }}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  gap: { height: 10 },
  demoBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5D0A9',
  },
  demoTitle: { fontWeight: '700', color: colors.warning, marginBottom: 4 },
  demoBody: { color: colors.text, fontSize: 13, lineHeight: 18 },
});

import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import {
  DUMMY_COLLEGE_CONTACTS,
  DUMMY_EMAIL_OTP,
  DUMMY_MOBILE_OTP,
} from '../constants/demoData';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import { isOfficialEmailDomain, isValidMobile } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ navigation }: Props) {
  const [email, setEmail] = useState(DUMMY_COLLEGE_CONTACTS.officialEmail);
  const [mobile, setMobile] = useState(DUMMY_COLLEGE_CONTACTS.officialMobile);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const useDummyContacts = () => {
    setEmail(DUMMY_COLLEGE_CONTACTS.officialEmail);
    setMobile(DUMMY_COLLEGE_CONTACTS.officialMobile);
    setOtpSent(false);
    setEmailOtp('');
    setMobileOtp('');
  };

  const sendOtp = async () => {
    if (!isOfficialEmailDomain(email)) {
      Alert.alert(
        'Invalid email',
        'Use an official institutional email domain (not personal Gmail/Yahoo).',
      );
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
      navigation.navigate('EnrollmentForm', {
        officialEmail: email.trim().toLowerCase(),
        officialMobile: mobile.trim(),
        useDummyCollege: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="College Registration"
      subtitle="Verify official email and mobile before registration"
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.demoBanner}>
          <Text style={styles.demoTitle}>Demo mode</Text>
          <Text style={styles.demoBody}>
            Dummy Email OTP: {DUMMY_EMAIL_OTP} · Dummy Mobile OTP: {DUMMY_MOBILE_OTP}
          </Text>
        </View>

        <PrimaryButton
          title="Use dummy college contacts"
          variant="secondary"
          onPress={useDummyContacts}
        />
        <View style={styles.gap} />

        <FormField
          label="Official Email ID"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="admin@college.ac.in"
          editable={!otpSent}
        />
        <FormField
          label="Official Mobile Number"
          required
          keyboardType="phone-pad"
          maxLength={10}
          value={mobile}
          onChangeText={setMobile}
          placeholder="10-digit mobile"
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
              placeholder={`Dummy: ${DUMMY_EMAIL_OTP}`}
            />
            <FormField
              label="Mobile OTP"
              required
              keyboardType="number-pad"
              maxLength={6}
              value={mobileOtp}
              onChangeText={setMobileOtp}
              placeholder={`Dummy: ${DUMMY_MOBILE_OTP}`}
            />
            <Text style={styles.demo}>
              Demo values auto-filled: Email {DUMMY_EMAIL_OTP} · Mobile {DUMMY_MOBILE_OTP}
            </Text>
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
  demo: { color: colors.accent, marginBottom: 12, fontWeight: '600', fontSize: 13 },
});

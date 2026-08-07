import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import { DUMMY_EMAIL_OTP, DUMMY_MOBILE_OTP } from '../constants/demoData';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import { isValidMobile } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'CorporateOtp'>;

export function CorporateOtpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('hr@demo-corporate.in');
  const [mobile, setMobile] = useState('9876509876');
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
      navigation.navigate('CorporateRegistration', {
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Corporate Registration" subtitle="Verify email and mobile, then create profile">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>OTP verification</Text>
          <Text style={styles.bannerBody}>
            Demo OTP — Email: {DUMMY_EMAIL_OTP} · Mobile: {DUMMY_MOBILE_OTP}
          </Text>
        </View>

        <FormField
          label="Official email"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <FormField
          label="Mobile number"
          required
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
        />

        {!otpSent ? (
          <PrimaryButton title={loading ? 'Sending…' : 'Send OTP'} onPress={sendOtp} disabled={loading} />
        ) : (
          <>
            <FormField label="Email OTP" required value={emailOtp} onChangeText={setEmailOtp} />
            <FormField label="Mobile OTP" required value={mobileOtp} onChangeText={setMobileOtp} />
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
  banner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  bannerBody: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});

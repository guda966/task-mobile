import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import { DUMMY_EMAIL_OTP } from '../constants/demoData';
import type { RootStackParamList } from '../navigation/types';
import { accountApi } from '../services/accountApi';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountName, setAccountName] = useState('');

  const sendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter the email linked to your account.');
      return;
    }
    try {
      setLoading(true);
      const { account } = await accountApi.sendPasswordResetOtp(email);
      setAccountName(account.name);
      setStep('reset');
      Alert.alert(
        'OTP sent (demo)',
        `Reset OTP for ${account.email}: ${DUMMY_EMAIL_OTP}`,
      );
    } catch (e) {
      Alert.alert('Unable to send OTP', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!otp.trim()) {
      Alert.alert('OTP required', `Enter the demo OTP (${DUMMY_EMAIL_OTP}).`);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    try {
      setLoading(true);
      await accountApi.resetPassword(email, otp, newPassword);
      Alert.alert('Password updated', 'Sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn') },
      ]);
    } catch (e) {
      Alert.alert('Reset failed', e instanceof Error ? e.message : 'Unable to reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Forgot Password"
      subtitle={
        step === 'email'
          ? 'Enter your account email to receive a reset OTP'
          : `Reset password for ${accountName}`
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <FormField
              label="Email ID"
              required
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
            />
            <PrimaryButton
              title={loading ? 'Sending…' : 'Send reset OTP'}
              onPress={sendOtp}
              disabled={loading}
            />
            <Text style={styles.hint}>
              Works for Student, College Admin, and TASK Admin accounts. Demo OTP is always{' '}
              {DUMMY_EMAIL_OTP}.
            </Text>
          </>
        ) : (
          <>
            <FormField
              label="Email OTP"
              required
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              placeholder={DUMMY_EMAIL_OTP}
            />
            <FormField
              label="New password"
              required
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 8 characters"
            />
            <FormField
              label="Confirm new password"
              required
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
            />
            <PrimaryButton
              title={loading ? 'Updating…' : 'Reset password'}
              onPress={reset}
              disabled={loading}
            />
            <View style={styles.gap} />
            <PrimaryButton
              title="Use a different email"
              variant="secondary"
              onPress={() => {
                setStep('email');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            />
            <Text style={styles.hint}>Demo OTP: {DUMMY_EMAIL_OTP}</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  gap: { height: 10 },
  hint: { marginTop: 16, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});

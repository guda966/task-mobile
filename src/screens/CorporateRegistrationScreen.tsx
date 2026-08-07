import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormField, PrimaryButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CorporateRegistration'>;

const CORPORATE_KEY = 'task.corporateRegistrations.v1';

export function CorporateRegistrationScreen({ navigation, route }: Props) {
  const { email, mobile } = route.params;
  const [companyName, setCompanyName] = useState('Demo Industries Pvt Ltd');
  const [contactName, setContactName] = useState('Priya Sharma');
  const [designation, setDesignation] = useState('HR Manager');
  const [password, setPassword] = useState('Corporate@123');
  const [confirmPassword, setConfirmPassword] = useState('Corporate@123');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!companyName.trim() || !contactName.trim() || !designation.trim()) {
      Alert.alert('Missing details', 'Fill company name, contact person, and designation.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }

    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(CORPORATE_KEY);
      const items = raw ? (JSON.parse(raw) as unknown[]) : [];
      const record = {
        id: `corp_${Date.now()}`,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        designation: designation.trim(),
        email,
        mobile,
        passwordHash: password,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CORPORATE_KEY, JSON.stringify([record, ...items]));
      Alert.alert(
        'Registration submitted',
        'Your corporate account request is saved for TASK Admin review.',
        [{ text: 'Sign In', onPress: () => navigation.navigate('SignIn') }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Corporate Profile" subtitle="Complete company details for TASK partnership">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Company name" required value={companyName} onChangeText={setCompanyName} />
        <FormField label="Contact person" required value={contactName} onChangeText={setContactName} />
        <FormField label="Designation" required value={designation} onChangeText={setDesignation} />
        <FormField label="Email" value={email} editable={false} />
        <FormField label="Mobile" value={mobile} editable={false} />
        <FormField
          label="Password"
          required
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <FormField
          label="Confirm password"
          required
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <PrimaryButton
          title={loading ? 'Submitting…' : 'Submit registration'}
          onPress={submit}
          disabled={loading}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CheckboxRow,
  DropdownField,
  FormField,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { createDummyCollegeDraft } from '../constants/demoData';
import {
  AFFILIATED_UNIVERSITIES,
  COLLEGE_STATUSES,
  COLLEGE_TYPES,
  DISTRICTS,
  INSTITUTION_TYPES,
  REGISTRATION_KINDS,
} from '../constants/lookups';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import type { EnrollmentDraft } from '../types/enrollment';
import { scrollToTop } from '../utils/scrollToTop';
import { getFeeForDraft, validateEnrollmentDraft } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'EnrollmentForm'>;

const emptyDraft = (email: string, mobile: string): EnrollmentDraft => ({
  registrationKind: 'NEW',
  institutionName: '',
  institutionType: '',
  collegeStatus: '',
  collegeType: '',
  affiliationNumber: '',
  affiliatedUniversity: '',
  district: '',
  pinCode: '',
  address: '',
  societyName: '',
  contactPersonName: '',
  contactDesignation: '',
  officialEmail: email,
  officialMobile: mobile,
  password: '',
  confirmPassword: '',
  feeAcknowledged: false,
  termsAccepted: false,
  declarationAccepted: false,
});

export function EnrollmentFormScreen({ navigation, route }: Props) {
  const { setUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EnrollmentDraft>(() =>
    route.params.useDummyCollege
      ? createDummyCollegeDraft(route.params.officialEmail, route.params.officialMobile)
      : emptyDraft(route.params.officialEmail, route.params.officialMobile),
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateEnrollmentDraft>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    scrollToTop(scrollRef);
  }, [step]);

  const fee = useMemo(() => getFeeForDraft(draft), [draft]);

  const update = <K extends keyof EnrollmentDraft>(key: K, value: EnrollmentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = () => {
    const all = validateEnrollmentDraft(draft);
    const stepFields: (keyof EnrollmentDraft)[][] = [
      [
        'registrationKind',
        'institutionName',
        'institutionType',
        'collegeStatus',
        'collegeType',
        'affiliationNumber',
        'affiliatedUniversity',
        'district',
        'pinCode',
        'address',
      ],
      ['contactPersonName', 'contactDesignation', 'officialEmail', 'officialMobile'],
      ['password', 'confirmPassword', 'feeAcknowledged', 'termsAccepted', 'declarationAccepted'],
    ];
    const picked: typeof all = {};
    for (const key of stepFields[step]) {
      if (all[key]) picked[key] = all[key];
    }
    setErrors(picked);
    return Object.keys(picked).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 2));
  };

  const submit = async () => {
    const all = validateEnrollmentDraft(draft);
    setErrors(all);
    if (Object.keys(all).length) {
      Alert.alert('Incomplete form', 'Please fix the highlighted fields.');
      return;
    }
    try {
      setLoading(true);
      const record = await mockApi.submitEnrollment(draft);
      setUser({
        role: 'college_admin',
        email: record.officialEmail,
        name: record.contactPersonName,
        enrollmentId: record.id,
      });
      Alert.alert(
        'College registration submitted',
        'A pending registration record was created. TASK Admin has been notified for review.',
      );
      navigation.reset({ index: 0, routes: [{ name: 'CollegeHome' }] });
    } catch (e) {
      Alert.alert('Submission failed', e instanceof Error ? e.message : 'Unable to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="College Registration"
      subtitle={`Step ${step + 1} of 3 — College details · Contact · Login & fee`}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <PrimaryButton
              title="Load dummy college data"
              variant="secondary"
              onPress={() =>
                setDraft(
                  createDummyCollegeDraft(
                    route.params.officialEmail,
                    route.params.officialMobile,
                  ),
                )
              }
            />
            <View style={styles.gap} />
            <DropdownField
              label="Registration Type"
              required
              placeholder="Select registration type"
              options={REGISTRATION_KINDS.map((k) => ({ value: k.value, label: k.label }))}
              value={draft.registrationKind}
              onChange={(v) =>
                update('registrationKind', v as EnrollmentDraft['registrationKind'])
              }
              error={errors.registrationKind}
            />
            <FormField
              label="College / Institution Name"
              required
              value={draft.institutionName}
              onChangeText={(t) => update('institutionName', t)}
              error={errors.institutionName}
              placeholder="Full legal name of the college"
            />
            <FormField
              label="Educational Society / Trust (if any)"
              value={draft.societyName}
              onChangeText={(t) => update('societyName', t)}
              placeholder="Optional — each college must register separately"
            />
            <DropdownField
              label="Type of Institution"
              required
              placeholder="Select type of institution"
              options={INSTITUTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={draft.institutionType}
              onChange={(v) => update('institutionType', v as EnrollmentDraft['institutionType'])}
              error={errors.institutionType}
            />
            <DropdownField
              label="College Status"
              required
              placeholder="Select college status"
              options={COLLEGE_STATUSES.map((t) => ({ value: t.value, label: t.label }))}
              value={draft.collegeStatus}
              onChange={(v) => update('collegeStatus', v as EnrollmentDraft['collegeStatus'])}
              error={errors.collegeStatus}
            />
            <DropdownField
              label="College Type"
              required
              placeholder="Select college type"
              options={COLLEGE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={draft.collegeType}
              onChange={(v) => update('collegeType', v as EnrollmentDraft['collegeType'])}
              error={errors.collegeType}
            />
            <FormField
              label="Affiliation Number / College Code"
              required
              autoCapitalize="characters"
              value={draft.affiliationNumber}
              onChangeText={(t) => update('affiliationNumber', t)}
              error={errors.affiliationNumber}
              placeholder="Unique affiliation / college code"
            />
            <DropdownField
              label="Affiliated University"
              required
              placeholder="Select affiliated university"
              options={AFFILIATED_UNIVERSITIES.map((u) => ({ value: u, label: u }))}
              value={draft.affiliatedUniversity}
              onChange={(v) => update('affiliatedUniversity', v)}
              error={errors.affiliatedUniversity}
            />
            <DropdownField
              label="District"
              required
              placeholder="Select district"
              options={DISTRICTS.map((d) => ({ value: d, label: d }))}
              value={draft.district}
              onChange={(v) => update('district', v)}
              error={errors.district}
            />
            <FormField
              label="PIN Code"
              required
              keyboardType="number-pad"
              maxLength={6}
              value={draft.pinCode}
              onChangeText={(t) => update('pinCode', t)}
              error={errors.pinCode}
              placeholder="6-digit PIN"
            />
            <FormField
              label="College Address"
              required
              multiline
              value={draft.address}
              onChangeText={(t) => update('address', t)}
              error={errors.address}
              placeholder="Full postal address of the college"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.section}>College Admin / Contact Person</Text>
            <FormField
              label="Contact Person Name"
              required
              value={draft.contactPersonName}
              onChangeText={(t) => update('contactPersonName', t)}
              error={errors.contactPersonName}
              placeholder="Principal / Management / TPO"
            />
            <FormField
              label="Designation"
              required
              value={draft.contactDesignation}
              onChangeText={(t) => update('contactDesignation', t)}
              error={errors.contactDesignation}
              placeholder="e.g. Principal, Registrar, TPO"
            />
            <FormField
              label="Official Email ID"
              required
              value={draft.officialEmail}
              editable={false}
              error={errors.officialEmail}
            />
            <FormField
              label="Official Mobile Number"
              required
              value={draft.officialMobile}
              editable={false}
              error={errors.officialMobile}
            />
            <Text style={styles.note}>
              Official email and mobile were verified via OTP. All TASK communication will be
              sent only to these contacts.
            </Text>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>College Registration Fee</Text>
              <Text style={styles.feeValue}>
                {fee > 0 ? `₹ ${fee.toLocaleString('en-IN')}` : 'Select type & registration kind'}
              </Text>
              <Text style={styles.feeHint}>
                Fee depends on institution type and new vs renewal (placeholder TASK rates —
                confirm before production). Registration payments are final and non-refundable.
              </Text>
            </View>

            <CheckboxRow
              checked={draft.feeAcknowledged}
              onToggle={() => update('feeAcknowledged', !draft.feeAcknowledged)}
              label="I acknowledge the applicable college registration / renewal fee."
              error={errors.feeAcknowledged}
            />

            <Text style={styles.section}>Login Details</Text>
            <FormField
              label="Password"
              required
              secureTextEntry
              value={draft.password}
              onChangeText={(t) => update('password', t)}
              error={errors.password}
              placeholder="Min. 8 characters"
            />
            <FormField
              label="Confirm Password"
              required
              secureTextEntry
              value={draft.confirmPassword}
              onChangeText={(t) => update('confirmPassword', t)}
              error={errors.confirmPassword}
            />

            <CheckboxRow
              checked={draft.termsAccepted}
              onToggle={() => update('termsAccepted', !draft.termsAccepted)}
              label="I agree to the TASK college registration terms and conditions."
              error={errors.termsAccepted}
            />
            <CheckboxRow
              checked={draft.declarationAccepted}
              onToggle={() => update('declarationAccepted', !draft.declarationAccepted)}
              label="I declare that all college details are true to the best of my knowledge. If found incorrect, the college is liable to action by TASK."
              error={errors.declarationAccepted}
            />

            <View style={styles.terms}>
              <Text style={styles.termsTitle}>Terms And Conditions</Text>
              <Text style={styles.termsItem}>
                • College registration is done through this form and is subject to TASK Admin
                approval.
              </Text>
              <Text style={styles.termsItem}>
                • Colleges under a single educational society must register each college as an
                individual entity with the correct affiliation / college code.
              </Text>
              <Text style={styles.termsItem}>
                • TASK offerings will be extended only to registered colleges and their
                registered students.
              </Text>
              <Text style={styles.termsItem}>
                • Students from colleges not registered with TASK will not be accepted for
                individual registration.
              </Text>
              <Text style={styles.termsItem}>
                • Refund Policy: All payments towards college registration fee are final and
                will not be refunded.
              </Text>
            </View>
          </>
        )}

        <View style={styles.actions}>
          {step > 0 ? (
            <PrimaryButton title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          {step < 2 ? (
            <PrimaryButton title="Continue" onPress={next} />
          ) : (
            <PrimaryButton
              title={loading ? 'Submitting…' : 'Submit College Registration'}
              onPress={submit}
              disabled={loading}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  section: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    marginTop: 4,
    fontSize: 15,
  },
  note: { color: colors.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  feeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDCDC',
  },
  feeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  feeValue: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  feeHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  terms: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsTitle: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  termsItem: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  actions: { gap: 10, marginTop: 8 },
  gap: { height: 10 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CheckboxRow,
  DropdownField,
  FormField,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { AFFILIATED_UNIVERSITIES, DISTRICTS, INSTITUTION_TYPES } from '../constants/lookups';
import { BRANCHES, GRADUATION_YEARS } from '../constants/courses';
import { DUMMY_STUDENT, STUDENT_CATEGORIES } from '../constants/student';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import { colors } from '../theme/colors';
import type { CollegeEnrollment } from '../types/enrollment';
import type { StudentDraft } from '../types/student';
import { studentFeeLabel, validateStudentDraft } from '../utils/studentValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentRegistration'>;

export function StudentRegistrationScreen({ navigation, route }: Props) {
  const { setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [colleges, setColleges] = useState<CollegeEnrollment[]>([]);
  const [errors, setErrors] = useState<ReturnType<typeof validateStudentDraft>>({});
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<StudentDraft>({
    firstName: DUMMY_STUDENT.firstName,
    lastName: DUMMY_STUDENT.lastName,
    mobile: route.params.mobile,
    email: route.params.email,
    aadhaarNumber: '',
    category: 'GENERAL',
    casteCertificateProvided: false,
    institutionType: 'DEGREE_PG',
    affiliatedUniversity: 'Osmania University',
    district: 'Hyderabad',
    enrollmentId: '',
    collegeRollNo: '21QU1A0501',
    yearOfGraduation: '2027',
    branch: 'CSE',
    password: DUMMY_STUDENT.password,
    confirmPassword: DUMMY_STUDENT.password,
    feeAcknowledged: true,
    termsAccepted: true,
    declarationAccepted: true,
  });

  useEffect(() => {
    (async () => {
      const list = await studentApi.listApprovedColleges();
      setColleges(list);
      if (list.length && !draft.enrollmentId) {
        setDraft((prev) => ({
          ...prev,
          enrollmentId: list[0].id,
          institutionType: list[0].institutionType,
          affiliatedUniversity: list[0].affiliatedUniversity,
          district: list[0].district,
        }));
      }
    })();
  }, []);

  const fee = useMemo(
    () => studentFeeLabel(draft.institutionType, draft.category),
    [draft.institutionType, draft.category],
  );

  const update = <K extends keyof StudentDraft>(key: K, value: StudentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const onCollegeChange = (enrollmentId: string) => {
    const college = colleges.find((c) => c.id === enrollmentId);
    setDraft((prev) => ({
      ...prev,
      enrollmentId,
      institutionType: college?.institutionType ?? prev.institutionType,
      affiliatedUniversity: college?.affiliatedUniversity ?? prev.affiliatedUniversity,
      district: college?.district ?? prev.district,
    }));
  };

  const validateStep = () => {
    const all = validateStudentDraft(draft);
    const fields: (keyof StudentDraft)[][] = [
      ['firstName', 'lastName', 'mobile', 'email', 'aadhaarNumber', 'category', 'casteCertificateProvided'],
      [
        'institutionType',
        'affiliatedUniversity',
        'district',
        'enrollmentId',
        'collegeRollNo',
        'yearOfGraduation',
        'branch',
      ],
      ['password', 'confirmPassword', 'feeAcknowledged', 'termsAccepted', 'declarationAccepted'],
    ];
    const picked: typeof all = {};
    for (const key of fields[step]) {
      if (all[key]) picked[key] = all[key];
    }
    setErrors(picked);
    return Object.keys(picked).length === 0;
  };

  const submit = async () => {
    const all = validateStudentDraft(draft);
    setErrors(all);
    if (Object.keys(all).length) {
      Alert.alert('Incomplete form', 'Please fix the highlighted fields.');
      return;
    }
    try {
      setLoading(true);
      const record = await studentApi.submitStudent(draft);
      setUser({
        role: 'student',
        email: record.email,
        name: `${record.firstName} ${record.lastName}`,
        studentId: record.id,
        enrollmentId: record.enrollmentId,
      });
      Alert.alert(
        'Registration successful',
        `Welcome ${record.firstName}. Your TASK user ID is ${record.username}.`,
      );
      navigation.reset({ index: 0, routes: [{ name: 'StudentHome' }] });
    } catch (e) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Student Registration"
      subtitle={`Step ${step + 1} of 3 — Personal · Academic · Login & fee`}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={styles.section}>Personal Details</Text>
            <FormField
              label="First Name"
              required
              value={draft.firstName}
              onChangeText={(t) => update('firstName', t)}
              error={errors.firstName}
            />
            <FormField
              label="Last Name"
              required
              value={draft.lastName}
              onChangeText={(t) => update('lastName', t)}
              error={errors.lastName}
            />
            <FormField label="Mobile Number" required value={draft.mobile} editable={false} />
            <FormField label="Email ID" required value={draft.email} editable={false} />
            <FormField
              label="Aadhaar Number"
              keyboardType="number-pad"
              maxLength={12}
              value={draft.aadhaarNumber}
              onChangeText={(t) => update('aadhaarNumber', t)}
              error={errors.aadhaarNumber}
              placeholder="Optional 12-digit Aadhaar"
            />
            <DropdownField
              label="Select Category"
              required
              placeholder="Select Category"
              value={draft.category}
              onChange={(v) => update('category', v as StudentDraft['category'])}
              options={STUDENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              error={errors.category}
            />
            <Text style={styles.hint}>
              Please provide a valid caste certificate to get 50% fee concession (ST / SC).
            </Text>
            {(draft.category === 'ST' || draft.category === 'SC') && (
              <CheckboxRow
                checked={draft.casteCertificateProvided}
                onToggle={() =>
                  update('casteCertificateProvided', !draft.casteCertificateProvided)
                }
                label="I have uploaded a valid caste certificate (PDF / Image) — demo confirmation"
                error={errors.casteCertificateProvided}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.section}>Academic Details</Text>
            {colleges.length === 0 ? (
              <Text style={styles.warn}>
                No TASK-approved colleges found. College must register and get approved first.
              </Text>
            ) : null}
            <DropdownField
              label="College"
              required
              placeholder="Select College"
              value={draft.enrollmentId}
              onChange={onCollegeChange}
              options={colleges.map((c) => ({
                value: c.id,
                label: `${c.institutionName} (${c.affiliationNumber})`,
              }))}
              error={errors.enrollmentId}
            />
            <DropdownField
              label="Type of institution"
              required
              placeholder="Select"
              value={draft.institutionType}
              onChange={(v) => update('institutionType', v as StudentDraft['institutionType'])}
              options={INSTITUTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              error={errors.institutionType}
            />
            <DropdownField
              label="Affiliated University"
              required
              placeholder="Select"
              value={draft.affiliatedUniversity}
              onChange={(v) => update('affiliatedUniversity', v)}
              options={AFFILIATED_UNIVERSITIES.map((u) => ({ value: u, label: u }))}
              error={errors.affiliatedUniversity}
            />
            <DropdownField
              label="District"
              required
              placeholder="Select"
              value={draft.district}
              onChange={(v) => update('district', v)}
              options={DISTRICTS.map((d) => ({ value: d, label: d }))}
              error={errors.district}
            />
            <FormField
              label="College Roll No"
              required
              value={draft.collegeRollNo}
              onChangeText={(t) => update('collegeRollNo', t)}
              error={errors.collegeRollNo}
            />
            <DropdownField
              label="Year of Graduation"
              required
              placeholder="Select"
              value={draft.yearOfGraduation}
              onChange={(v) => update('yearOfGraduation', v)}
              options={GRADUATION_YEARS.map((y) => ({ value: y, label: y }))}
              error={errors.yearOfGraduation}
            />
            <DropdownField
              label="Branch / Specialization"
              required
              placeholder="Select Branch / Specialization"
              value={draft.branch}
              onChange={(v) => update('branch', v)}
              options={BRANCHES.map((b) => ({ value: b, label: b }))}
              error={errors.branch}
            />
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>Registration Fee</Text>
              <Text style={styles.feeValue}>
                {fee > 0 ? `₹ ${fee.toLocaleString('en-IN')}` : '—'}
              </Text>
              <Text style={styles.feeHint}>
                SC / ST get 50% concession when caste certificate is confirmed. Payments are
                final and non-refundable.
              </Text>
            </View>
            <CheckboxRow
              checked={draft.feeAcknowledged}
              onToggle={() => update('feeAcknowledged', !draft.feeAcknowledged)}
              label="I acknowledge the student registration fee."
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
              label="I agree to the TASK student registration terms and conditions."
              error={errors.termsAccepted}
            />
            <CheckboxRow
              checked={draft.declarationAccepted}
              onToggle={() => update('declarationAccepted', !draft.declarationAccepted)}
              label="I declare that all details are true. If found incorrect, I am liable to action by TASK."
              error={errors.declarationAccepted}
            />
            <View style={styles.terms}>
              <Text style={styles.termsTitle}>Terms And Conditions</Text>
              <Text style={styles.termsItem}>
                • Individual applications from students of colleges not registered with TASK
                will not be accepted.
              </Text>
              <Text style={styles.termsItem}>
                • Contact details will be used for TASK communication and may be shared with
                hiring organizations based on eligibility.
              </Text>
              <Text style={styles.termsItem}>
                • Refund Policy: Student registration fee payments are final and will not be
                refunded.
              </Text>
            </View>
          </>
        )}

        <View style={styles.actions}>
          {step > 0 ? (
            <PrimaryButton title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          {step < 2 ? (
            <PrimaryButton
              title="Continue"
              onPress={() => {
                if (validateStep()) setStep((s) => s + 1);
              }}
            />
          ) : (
            <PrimaryButton
              title={loading ? 'Submitting…' : 'Submit'}
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
  section: { fontWeight: '700', color: colors.text, marginBottom: 10, fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 18 },
  warn: { color: colors.danger, marginBottom: 12, lineHeight: 18 },
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
});

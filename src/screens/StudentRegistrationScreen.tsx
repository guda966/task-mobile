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
import {
  DUMMY_STUDENT,
  EDUCATION_BOARDS,
  PASSING_YEARS,
  STUDENT_CATEGORIES,
} from '../constants/student';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import { colors } from '../theme/colors';
import type { CollegeEnrollment } from '../types/enrollment';
import type { StudentDraft } from '../types/student';
import { studentFeeLabel, validateStudentDraft } from '../utils/studentValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentRegistration'>;

const STEP_LABELS = ['Personal', 'College', '10th & 12th', 'Login & fee'];

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
    tenthBoard: 'BSE Telangana',
    tenthSchoolName: 'Demo High School, Hyderabad',
    tenthYearOfPassing: '2019',
    tenthPercentage: '92.4',
    tenthHallTicketNo: 'TS19X1001',
    twelfthBoard: 'TSBIE / Telangana Board',
    twelfthSchoolName: 'Demo Junior College, Hyderabad',
    twelfthYearOfPassing: '2021',
    twelfthPercentage: '88.6',
    twelfthHallTicketNo: 'TS21I2001',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      [
        'tenthBoard',
        'tenthSchoolName',
        'tenthYearOfPassing',
        'tenthPercentage',
        'tenthHallTicketNo',
        'twelfthBoard',
        'twelfthSchoolName',
        'twelfthYearOfPassing',
        'twelfthPercentage',
        'twelfthHallTicketNo',
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
      showLogo={false}
      subtitle={`Step ${step + 1} of 4 — ${STEP_LABELS.join(' · ')}`}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepper}>
          {STEP_LABELS.map((label, index) => (
            <View
              key={label}
              style={[styles.stepChip, index === step && styles.stepChipActive]}
            >
              <Text style={[styles.stepChipText, index === step && styles.stepChipTextActive]}>
                {index + 1}. {label}
              </Text>
            </View>
          ))}
        </View>

        {step === 0 && (
          <>
            <Text style={styles.section}>Personal details</Text>
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
              ST / SC students get 50% fee concession when caste certificate is confirmed.
            </Text>
            {(draft.category === 'ST' || draft.category === 'SC') && (
              <CheckboxRow
                checked={draft.casteCertificateProvided}
                onToggle={() =>
                  update('casteCertificateProvided', !draft.casteCertificateProvided)
                }
                label="I confirm a valid caste certificate is available (demo)"
                error={errors.casteCertificateProvided}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.section}>College details</Text>
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
            <Text style={styles.section}>Class 10 (SSC) details</Text>
            <DropdownField
              label="Board"
              required
              placeholder="Select board"
              value={draft.tenthBoard}
              onChange={(v) => update('tenthBoard', v)}
              options={EDUCATION_BOARDS.map((b) => ({ value: b, label: b }))}
              error={errors.tenthBoard}
            />
            <FormField
              label="School name"
              required
              value={draft.tenthSchoolName}
              onChangeText={(t) => update('tenthSchoolName', t)}
              error={errors.tenthSchoolName}
            />
            <DropdownField
              label="Year of passing"
              required
              placeholder="Select year"
              value={draft.tenthYearOfPassing}
              onChange={(v) => update('tenthYearOfPassing', v)}
              options={PASSING_YEARS.map((y) => ({ value: y, label: y }))}
              error={errors.tenthYearOfPassing}
            />
            <FormField
              label="Percentage / CGPA"
              required
              keyboardType="decimal-pad"
              value={draft.tenthPercentage}
              onChangeText={(t) => update('tenthPercentage', t)}
              error={errors.tenthPercentage}
              placeholder="e.g. 92.4"
            />
            <FormField
              label="Hall ticket / roll no"
              required
              value={draft.tenthHallTicketNo}
              onChangeText={(t) => update('tenthHallTicketNo', t)}
              error={errors.tenthHallTicketNo}
            />

            <Text style={[styles.section, styles.sectionGap]}>Class 12 (Intermediate) details</Text>
            <DropdownField
              label="Board"
              required
              placeholder="Select board"
              value={draft.twelfthBoard}
              onChange={(v) => update('twelfthBoard', v)}
              options={EDUCATION_BOARDS.map((b) => ({ value: b, label: b }))}
              error={errors.twelfthBoard}
            />
            <FormField
              label="College / school name"
              required
              value={draft.twelfthSchoolName}
              onChangeText={(t) => update('twelfthSchoolName', t)}
              error={errors.twelfthSchoolName}
            />
            <DropdownField
              label="Year of passing"
              required
              placeholder="Select year"
              value={draft.twelfthYearOfPassing}
              onChange={(v) => update('twelfthYearOfPassing', v)}
              options={PASSING_YEARS.map((y) => ({ value: y, label: y }))}
              error={errors.twelfthYearOfPassing}
            />
            <FormField
              label="Percentage / CGPA"
              required
              keyboardType="decimal-pad"
              value={draft.twelfthPercentage}
              onChangeText={(t) => update('twelfthPercentage', t)}
              error={errors.twelfthPercentage}
              placeholder="e.g. 88.6"
            />
            <FormField
              label="Hall ticket / roll no"
              required
              value={draft.twelfthHallTicketNo}
              onChangeText={(t) => update('twelfthHallTicketNo', t)}
              error={errors.twelfthHallTicketNo}
            />
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>Registration Fee</Text>
              <Text style={styles.feeValue}>
                {fee > 0 ? `₹ ${fee.toLocaleString('en-IN')}` : '—'}
              </Text>
              <Text style={styles.feeHint}>
                SC / ST get 50% concession when caste certificate is confirmed. Payments are final
                and non-refundable.
              </Text>
            </View>
            <CheckboxRow
              checked={draft.feeAcknowledged}
              onToggle={() => update('feeAcknowledged', !draft.feeAcknowledged)}
              label="I acknowledge the student registration fee."
              error={errors.feeAcknowledged}
            />
            <Text style={styles.section}>Login details</Text>
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
              label="I declare that all details are true."
              error={errors.declarationAccepted}
            />
            <View style={styles.terms}>
              <Text style={styles.termsTitle}>Terms</Text>
              <Text style={styles.termsItem}>
                • Students must belong to a college registered and approved with TASK.
              </Text>
              <Text style={styles.termsItem}>
                • Contact details may be used for TASK programmes and eligible hiring outreach.
              </Text>
              <Text style={styles.termsItem}>
                • Student registration fee payments are final and will not be refunded.
              </Text>
            </View>
          </>
        )}

        <View style={styles.actions}>
          {step > 0 ? (
            <PrimaryButton title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          {step < 3 ? (
            <PrimaryButton
              title="Continue"
              onPress={() => {
                if (validateStep()) setStep((s) => s + 1);
              }}
            />
          ) : (
            <PrimaryButton
              title={loading ? 'Submitting…' : 'Submit registration'}
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
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  stepChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  stepChipTextActive: { color: colors.white },
  section: { fontWeight: '700', color: colors.text, marginBottom: 10, fontSize: 15 },
  sectionGap: { marginTop: 16 },
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

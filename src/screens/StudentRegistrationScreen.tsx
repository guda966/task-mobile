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
import { AFFILIATED_UNIVERSITIES, DISTRICTS, INSTITUTION_TYPES, RC_MEMBERSHIP_FEE, RC_MEMBERSHIP_MONTHS, REGIONAL_CENTERS, regionalCenterLabel } from '../constants/lookups';
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
import { scrollToTop } from '../utils/scrollToTop';
import { studentFeeLabel, validateStudentDraft } from '../utils/studentValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentRegistration'>;

const STEP_LABELS = [
  'Personal',
  'College',
  '10th & 12th',
  'RC (optional)',
  'College fee & login',
];

const STEP_HINTS = [
  'Your personal details',
  'Your TASK-approved college',
  '10th and 12th marks',
  'Optional — Regional Centre membership (separate from college fee)',
  'Required — TASK college registration fee, then create your login',
];

export function StudentRegistrationScreen({ navigation, route }: Props) {
  const { setUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
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
    institutionType: '',
    affiliatedUniversity: '',
    district: '',
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
    joinRegionalCenter: true,
    regionalCenterId: 'rc-hyd-masabtank',
    rcFeeAcknowledged: true,
  });

  useEffect(() => {
    (async () => {
      const list = await studentApi.listApprovedColleges();
      setColleges(list);
      // Prefill cascade with the primary demo college for quicker UAT.
      const demo =
        list.find((c) => c.affiliationNumber === 'DEMO-AFF-2142') ?? list[0];
      if (demo) {
        setDraft((prev) =>
          prev.enrollmentId
            ? prev
            : {
                ...prev,
                institutionType: demo.institutionType,
                affiliatedUniversity: demo.affiliatedUniversity,
                district: demo.district,
                enrollmentId: demo.id,
              },
        );
      }
    })();
  }, []);

  useEffect(() => {
    scrollToTop(scrollRef);
  }, [step]);

  const fee = useMemo(
    () => studentFeeLabel(draft.institutionType, draft.category),
    [draft.institutionType, draft.category],
  );

  const institutionTypeOptions = useMemo(
    () => INSTITUTION_TYPES.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const universityOptions = useMemo(() => {
    if (!draft.institutionType) return [];
    const fromColleges = [
      ...new Set(
        colleges
          .filter((c) => c.institutionType === draft.institutionType)
          .map((c) => c.affiliatedUniversity),
      ),
    ];
    // Prefer universities that have approved colleges; fall back to full lookup if none match yet.
    const names = (fromColleges.length ? fromColleges : [...AFFILIATED_UNIVERSITIES]).sort((a, b) =>
      a.localeCompare(b),
    );
    return names.map((u) => ({ value: u, label: u }));
  }, [colleges, draft.institutionType]);

  const districtOptions = useMemo(() => {
    if (!draft.institutionType || !draft.affiliatedUniversity) return [];
    const fromColleges = [
      ...new Set(
        colleges
          .filter(
            (c) =>
              c.institutionType === draft.institutionType &&
              c.affiliatedUniversity === draft.affiliatedUniversity,
          )
          .map((c) => c.district),
      ),
    ];
    const names = (fromColleges.length ? fromColleges : [...DISTRICTS]).sort((a, b) =>
      a.localeCompare(b),
    );
    return names.map((d) => ({ value: d, label: d }));
  }, [colleges, draft.institutionType, draft.affiliatedUniversity]);

  const matchingColleges = useMemo(() => {
    if (!draft.institutionType || !draft.affiliatedUniversity || !draft.district) {
      return [];
    }
    return colleges.filter(
      (c) =>
        c.institutionType === draft.institutionType &&
        c.affiliatedUniversity === draft.affiliatedUniversity &&
        c.district === draft.district,
    );
  }, [colleges, draft.institutionType, draft.affiliatedUniversity, draft.district]);

  const update = <K extends keyof StudentDraft>(key: K, value: StudentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const onInstitutionTypeChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      institutionType: value as StudentDraft['institutionType'],
      affiliatedUniversity: '',
      district: '',
      enrollmentId: '',
    }));
  };

  const onUniversityChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      affiliatedUniversity: value,
      district: '',
      enrollmentId: '',
    }));
  };

  const onDistrictChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      district: value,
      enrollmentId: '',
    }));
  };

  const onCollegeChange = (enrollmentId: string) => {
    setDraft((prev) => ({ ...prev, enrollmentId }));
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
      ['regionalCenterId', 'rcFeeAcknowledged'],
      ['password', 'confirmPassword', 'feeAcknowledged', 'termsAccepted', 'declarationAccepted'],
    ];
    const picked: typeof all = {};
    for (const key of fields[step]) {
      // Only enforce RC field errors when the student chose to join.
      if (step === 3 && !draft.joinRegionalCenter) continue;
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
    <Screen showLogo={false} subtitle={`Step ${step + 1} of ${STEP_LABELS.length} · ${STEP_HINTS[step]}`}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
            <Text style={styles.hint}>
              Select institution type, university, and district first. Only matching
              TASK-approved colleges will appear.
            </Text>
            {colleges.length === 0 ? (
              <Text style={styles.warn}>
                No TASK-approved colleges found. College must register and get approved first.
              </Text>
            ) : null}

            <DropdownField
              label="Type of institution"
              required
              placeholder="Select type"
              value={draft.institutionType}
              onChange={onInstitutionTypeChange}
              options={institutionTypeOptions}
              error={errors.institutionType}
            />
            <DropdownField
              label="Affiliated University"
              required
              placeholder={
                draft.institutionType
                  ? 'Select university'
                  : 'Select institution type first'
              }
              value={draft.affiliatedUniversity}
              onChange={onUniversityChange}
              options={universityOptions}
              disabled={!draft.institutionType}
              error={errors.affiliatedUniversity}
            />
            <DropdownField
              label="District"
              required
              placeholder={
                draft.affiliatedUniversity ? 'Select district' : 'Select university first'
              }
              value={draft.district}
              onChange={onDistrictChange}
              options={districtOptions}
              disabled={!draft.affiliatedUniversity}
              searchable={districtOptions.length > 12}
              error={errors.district}
            />
            <DropdownField
              label="College"
              required
              placeholder={
                !draft.district
                  ? 'Select district first'
                  : matchingColleges.length === 0
                    ? 'No colleges for this filter'
                    : 'Search / select college'
              }
              value={draft.enrollmentId}
              onChange={onCollegeChange}
              options={matchingColleges.map((c) => ({
                value: c.id,
                label: `${c.institutionName} (${c.affiliationNumber})`,
              }))}
              disabled={!draft.district || matchingColleges.length === 0}
              searchable
              searchPlaceholder="Type college name…"
              error={errors.enrollmentId}
            />
            {draft.district && matchingColleges.length > 0 ? (
              <Text style={styles.hint}>
                {matchingColleges.length} college(s) match your filters.
              </Text>
            ) : null}

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
            <Text style={styles.section}>Step 4 — Regional Centre (optional)</Text>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Two different things</Text>
              <Text style={styles.calloutText}>
                • This step is only for joining a local TASK Regional Centre (RC).{'\n'}
                • Your college TASK registration fee comes in the next step — it is separate.
                {'\n'}
                • You can skip RC now and join later from Trainings → RC.
              </Text>
            </View>
            <Text style={styles.rcIntro}>
              RC membership gives access to local RC courses and services at 16 centres across
              Telangana. Fee: ₹{RC_MEMBERSHIP_FEE} for {RC_MEMBERSHIP_MONTHS} months (non-refundable).
            </Text>
            <CheckboxRow
              checked={draft.joinRegionalCenter}
              onToggle={() => {
                const next = !draft.joinRegionalCenter;
                update('joinRegionalCenter', next);
                if (!next) {
                  update('regionalCenterId', '');
                  update('rcFeeAcknowledged', false);
                }
              }}
              label={`Yes — join an RC now (₹${RC_MEMBERSHIP_FEE} membership)`}
            />
            <CheckboxRow
              checked={!draft.joinRegionalCenter}
              onToggle={() => {
                update('joinRegionalCenter', false);
                update('regionalCenterId', '');
                update('rcFeeAcknowledged', false);
              }}
              label="No — skip RC for now (college registration continues next)"
            />
            {draft.joinRegionalCenter ? (
              <>
                <DropdownField
                  label="Select your nearest Regional Centre"
                  required
                  value={draft.regionalCenterId}
                  onChange={(v) => update('regionalCenterId', v)}
                  options={REGIONAL_CENTERS.map((c) => ({
                    value: c.id,
                    label: regionalCenterLabel(c),
                  }))}
                  placeholder="Choose Regional Centre"
                  error={errors.regionalCenterId}
                />
                <View style={styles.feeBoxAlt}>
                  <Text style={styles.feeLabel}>RC membership only (not college fee)</Text>
                  <Text style={styles.feeValue}>₹ {RC_MEMBERSHIP_FEE}</Text>
                  <Text style={styles.feeHint}>
                    Valid {RC_MEMBERSHIP_MONTHS} months from payment. Required only if you join RC
                    courses/services. College registration fee is still due in Step 5.
                  </Text>
                </View>
                <CheckboxRow
                  checked={draft.rcFeeAcknowledged}
                  onToggle={() => update('rcFeeAcknowledged', !draft.rcFeeAcknowledged)}
                  label={`I understand this ₹${RC_MEMBERSHIP_FEE} is for Regional Centre membership, not the college TASK fee.`}
                  error={errors.rcFeeAcknowledged}
                />
              </>
            ) : (
              <Text style={styles.hint}>
                You chose to skip RC. Next you will pay only the college TASK registration fee and
                create your login.
              </Text>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.section}>Step 5 — College TASK fee & login</Text>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Required for student registration</Text>
              <Text style={styles.calloutText}>
                This is your college TASK registration fee (based on institution type and category).
                It is not the Regional Centre membership fee from the previous step.
              </Text>
            </View>

            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>College TASK registration fee</Text>
              <Text style={styles.feeValue}>
                {fee > 0 ? `₹ ${fee.toLocaleString('en-IN')}` : '—'}
              </Text>
              <Text style={styles.feeHint}>
                SC / ST get 50% concession when caste certificate is confirmed. Payments are final
                and non-refundable.
              </Text>
            </View>

            {draft.joinRegionalCenter ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Your fee summary</Text>
                <Text style={styles.summaryRow}>
                  College TASK fee — ₹{fee > 0 ? fee.toLocaleString('en-IN') : '—'} (this step)
                </Text>
                <Text style={styles.summaryRow}>
                  RC membership — ₹{RC_MEMBERSHIP_FEE} (chosen in Step 4, separate)
                </Text>
                <Text style={styles.summaryTotal}>
                  Total to acknowledge — ₹
                  {(fee + RC_MEMBERSHIP_FEE).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>
                You skipped Regional Centre. Only the college TASK fee above applies now.
              </Text>
            )}

            <CheckboxRow
              checked={draft.feeAcknowledged}
              onToggle={() => update('feeAcknowledged', !draft.feeAcknowledged)}
              label="I acknowledge the college TASK registration fee for this step."
              error={errors.feeAcknowledged}
            />

            <Text style={[styles.section, styles.sectionGap]}>Create your login</Text>
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
                • College TASK registration fee payments are final and will not be refunded.
              </Text>
              <Text style={styles.termsItem}>
                • Regional Centre membership (if chosen in Step 4) is ₹{RC_MEMBERSHIP_FEE} for{' '}
                {RC_MEMBERSHIP_MONTHS} months and is a separate, non-refundable fee.
              </Text>
            </View>
          </>
        )}

        <View style={styles.actions}>
          {step > 0 ? (
            <PrimaryButton title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          {step < STEP_LABELS.length - 1 ? (
            <PrimaryButton
              title={
                step === 3
                  ? draft.joinRegionalCenter
                    ? 'Continue to college fee'
                    : 'Skip RC — continue to college fee'
                  : step === 2
                    ? 'Continue to Regional Centre'
                    : 'Continue'
              }
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
  rcIntro: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  callout: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#E8D4A8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  calloutTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
    marginBottom: 6,
  },
  calloutText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  summaryTitle: { fontWeight: '700', color: colors.text, fontSize: 13, marginBottom: 4 },
  summaryRow: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  summaryTotal: {
    marginTop: 6,
    fontWeight: '700',
    color: colors.primaryDark,
    fontSize: 14,
  },
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
  feeBoxAlt: {
    backgroundColor: '#F3F6F8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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

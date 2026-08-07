import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsTicker } from '../components/NewsTicker';
import { DropdownField, FormField, PrimaryButton } from '../components/ui';
import {
  DUMMY_COLLEGE_CONTACTS,
  DUMMY_COLLEGE_PASSWORD,
} from '../constants/demoData';
import { DUMMY_STUDENT } from '../constants/student';
import { DUMMY_TRAINER } from '../constants/trainer';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { ensureDemoData } from '../services/demoSeedApi';
import { colors } from '../theme/colors';
import type { UserRole } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type RegistrationType = 'college' | 'student' | 'trainer';
type PortalModal = 'register' | 'signin' | null;

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College Registration' },
  { value: 'student', label: 'Student Registration' },
  { value: 'trainer', label: 'Trainer Registration' },
];

const SIGN_IN_ROLES = [
  { value: 'college_admin', label: 'College Admin' },
  { value: 'task_admin', label: 'TASK Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'student', label: 'Student' },
  { value: 'trainer', label: 'Trainer' },
];

/** Published TASK decade impact figures (NITI Aayog / public reports). */
const TASK_STATS = [
  { value: '9.84L+', label: 'Students trained' },
  { value: '761', label: 'Registered colleges' },
  { value: '18,650+', label: 'Faculty trained' },
  { value: '35,000+', label: 'Placements facilitated' },
];

const TASK_ADMIN_DEMO = {
  email: 'admin@task.telangana.gov.in',
  password: 'TaskAdmin@123',
};

const SUPER_ADMIN_DEMO = {
  email: 'superadmin@task.telangana.gov.in',
  password: 'SuperAdmin@123',
};

export function WelcomeScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [portalModal, setPortalModal] = useState<PortalModal>(null);

  const [regType, setRegType] = useState<RegistrationType | ''>('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    void ensureDemoData();
  }, []);

  const closePortal = () => {
    setPortalModal(null);
    setRegType('');
    setRole('');
    setEmail('');
    setPassword('');
  };

  const onRoleChange = (value: string) => {
    const next = value as UserRole | '';
    setRole(next);
    if (next === 'task_admin') {
      setEmail(TASK_ADMIN_DEMO.email);
      setPassword(TASK_ADMIN_DEMO.password);
    } else if (next === 'super_admin') {
      setEmail(SUPER_ADMIN_DEMO.email);
      setPassword(SUPER_ADMIN_DEMO.password);
    } else if (next === 'college_admin') {
      setEmail(DUMMY_COLLEGE_CONTACTS.officialEmail);
      setPassword(DUMMY_COLLEGE_PASSWORD);
    } else if (next === 'student') {
      setEmail(DUMMY_STUDENT.email);
      setPassword(DUMMY_STUDENT.password);
    } else if (next === 'trainer') {
      setEmail(DUMMY_TRAINER.email);
      setPassword(DUMMY_TRAINER.password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const continueRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Trainer registration.');
      return;
    }
    const route =
      regType === 'college' ? 'OtpVerify' : regType === 'student' ? 'StudentOtp' : 'TrainerOtp';
    closePortal();
    navigation.navigate(route);
  };

  const submitSignIn = async () => {
    if (!role) {
      Alert.alert('Select role', 'Please choose a sign-in role.');
      return;
    }
    try {
      setSigningIn(true);
      const user = await signIn(email, password);
      if (user.role !== role) {
        Alert.alert(
          'Wrong role selected',
          `These credentials belong to a ${user.role.replace('_', ' ')} account.`,
        );
        return;
      }
      closePortal();
      if (user.role === 'super_admin') {
        navigation.reset({ index: 0, routes: [{ name: 'SuperAdminHome' }] });
      } else if (user.role === 'task_admin') {
        navigation.reset({ index: 0, routes: [{ name: 'TaskAdminHome' }] });
      } else if (user.role === 'student') {
        navigation.reset({ index: 0, routes: [{ name: 'StudentHome' }] });
      } else if (user.role === 'trainer') {
        navigation.reset({ index: 0, routes: [{ name: 'TrainerHome' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'CollegeHome' }] });
      }
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unable to sign in');
    } finally {
      setSigningIn(false);
    }
  };

  const emblemSize = compact ? 48 : 64;
  const portraitSize = compact ? 56 : 76;
  const taskLogoSize = compact ? 64 : 86;

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarText}>040-35485290</Text>
          <Text style={styles.topBarDot}>·</Text>
          <Text style={styles.topBarText}>enquiry_task@telangana.gov.in</Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            style={styles.topLink}
            onPress={() => setPortalModal('register')}
            accessibilityRole="button"
            accessibilityLabel="Register / Sign up"
          >
            <Text style={styles.topLinkText}>Register / Sign up</Text>
          </Pressable>
          <Pressable
            style={[styles.topLink, styles.topLinkPrimary]}
            onPress={() => setPortalModal('signin')}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            <Text style={styles.topLinkPrimaryText}>Sign In</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.brandHeader}>
        <View style={styles.brandSide}>
          <Image
            source={require('../../assets/brand/ts-logo.png')}
            style={{ width: emblemSize, height: emblemSize }}
            resizeMode="contain"
            accessibilityLabel="Government of Telangana"
          />
          <OfficialPortrait
            source={require('../../assets/officials/cm-site.jpeg')}
            size={portraitSize}
            label="Hon’ble Chief Minister"
          />
        </View>

        <View style={styles.brandCenter}>
          <Text style={[styles.brandTitle, compact && styles.brandTitleCompact]} numberOfLines={2}>
            Telangana Academy for Skill and Knowledge
          </Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            Department of ITE&C, Government of Telangana
          </Text>
        </View>

        <View style={[styles.brandSide, styles.brandSideRight]}>
          <OfficialPortrait
            source={require('../../assets/officials/minister-site.jpg')}
            size={portraitSize}
            label="Hon’ble Minister for ITE&C"
          />
          <Image
            source={require('../../assets/brand/task-logo.png')}
            style={{ width: taskLogoSize, height: taskLogoSize }}
            resizeMode="contain"
            accessibilityLabel="TASK logo"
          />
        </View>
      </View>

      <View style={styles.navStrip}>
        <Text style={styles.navActive}>Home</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.cardHeading}>About Us</Text>
            <Text style={styles.aboutText}>
              TASK is a not-for-profit organization created by the Government of Telangana to bring
              synergy among Government, Industry and Academia. Established in 2004 as IEG/JKC and
              renamed TASK in 2014, it skills youth and builds employability for today’s workplace.
            </Text>
          </View>

          <View style={[styles.card, styles.announceCard]}>
            <Text style={styles.cardHeading}>Announcements</Text>
            <NewsTicker />
          </View>
        </View>

        <Text style={styles.statsHeading}>TASK at a glance</Text>
        <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
          {TASK_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.statsSource}>
          Impact figures from TASK’s first decade of operations (public reports).
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>Important details</Text>
          <View style={[styles.detailsGrid, compact && styles.detailsGridCompact]}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Skill offerings</Text>
              <Text style={styles.detailText}>
                Engineering, Degree, Pharmacy, Polytechnic, and MBA / MCA / PG programmes.
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Who can join</Text>
              <Text style={styles.detailText}>
                Colleges register with TASK; students enrol from approved colleges; trainers apply for
                Admin approval.
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Focus areas</Text>
              <Text style={styles.detailText}>
                Technology skills, soft skills, finishing school, jobs & internships, and training
                calendar programmes.
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contact</Text>
              <Text style={styles.detailText}>
                040-35485290 · enquiry_task@telangana.gov.in{'\n'}
                Sanketika Vidya Bhavan, Masabtank, Hyderabad - 500028
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.accessBox}>
          <Text style={styles.accessTitle}>Portal login</Text>
          <Text style={styles.accessSubtitle}>
            Open Register or Sign In in a popup to continue your account flow.
          </Text>
          <View style={[styles.accessActions, compact && styles.accessActionsCompact]}>
            <View style={styles.accessBtn}>
              <PrimaryButton
                title="Register / Sign up"
                onPress={() => setPortalModal('register')}
              />
            </View>
            <View style={styles.accessBtn}>
              <PrimaryButton
                title="Sign In"
                variant="secondary"
                onPress={() => setPortalModal('signin')}
              />
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Telangana Academy for Skill and Knowledge · Masabtank, Hyderabad
        </Text>
      </ScrollView>

      <Modal
        visible={portalModal === 'register'}
        transparent
        animationType="fade"
        onRequestClose={closePortal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePortal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Register / Sign up</Text>
            <Text style={styles.modalBody}>
              Choose how you want to create a TASK portal account.
            </Text>
            <DropdownField
              label="Register as"
              required
              placeholder="Select College, Student, or Trainer"
              options={REGISTRATION_OPTIONS}
              value={regType}
              onChange={(v) => setRegType(v as RegistrationType | '')}
            />
            <PrimaryButton title="Continue registration" onPress={continueRegistration} />
            <View style={styles.modalGap} />
            <PrimaryButton title="Cancel" variant="secondary" onPress={closePortal} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={portalModal === 'signin'}
        transparent
        animationType="fade"
        onRequestClose={closePortal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePortal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Sign In</Text>
            <Text style={styles.modalBody}>Select your role to continue.</Text>
            <DropdownField
              label="Sign in as"
              required
              placeholder="Select role"
              options={SIGN_IN_ROLES}
              value={role}
              onChange={onRoleChange}
            />
            <FormField
              label="Email"
              required
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <FormField
              label="Password"
              required
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <PrimaryButton
              title={signingIn ? 'Signing in…' : 'Sign In'}
              onPress={submitSignIn}
              disabled={signingIn}
            />
            <View style={styles.modalGap} />
            <PrimaryButton title="Cancel" variant="secondary" onPress={closePortal} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function OfficialPortrait({
  source,
  size,
  label,
}: {
  source: number;
  size: number;
  label: string;
}) {
  return (
    <View accessibilityLabel={label}>
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: '#D9E4E4',
          backgroundColor: colors.primarySoft,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EEF2F3',
  },
  topBar: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  topBarDot: {
    color: '#9FD0D0',
    fontSize: 12,
  },
  topLink: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  topLinkText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  topLinkPrimary: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  topLinkPrimaryText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  brandHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  brandSideRight: {
    justifyContent: 'flex-end',
  },
  brandCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  brandTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
  },
  brandTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  brandSubtitle: {
    color: '#2F6F9F',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
  },
  navStrip: {
    backgroundColor: '#F7F9FA',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navActive: {
    alignSelf: 'flex-start',
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  mainGridCompact: {
    flexDirection: 'column',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutCard: {
    flex: 1.15,
  },
  announceCard: {
    flex: 1,
  },
  cardHeading: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 10,
  },
  aboutText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  statsHeading: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statsRowCompact: {
    flexWrap: 'wrap',
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 22,
  },
  statLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsSource: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 16,
  },
  detailsBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  detailsTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailsGridCompact: {
    flexDirection: 'column',
  },
  detailItem: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 160,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
  },
  detailLabel: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  detailText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  accessBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  accessTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  accessSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  accessActions: {
    flexDirection: 'row',
    gap: 12,
  },
  accessActionsCompact: {
    flexDirection: 'column',
  },
  accessBtn: {
    flex: 1,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 35, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '90%',
  },
  modalTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 6,
  },
  modalBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  modalGap: {
    height: 10,
  },
});

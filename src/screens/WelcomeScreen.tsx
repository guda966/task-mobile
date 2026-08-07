import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsTicker } from '../components/NewsTicker';
import { DropdownField, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  DEMO_CREDENTIALS_SUMMARY,
  DEMO_SEED_VERSION,
  ensureDemoData,
} from '../services/demoSeedApi';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type RegistrationType = 'college' | 'student' | 'trainer';

const REGISTRATION_OPTIONS = [
  { value: 'college', label: 'College Registration' },
  { value: 'student', label: 'Student Registration' },
  { value: 'trainer', label: 'Trainer Registration' },
];

export function WelcomeScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [regType, setRegType] = useState<RegistrationType | ''>('');
  const [seedReady, setSeedReady] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureDemoData();
      } finally {
        if (alive) setSeedReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startRegistration = () => {
    if (!regType) {
      Alert.alert('Select registration type', 'Choose College, Student, or Trainer registration.');
      return;
    }
    if (regType === 'college') navigation.navigate('OtpVerify');
    else if (regType === 'student') navigation.navigate('StudentOtp');
    else navigation.navigate('TrainerOtp');
  };

  const loadFreshDemo = () => {
    const run = async () => {
      setSeeding(true);
      try {
        await signOut();
        await ensureDemoData({ force: true });
        setSeedReady(true);
        Alert.alert(
          'Fresh demo data loaded',
          `Seed ${DEMO_SEED_VERSION} is ready.\n\n${DEMO_CREDENTIALS_SUMMARY}`,
        );
      } catch (e) {
        Alert.alert('Could not load demo data', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setSeeding(false);
      }
    };

    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined'
          ? window.confirm(
              'This clears all local demo data in this browser and reloads fresh dummy records. Continue?',
            )
          : true;
      if (ok) void run();
      return;
    }

    Alert.alert(
      'Load fresh demo data?',
      'This clears all local demo data on this device and reloads fresh dummy records.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load fresh data', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const openOfficialSite = () => {
    void Linking.openURL('https://task.telangana.gov.in/');
  };

  const portraitSize = compact ? 70 : 92;
  const logoSize = compact ? 78 : 108;

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>040-35485290</Text>
        <Text style={styles.topBarDot}>·</Text>
        <Text style={styles.topBarText}>enquiry_task@telangana.gov.in</Text>
      </View>

      <View style={[styles.brandHeader, compact && styles.brandHeaderCompact]}>
        <View style={styles.brandLeft}>
          <Image
            source={require('../../assets/brand/ts-logo.png')}
            style={{ width: logoSize * 0.85, height: logoSize * 0.85 }}
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
          <Text style={[styles.brandTitle, compact && styles.brandTitleCompact]}>
            Telangana Academy for Skill and Knowledge
          </Text>
          <Text style={styles.brandSubtitle}>Department of ITE&C, Government of Telangana</Text>
        </View>

        <View style={styles.brandRight}>
          <OfficialPortrait
            source={require('../../assets/officials/minister-site.jpg')}
            size={portraitSize}
            label="Hon’ble Minister for ITE&C"
          />
          <Image
            source={require('../../assets/brand/task-logo.png')}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
            accessibilityLabel="TASK logo"
          />
        </View>
      </View>

      <View style={styles.navStrip}>
        <Text style={styles.navActive}>Home</Text>
        <Pressable onPress={openOfficialSite} accessibilityRole="link">
          <Text style={styles.navLink}>Official website</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.cardHeading}>About Us</Text>
            <Text style={styles.aboutText}>
              Telangana Academy for Skill and Knowledge was established by the Government of Telangana
              for enhancing skilling synergy among institutions of Government, Industry and Academia.
              TASK works with colleges, students and trainers to build employability skills for today’s
              job market.
            </Text>
            <Pressable onPress={openOfficialSite}>
              <Text style={styles.readMore}>Read More on task.telangana.gov.in</Text>
            </Pressable>
          </View>

          <View style={[styles.card, styles.announceCard]}>
            <Text style={styles.cardHeading}>Announcements</Text>
            <NewsTicker />
            <Text style={styles.announceHint}>
              College registrations, student batches and trainer approvals stay active through this
              portal.
            </Text>
          </View>
        </View>

        <View style={styles.accessBox}>
          <Text style={styles.accessTitle}>Portal access</Text>
          <Text style={styles.accessSubtitle}>
            Create a new account or sign in to your existing TASK portal account.
          </Text>

          <DropdownField
            label="Register as"
            required
            placeholder="Select College, Student, or Trainer"
            options={REGISTRATION_OPTIONS}
            value={regType}
            onChange={(v) => setRegType(v as RegistrationType | '')}
          />

          <View style={[styles.accessActions, compact && styles.accessActionsCompact]}>
            <View style={styles.accessBtn}>
              <PrimaryButton title="Create account / Register" onPress={startRegistration} />
            </View>
            <View style={styles.accessBtn}>
              <PrimaryButton
                title="Sign In"
                variant="secondary"
                onPress={() => navigation.navigate('SignIn')}
              />
            </View>
          </View>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Important note</Text>
          <Text style={styles.bullet}>
            • Use a valid email and mobile number — all official communication is sent there.
          </Text>
          <Text style={styles.bullet}>• Fields marked * are mandatory.</Text>
          <Text style={styles.bullet}>
            • Students can register only from TASK-approved colleges.
          </Text>
          <Text style={styles.bullet}>
            • Trainers must submit a resume for TASK Admin approval.
          </Text>
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Team demo</Text>
          <Text style={styles.demoBody}>
            {seedReady
              ? 'Dummy data is ready. Load fresh demo data before a walkthrough.'
              : 'Preparing demo data…'}
          </Text>
          <PrimaryButton
            title={seeding ? 'Loading…' : 'Load fresh demo data'}
            variant="secondary"
            onPress={loadFreshDemo}
            disabled={seeding}
          />
          <Text style={styles.hint}>
            Demo sign-in autofills after you select a role.{'\n'}
            Dummy OTP — Email: 111111 · Mobile: 222222
          </Text>
        </View>

        <Text style={styles.footer}>
          Telangana Academy for Skill and Knowledge · Masabtank, Hyderabad
        </Text>
      </ScrollView>
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
    <View style={styles.portraitWrap} accessibilityLabel={label}>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
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
  brandHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandHeaderCompact: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandCenter: {
    flex: 1,
    minWidth: 180,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  brandTitle: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  brandTitleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  brandSubtitle: {
    color: '#2F6F9F',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  portraitWrap: {
    alignItems: 'center',
  },
  navStrip: {
    backgroundColor: '#F7F9FA',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  navActive: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
  },
  navLink: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
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
    flex: 1.2,
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
  readMore: {
    marginTop: 12,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  announceHint: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  accessBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
    marginTop: 4,
  },
  accessActionsCompact: {
    flexDirection: 'column',
  },
  accessBtn: {
    flex: 1,
  },
  noteBox: {
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#F0D9C8',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  noteTitle: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  demoBox: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  demoTitle: {
    fontWeight: '800',
    color: colors.primaryDark,
    fontSize: 14,
  },
  demoBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});

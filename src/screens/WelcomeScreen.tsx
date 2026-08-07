import React, { useEffect } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsTicker } from '../components/NewsTicker';
import { RollingStats } from '../components/RollingStats';
import { PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { ensureDemoData } from '../services/demoSeedApi';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  useEffect(() => {
    void ensureDemoData();
  }, []);

  const emblemSize = compact ? 44 : 64;
  const portraitSize = compact ? 52 : 76;
  const taskLogoSize = compact ? 72 : 96;

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
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel="Register / Sign up"
          >
            <Text style={styles.topLinkText}>Register / Sign up</Text>
          </Pressable>
          <Pressable
            style={[styles.topLink, styles.topLinkPrimary]}
            onPress={() => navigation.navigate('SignIn')}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            <Text style={styles.topLinkPrimaryText}>Sign In</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.brandHeader, compact && styles.brandHeaderCompact]}>
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
          <Text style={[styles.brandTitle, compact && styles.brandTitleCompact]} numberOfLines={compact ? 3 : 2}>
            Telangana Academy for Skill and Knowledge
          </Text>
          <Text style={styles.brandSubtitle} numberOfLines={2}>
            Department of ITE&C, Government of Telangana
          </Text>
        </View>

        <View style={[styles.brandSide, styles.brandSideRight]}>
          <OfficialPortrait
            source={require('../../assets/officials/minister-site.jpg')}
            size={portraitSize}
            label="Hon’ble Minister for ITE&C"
          />
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/brand/task-logo.png')}
              style={{ width: taskLogoSize, height: taskLogoSize }}
              resizeMode="contain"
              accessibilityLabel="TASK logo"
            />
          </View>
        </View>
      </View>

      <View style={styles.navStrip}>
        <Text style={styles.navActive}>Home</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
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

        <Text style={styles.statsHeading}>TASK at a glance</Text>
        <RollingStats compact={compact} />
        <Text style={styles.statsSource}>
          Impact figures from TASK’s first decade of operations (public reports).
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>Important details</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Skill offerings</Text>
              <Text style={styles.detailText}>
                Engineering, Degree, Pharmacy, Polytechnic, and MBA / MCA / PG programmes.
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Who can join</Text>
              <Text style={styles.detailText}>
                Colleges, students, and corporates can register on this portal for TASK
                programmes and partnerships.
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
            Register a new account or sign in to continue to your dashboard.
          </Text>
          <View style={[styles.accessActions, compact && styles.accessActionsCompact]}>
            <View style={styles.accessBtn}>
              <PrimaryButton
                title="Register / Sign up"
                onPress={() => navigation.navigate('Register')}
              />
            </View>
            <View style={styles.accessBtn}>
              <PrimaryButton
                title="Already have an account? Sign In"
                variant="secondary"
                onPress={() => navigation.navigate('SignIn')}
              />
            </View>
          </View>
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
    overflow: 'visible',
  },
  brandHeaderCompact: {
    paddingVertical: 10,
    gap: 6,
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
  logoWrap: {
    padding: 4,
    overflow: 'visible',
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
    gap: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  announceCard: {
    width: '100%',
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
    marginBottom: -4,
  },
  statsSource: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: -8,
  },
  detailsBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
  },
  detailsList: {
    gap: 10,
  },
  detailItem: {
    width: '100%',
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
});

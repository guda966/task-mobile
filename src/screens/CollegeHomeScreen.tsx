import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DUMMY_COLLEGE_CONTACTS } from '../constants/demoData';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { CollegeShell, type CollegeMenuKey } from '../components/CollegeShell';
import { PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { AppNotification, CollegeEnrollment } from '../types/enrollment';
import { CalendarPanel } from './college/CalendarPanel';
import { CourseRequestsPanel } from './college/CourseRequestsPanel';
import { CoursesPanel } from './college/CoursesPanel';
import { BatchProgressPanel } from './college/BatchProgressPanel';
import { ReportsPanel } from './college/ReportsPanel';
import { RenewalPanel } from './college/RenewalPanel';
import { StudentsPanel } from './college/StudentsPanel';

type Props = NativeStackScreenProps<RootStackParamList, 'CollegeHome'>;

export function CollegeHomeScreen({ navigation }: Props) {
  const { user, signOut, setUser } = useAuth();
  const [menu, setMenu] = useState<CollegeMenuKey>('overview');
  const [enrollment, setEnrollment] = useState<CollegeEnrollment | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CourseRequest[]>([]);
  const [recentRequests, setRecentRequests] = useState<CourseRequest[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<CourseRequest[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    let record: CollegeEnrollment | null = null;

    if (user.email === DUMMY_COLLEGE_CONTACTS.officialEmail) {
      record = await collegePortalApi.ensureDemoApprovedCollege();
      if (user.enrollmentId !== record.id) {
        setUser({
          ...user,
          enrollmentId: record.id,
          name: record.contactPersonName,
          email: record.officialEmail,
        });
      }
    } else if (user.enrollmentId) {
      record = await mockApi.getEnrollment(user.enrollmentId);
      if (record?.status === 'approved') {
        await collegePortalApi.ensureSeedData(record.id);
      }
    }

    setEnrollment(record);
    if (record) {
      setNotifications(
        await mockApi.getNotificationsFor({ ...user, enrollmentId: record.id }),
      );
      const allRequests = await collegePortalApi.listCourseRequests({
        enrollmentId: record.id,
      });
      setPendingRequests(allRequests.filter((r) => r.status === 'pending').slice(0, 5));
      setRecentRequests(
        [...allRequests]
          .sort((a, b) =>
            (b.reviewedAt || b.requestedOn).localeCompare(a.reviewedAt || a.requestedOn),
          )
          .slice(0, 8),
      );
      const calendar = await collegePortalApi.listCalendarEvents(record.id);
      const today = new Date().toISOString().slice(0, 10);
      setUpcomingSessions(
        calendar.filter((s) => s.endDate >= today).slice(0, 5),
      );
      const students = await collegePortalApi.listStudents(record.id);
      setStudentCount(students.length);
    } else {
      setPendingRequests([]);
      setRecentRequests([]);
      setUpcomingSessions([]);
      setStudentCount(0);
    }
  }, [user, setUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    if (menu === 'overview') {
      load();
    }
  }, [menu, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  if (!enrollment) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading college portal…</Text>
      </View>
    );
  }

  if (enrollment.status !== 'approved') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>College portal locked</Text>
        <Text style={styles.muted}>
          Registration status is {enrollment.status}. TASK Admin must approve the college first.
        </Text>
        <PrimaryButton title="Sign Out" variant="secondary" onPress={onSignOut} />
      </View>
    );
  }

  return (
    <CollegeShell
      collegeName={enrollment.institutionName}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
    >
      {menu === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <PanelHeader
            title="Overview"
            subtitle="College status, latest TASK updates, and quick links for daily work."
          />

          <StatTiles
            items={[
              { label: 'Students', value: studentCount, hint: 'In college registry' },
              {
                label: 'Pending requests',
                value: pendingRequests.length,
                hint: 'Awaiting TASK Admin',
              },
              {
                label: 'Upcoming sessions',
                value: upcomingSessions.length,
                hint: 'Approved calendar',
              },
              {
                label: 'Status',
                value: enrollment.status === 'approved' ? 'Active' : enrollment.status,
                hint: enrollment.regionalCenterName,
              },
            ]}
          />

          <DataCard>
            <View style={styles.row}>
              <Text style={styles.college}>{enrollment.institutionName}</Text>
              <StatusBadge status={enrollment.status} />
            </View>
            <Text style={styles.meta}>Affiliation: {enrollment.affiliationNumber}</Text>
            <Text style={styles.meta}>
              {enrollment.district} · {enrollment.regionalCenterName}
            </Text>
            <Text style={styles.meta}>
              Contact: {enrollment.contactPersonName} ({enrollment.contactDesignation})
            </Text>
          </DataCard>

          <SectionLabel>Latest updates</SectionLabel>
          {(() => {
            const updates: {
              id: string;
              title: string;
              body: string;
              when: string;
              status?: string;
              onPress?: () => void;
            }[] = [];

            for (const n of notifications.slice(0, 6)) {
              updates.push({
                id: `n_${n.id}`,
                title: n.title,
                body: n.body,
                when: n.createdAt,
              });
            }

            for (const req of recentRequests) {
              if (req.status === 'approved' && req.trainerName) {
                updates.push({
                  id: `trn_${req.id}`,
                  title: `Trainer assigned · ${req.courseName}`,
                  body: `${req.trainerName}${
                    req.backupTrainerName ? ` (backup: ${req.backupTrainerName})` : ''
                  } · ${req.startDate} → ${req.endDate}`,
                  when: req.reviewedAt || req.requestedOn,
                  status: 'approved',
                  onPress: () =>
                    navigation.navigate('CourseRequestDetail', { requestId: req.id }),
                });
              } else if (req.status === 'approved') {
                updates.push({
                  id: `apr_${req.id}`,
                  title: `Course approved · ${req.courseName}`,
                  body: `Awaiting trainer assignment · ${req.branch} · Batch ${req.batchSize}`,
                  when: req.reviewedAt || req.requestedOn,
                  status: 'approved',
                  onPress: () =>
                    navigation.navigate('CourseRequestDetail', { requestId: req.id }),
                });
              } else if (req.status === 'rejected') {
                updates.push({
                  id: `rej_${req.id}`,
                  title: `Course rejected · ${req.courseName}`,
                  body: req.rejectionReason || 'Rejected by TASK Admin',
                  when: req.reviewedAt || req.requestedOn,
                  status: 'rejected',
                  onPress: () =>
                    navigation.navigate('CourseRequestDetail', { requestId: req.id }),
                });
              } else if (req.status === 'pending') {
                updates.push({
                  id: `pen_${req.id}`,
                  title: `Request pending · ${req.courseName}`,
                  body: `Submitted for TASK Admin review · ${req.startDate} → ${req.endDate}`,
                  when: req.requestedOn,
                  status: 'pending',
                  onPress: () =>
                    navigation.navigate('CourseRequestDetail', { requestId: req.id }),
                });
              }
            }

            updates.sort((a, b) => b.when.localeCompare(a.when));
            const unique = updates.slice(0, 8);

            if (unique.length === 0) {
              return <EmptyState title="No recent updates yet" body="Approvals and trainer assignments will show here." />;
            }

            return unique.map((u) => (
              <DataCard key={u.id} accent onPress={u.onPress}>
                <View style={styles.row}>
                  <Text style={styles.noteTitle}>{u.title}</Text>
                  {u.status ? <StatusBadge status={u.status} /> : null}
                </View>
                <Text style={styles.meta}>{u.body}</Text>
                <Text style={styles.when}>{new Date(u.when).toLocaleString('en-IN')}</Text>
              </DataCard>
            ));
          })()}

          <SectionLabel>Upcoming trainings</SectionLabel>
          {upcomingSessions.length === 0 ? (
            <EmptyState
              title="No upcoming approved sessions"
              body="Approved calendar sessions will appear here."
            />
          ) : (
            upcomingSessions.map((s) => (
              <DataCard key={s.id} accent onPress={() => setMenu('calendar')}>
                <Text style={styles.noteTitle}>{s.courseName}</Text>
                <Text style={styles.meta}>
                  {s.startDate} → {s.endDate} · {s.branch} · Batch {s.batchSize}
                </Text>
                <Text style={styles.meta}>Trainer: {s.trainerName || 'Not assigned yet'}</Text>
              </DataCard>
            ))
          )}

          <SectionLabel>Quick actions</SectionLabel>
          <View style={styles.actions}>
            {[
              {
                title: 'Students',
                body: `${studentCount} registered students`,
                onPress: () => setMenu('students'),
              },
              {
                title: 'Courses',
                body: 'Browse TASK course catalogue',
                onPress: () => setMenu('courses'),
              },
              {
                title: 'Request a Course',
                body: 'Submit and track requests',
                onPress: () => setMenu('requests'),
              },
              {
                title: 'Reports',
                body: 'Export student and batch reports',
                onPress: () => setMenu('reports'),
              },
              {
                title: 'Calendar',
                body: 'Approved trainings only',
                onPress: () => setMenu('calendar'),
              },
              {
                title: 'Edit profile',
                body: 'Update contact details or password',
                onPress: () => navigation.navigate('ProfileEdit'),
              },
            ].map((action) => (
              <Pressable key={action.title} style={styles.action} onPress={action.onPress}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionBody}>{action.body}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHead}>
            <SectionLabel>Pending course requests</SectionLabel>
            <Pressable onPress={() => setMenu('requests')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          {pendingRequests.length === 0 ? (
            <EmptyState title="No pending course requests" body="New submissions will appear here while awaiting approval." />
          ) : (
            pendingRequests.map((req) => (
              <DataCard
                key={req.id}
                onPress={() =>
                  navigation.navigate('CourseRequestDetail', { requestId: req.id })
                }
              >
                <View style={styles.row}>
                  <Text style={styles.noteTitle}>{req.courseName}</Text>
                  <StatusBadge status={req.status} />
                </View>
                <Text style={styles.meta}>
                  {req.startDate} → {req.endDate} · Batch {req.batchSize}
                </Text>
                <Text style={styles.meta}>
                  Requested {new Date(req.requestedOn).toLocaleString('en-IN')}
                </Text>
              </DataCard>
            ))
          )}
        </ScrollView>
      ) : null}

      {menu === 'students' ? <StudentsPanel enrollmentId={enrollment.id} /> : null}
      {menu === 'courses' ? (
        <CoursesPanel
          onRequestCourse={(course) =>
            navigation.navigate('RequestCourse', {
              courseId: course.id,
              category: course.category,
            })
          }
        />
      ) : null}
      {menu === 'requests' ? (
        <CourseRequestsPanel
          enrollment={enrollment}
          onOpenForm={() => navigation.navigate('RequestCourse', {})}
          onView={(id) => navigation.navigate('CourseRequestDetail', { requestId: id })}
        />
      ) : null}
      {menu === 'calendar' ? <CalendarPanel enrollmentId={enrollment.id} /> : null}
      {menu === 'progress' ? (
        <BatchProgressPanel
          enrollmentId={enrollment.id}
          onOpenSession={(requestId) =>
            navigation.navigate('CourseRequestDetail', { requestId })
          }
        />
      ) : null}
      {menu === 'reports' ? <ReportsPanel enrollmentId={enrollment.id} /> : null}
      {menu === 'renewal' ? <RenewalPanel enrollment={enrollment} /> : null}
    </CollegeShell>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blocked: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  blockedTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  pad: { padding: 16, paddingBottom: 40 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  college: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 13, marginBottom: 3, lineHeight: 18 },
  when: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  muted: { color: colors.textMuted, marginBottom: 8 },
  actions: { gap: 8, marginBottom: 12 },
  action: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  actionTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  actionBody: { color: colors.textMuted, fontSize: 13 },
  noteTitle: { flex: 1, fontWeight: '700', color: colors.text, marginBottom: 4 },
});

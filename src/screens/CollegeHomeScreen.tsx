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
          <Text style={styles.h1}>Overview</Text>
          <View style={styles.card}>
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
            <Text style={styles.meta}>
              Students: {studentCount} · Pending requests: {pendingRequests.length}
            </Text>
          </View>

          <Text style={styles.h2}>Latest updates</Text>
          <Text style={styles.lead}>
            Approvals, trainer assignments, and other TASK Admin activity for your college.
          </Text>
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
              return <Text style={styles.muted}>No recent updates yet.</Text>;
            }

            return unique.map((u) => (
              <Pressable
                key={u.id}
                style={styles.updateCard}
                onPress={u.onPress}
                disabled={!u.onPress}
              >
                <View style={styles.row}>
                  <Text style={styles.noteTitle}>{u.title}</Text>
                  {u.status ? <StatusBadge status={u.status} /> : null}
                </View>
                <Text style={styles.meta}>{u.body}</Text>
                <Text style={styles.when}>
                  {new Date(u.when).toLocaleString('en-IN')}
                </Text>
              </Pressable>
            ));
          })()}

          <Text style={styles.h2}>Upcoming trainings</Text>
          {upcomingSessions.length === 0 ? (
            <Text style={styles.muted}>No upcoming approved sessions on the calendar.</Text>
          ) : (
            upcomingSessions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.updateCard}
                onPress={() => setMenu('calendar')}
              >
                <Text style={styles.noteTitle}>{s.courseName}</Text>
                <Text style={styles.meta}>
                  {s.startDate} → {s.endDate} · {s.branch} · Batch {s.batchSize}
                </Text>
                <Text style={styles.meta}>
                  Trainer: {s.trainerName || 'Not assigned yet'}
                </Text>
              </Pressable>
            ))
          )}

          <Text style={styles.h2}>Quick actions</Text>
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => navigation.navigate('ProfileEdit')}>
              <Text style={styles.actionTitle}>Edit profile</Text>
              <Text style={styles.actionBody}>Update contact details or password</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('courses')}>
              <Text style={styles.actionTitle}>Courses</Text>
              <Text style={styles.actionBody}>Browse TASK course catalogue</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('requests')}>
              <Text style={styles.actionTitle}>Request a Course</Text>
              <Text style={styles.actionBody}>Submit and track requests</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('calendar')}>
              <Text style={styles.actionTitle}>Calendar</Text>
              <Text style={styles.actionBody}>Approved trainings only</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('students')}>
              <Text style={styles.actionTitle}>Students</Text>
              <Text style={styles.actionBody}>{studentCount} registered students</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.h2}>Pending course requests</Text>
            <Pressable onPress={() => setMenu('requests')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          {pendingRequests.length === 0 ? (
            <Text style={styles.muted}>No pending course requests right now.</Text>
          ) : (
            pendingRequests.map((req) => (
              <Pressable
                key={req.id}
                style={styles.note}
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
              </Pressable>
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
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  h2: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  lead: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 10, marginTop: -4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
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
    borderRadius: 10,
    padding: 14,
  },
  actionTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  actionBody: { color: colors.textMuted, fontSize: 13 },
  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  updateCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteTitle: { flex: 1, fontWeight: '700', color: colors.text, marginBottom: 4 },
});

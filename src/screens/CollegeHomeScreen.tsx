import React, { useCallback, useMemo, useState } from 'react';
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
import { PrimaryButton } from '../components/ui';
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
import { NotificationsPanel } from './college/NotificationsPanel';
import { ReportsPanel } from './college/ReportsPanel';
import { RenewalPanel } from './college/RenewalPanel';
import { StudentsPanel } from './college/StudentsPanel';

type Props = NativeStackScreenProps<RootStackParamList, 'CollegeHome'>;

export function CollegeHomeScreen({ navigation }: Props) {
  const { user, signOut, setUser } = useAuth();
  const [menu, setMenu] = useState<CollegeMenuKey>('overview');
  const [enrollment, setEnrollment] = useState<CollegeEnrollment | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
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
      setPendingCount(allRequests.filter((r) => r.status === 'pending').length);
      const calendar = await collegePortalApi.listCalendarEvents(record.id);
      const today = new Date().toISOString().slice(0, 10);
      setUpcomingSessions(calendar.filter((s) => s.endDate >= today).slice(0, 3));
      const students = await collegePortalApi.listStudents(record.id);
      setStudentCount(students.length);
    } else {
      setNotifications([]);
      setPendingCount(0);
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
    if (menu === 'overview' || menu === 'messages') {
      load();
    }
  }, [menu, load]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

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
        <Text style={styles.blockedTitle}>Almost ready</Text>
        <Text style={styles.muted}>
          Your college registration is under review by TASK. You will get a message here once it is
          approved.
        </Text>
        <PrimaryButton title="Sign out" variant="secondary" onPress={onSignOut} />
      </View>
    );
  }

  const latestMessages = notifications.slice(0, 3);

  return (
    <CollegeShell
      collegeName={enrollment.institutionName}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
      unreadCount={unreadCount}
    >
      {menu === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <PanelHeader
            title="Home"
            subtitle={`Welcome${user?.name ? `, ${user.name}` : ''}. Use the menu to manage students, courses, and reports.`}
          />

          <StatTiles
            items={[
              { label: 'Students', value: studentCount },
              { label: 'Open requests', value: pendingCount },
              { label: 'Upcoming', value: upcomingSessions.length },
              { label: 'New messages', value: unreadCount },
            ]}
          />

          <View style={styles.sectionHead}>
            <SectionLabel>Messages from TASK</SectionLabel>
            <Pressable onPress={() => setMenu('messages')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          {latestMessages.length === 0 ? (
            <EmptyState title="No messages" body="Updates from TASK will show here." />
          ) : (
            latestMessages.map((n) => (
              <DataCard key={n.id} onPress={() => setMenu('messages')}>
                <Text style={styles.noteTitle}>{n.title}</Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {n.body}
                </Text>
              </DataCard>
            ))
          )}

          <View style={styles.sectionHead}>
            <SectionLabel>Next trainings</SectionLabel>
            <Pressable onPress={() => setMenu('calendar')}>
              <Text style={styles.link}>Calendar</Text>
            </Pressable>
          </View>
          {upcomingSessions.length === 0 ? (
            <EmptyState
              title="No upcoming trainings"
              body="Approved sessions will appear on your calendar."
            />
          ) : (
            upcomingSessions.map((s) => (
              <DataCard key={s.id} accent onPress={() => setMenu('calendar')}>
                <Text style={styles.noteTitle}>{s.courseName}</Text>
                <Text style={styles.meta}>
                  {s.startDate} to {s.endDate} · {s.branch}
                </Text>
              </DataCard>
            ))
          )}
        </ScrollView>
      ) : null}

      {menu === 'messages' && user ? (
        <NotificationsPanel
          user={user}
          enrollmentId={enrollment.id}
          onChanged={load}
        />
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
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  muted: { color: colors.textMuted, marginBottom: 8, lineHeight: 20 },
  noteTitle: { fontWeight: '700', color: colors.text, marginBottom: 4 },
});

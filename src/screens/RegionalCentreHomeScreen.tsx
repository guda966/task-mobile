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
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { RcShell, type RcMenuKey } from '../components/RcShell';
import { PrimaryButton, StatusBadge } from '../components/ui';
import { RC_MEMBERSHIP_FEE, RC_MEMBERSHIP_MONTHS } from '../constants/lookups';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { regionalCentreApi } from '../services/regionalCentreApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { AppNotification } from '../types/enrollment';
import type { RcMembership } from '../types/regionalCentre';
import { isMembershipActive } from '../types/regionalCentre';
import { CalendarPanel } from './college/CalendarPanel';
import { CourseRequestsPanel } from './college/CourseRequestsPanel';
import { CoursesPanel } from './college/CoursesPanel';

type Props = NativeStackScreenProps<RootStackParamList, 'RegionalCentreHome'>;

export function RegionalCentreHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<RcMenuKey>('home');
  const [members, setMembers] = useState<RcMembership[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingSessions, setUpcomingSessions] = useState<CourseRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const centerId = user?.regionalCenterId || '';
  const center = useMemo(
    () => (centerId ? regionalCentreApi.getCenter(centerId) : undefined),
    [centerId],
  );

  const load = useCallback(async () => {
    if (!centerId) return;
    const list = await regionalCentreApi.listMembershipsForCenter(centerId);
    setMembers(list);
    const notes = await collegePortalApi.listRcNotifications(centerId);
    setNotifications(notes);
    const requests = await collegePortalApi.listCourseRequests({
      regionalCenterId: centerId,
      requesterType: 'regional_center',
    });
    setPendingCount(requests.filter((r) => r.status === 'pending').length);
    const calendar = await collegePortalApi.listRcCalendarEvents(centerId);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = calendar.filter((s) => s.endDate >= today);
    setUpcomingCount(upcoming.length);
    setUpcomingSessions(upcoming.slice(0, 3));
  }, [centerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    if (menu === 'home' || menu === 'messages') {
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

  const markAlertsRead = async () => {
    if (!centerId) return;
    await collegePortalApi.markRcNotificationsRead(centerId);
    await load();
  };

  if (!user?.regionalCenterId || !center) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No Regional Centre session found.</Text>
        <PrimaryButton title="Sign out" variant="secondary" onPress={onSignOut} />
      </View>
    );
  }

  const activeMembers = members.filter((m) => isMembershipActive(m));
  const latestMessages = notifications.slice(0, 3);

  return (
    <RcShell
      centreName={center.name}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
      unreadCount={unreadCount}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      onHome={() => setMenu('home')}
    >
      {menu === 'home' ? (
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <PanelHeader
            title="Home"
            subtitle={`Welcome to ${center.name}. Request courses from the catalogue; TASK Admin approval unlocks your calendar — same flow as colleges.`}
          />

          <StatTiles
            items={[
              { label: 'Active students', value: activeMembers.length },
              { label: 'Open requests', value: pendingCount },
              { label: 'Upcoming', value: upcomingCount },
              { label: 'New alerts', value: unreadCount },
            ]}
          />

          <View style={styles.sectionHead}>
            <SectionLabel>Alerts from TASK</SectionLabel>
            <Pressable onPress={() => setMenu('messages')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          {latestMessages.length === 0 ? (
            <EmptyState title="No alerts" body="Approvals and trainer updates appear here." />
          ) : (
            latestMessages.map((n) => (
              <DataCard key={n.id}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.meta}>{n.body}</Text>
              </DataCard>
            ))
          )}

          <View style={styles.sectionHead}>
            <SectionLabel>Next approved trainings</SectionLabel>
            <Pressable onPress={() => setMenu('calendar')}>
              <Text style={styles.link}>Calendar</Text>
            </Pressable>
          </View>
          {upcomingSessions.length === 0 ? (
            <EmptyState
              title="No approved sessions yet"
              body="Browse Courses, submit a request with dates, and wait for TASK Admin approval."
            />
          ) : (
            upcomingSessions.map((s) => (
              <DataCard key={s.id} accent>
                <Text style={styles.cardTitle}>{s.courseName}</Text>
                <Text style={styles.meta}>
                  {s.startDate} → {s.endDate} · {s.branch} · Batch {s.batchSize}
                </Text>
                {s.trainerName ? (
                  <Text style={styles.meta}>Trainer: {s.trainerName}</Text>
                ) : (
                  <Text style={styles.meta}>Trainer not assigned yet</Text>
                )}
              </DataCard>
            ))
          )}

          <PrimaryButton title="Browse courses" onPress={() => setMenu('courses')} />
          <PrimaryButton
            title="New course request"
            variant="secondary"
            onPress={() => navigation.navigate('RequestCourse', {})}
          />
        </ScrollView>
      ) : null}

      {menu === 'messages' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <PanelHeader
            title="Alerts"
            subtitle="Updates from TASK Admin on your course requests and trainers."
            action={
              unreadCount > 0 ? (
                <PrimaryButton title="Mark all read" variant="secondary" onPress={markAlertsRead} />
              ) : undefined
            }
          />
          {notifications.length === 0 ? (
            <EmptyState title="No alerts" body="When TASK reviews a request, it shows here." />
          ) : (
            notifications.map((n) => (
              <DataCard key={n.id}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  {!n.read ? <StatusBadge status="pending" /> : null}
                </View>
                <Text style={styles.meta}>{n.body}</Text>
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString('en-IN')}</Text>
              </DataCard>
            ))
          )}
        </ScrollView>
      ) : null}

      {menu === 'members' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <PanelHeader
            title="Students"
            subtitle={`RC members who paid ₹${RC_MEMBERSHIP_FEE} (valid ${RC_MEMBERSHIP_MONTHS} months). They can enrol in approved calendar sessions.`}
          />
          <StatTiles
            items={[
              { label: 'Active', value: activeMembers.length },
              { label: 'Total', value: members.length },
            ]}
          />
          {members.length === 0 ? (
            <EmptyState
              title="No members yet"
              body="When students register for this Regional Centre and pay ₹599, they appear here."
            />
          ) : (
            members.map((m) => (
              <DataCard key={m.id}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{m.studentName}</Text>
                  <StatusBadge status={isMembershipActive(m) ? 'approved' : 'rejected'} />
                </View>
                <Text style={styles.meta}>{m.studentEmail}</Text>
                <Text style={styles.meta}>{m.collegeName}</Text>
                <Text style={styles.meta}>
                  ₹{m.feePaid} · {m.startedAt.slice(0, 10)} → {m.expiresAt.slice(0, 10)}
                </Text>
              </DataCard>
            ))
          )}
        </ScrollView>
      ) : null}

      {menu === 'courses' ? (
        <CoursesPanel
          subtitle="Browse the TASK catalogue and request a course for your Regional Centre. TASK Admin must approve before students can enrol."
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
          regionalCenterId={centerId}
          onOpenForm={() => navigation.navigate('RequestCourse', {})}
          onView={(id) => navigation.navigate('CourseRequestDetail', { requestId: id })}
        />
      ) : null}

      {menu === 'calendar' ? <CalendarPanel regionalCenterId={centerId} /> : null}

      {menu === 'profile' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <PanelHeader title="Profile" subtitle="Regional Centre desk details for this demo login." />
          <DataCard>
            <Text style={styles.cardTitle}>{center.name}</Text>
            <Text style={styles.meta}>
              {center.place}, {center.district}
            </Text>
            <Text style={styles.meta}>{center.email}</Text>
            <Text style={styles.meta}>
              Membership fee ₹{RC_MEMBERSHIP_FEE} · {RC_MEMBERSHIP_MONTHS} months
            </Text>
          </DataCard>
          <Text style={styles.hint}>
            Course flow: Courses → Request (with schedule dates) → TASK Admin approves → Calendar →
            RC students enrol.
          </Text>
        </ScrollView>
      ) : null}
    </RcShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  pad: { padding: 16, paddingBottom: 40, gap: 12 },
  muted: { color: colors.textMuted, textAlign: 'center' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  link: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});

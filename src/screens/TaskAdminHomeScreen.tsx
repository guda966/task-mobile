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
import { AdminShell } from '../components/AdminShell';
import {
  PanelHeader,
  StatTiles,
} from '../components/college/PanelChrome';
import { PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { mockApi } from '../services/mockApi';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { AppNotification, CollegeEnrollment } from '../types/enrollment';
import type { TrainerRecord } from '../types/trainer';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminHome'>;
type AdminTab =
  | 'actions'
  | 'registrations'
  | 'courseRequests'
  | 'catalogue'
  | 'trainers'
  | 'calendar';

export function TaskAdminHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('actions');
  const [items, setItems] = useState<CollegeEnrollment[]>([]);
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [calendar, setCalendar] = useState<CourseRequest[]>([]);
  const [trainers, setTrainers] = useState<TrainerRecord[]>([]);
  const [courseCount, setCourseCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await mockApi.listAllEnrollments());
    setRequests(await collegePortalApi.listCourseRequests());
    setCalendar(await collegePortalApi.listCalendarEvents());
    const courses = await collegePortalApi.listCoursesAdmin();
    setCourseCount(courses.length);
    await trainerApi.ensureDemoTrainer();
    setTrainers(await trainerApi.listTrainers());
    if (user) setNotifications(await mockApi.getNotificationsFor(user));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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

  const pendingRegs = useMemo(
    () => items.filter((i) => i.status === 'pending'),
    [items],
  );
  const pendingReqs = useMemo(
    () => requests.filter((i) => i.status === 'pending'),
    [requests],
  );
  const needsTrainerAssign = useMemo(
    () => requests.filter((r) => r.status === 'approved' && !r.trainerId),
    [requests],
  );
  const assignedCourses = useMemo(
    () => requests.filter((r) => r.status === 'approved' && !!r.trainerId),
    [requests],
  );

  const actionCount =
    pendingRegs.length + pendingReqs.length + needsTrainerAssign.length;

  return (
    <AdminShell
      brandTitle="TASK Admin"
      userName={user?.name || 'TASK Admin'}
      active={tab}
      onChange={(key) => setTab(key as AdminTab)}
      onSignOut={onSignOut}
      menu={[
        { key: 'actions', label: 'Home', badge: actionCount || undefined },
        { key: 'registrations', label: 'Colleges', badge: pendingRegs.length || undefined },
        { key: 'courseRequests', label: 'Course requests', badge: pendingReqs.length || undefined },
        { key: 'catalogue', label: 'Catalogue' },
        { key: 'trainers', label: 'Trainers' },
        { key: 'calendar', label: 'Calendar' },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'actions' ? (
          <>
            <PanelHeader
              title="Operations home"
              subtitle={
                actionCount
                  ? `${actionCount} item${actionCount === 1 ? '' : 's'} need attention`
                  : 'All caught up — browse modules from the menu'
              }
              action={
                <PrimaryButton
                  title="Profile"
                  variant="secondary"
                  onPress={() => navigation.navigate('ProfileEdit')}
                />
              }
            />
            <StatTiles
              items={[
                { label: 'Pending colleges', value: String(pendingRegs.length) },
                { label: 'Course requests', value: String(pendingReqs.length) },
                { label: 'Need trainers', value: String(needsTrainerAssign.length) },
                { label: 'Active trainers', value: String(trainers.filter((t) => t.status === 'active').length) },
              ]}
            />
          </>
        ) : null}

        {tab === 'actions' ? (
          <>
            <Text style={styles.section}>Immediate actions</Text>
            <Text style={styles.lead}>
              Review and complete these from here — no need to hunt through other sections first.
            </Text>

            {actionCount === 0 ? (
              <View style={styles.caughtUp}>
                <Text style={styles.caughtUpTitle}>You are all caught up</Text>
                <Text style={styles.caughtUpBody}>
                  No pending college approvals, course requests, or trainer assignments right now.
                </Text>
              </View>
            ) : null}

            {pendingRegs.length > 0 ? (
              <ActionGroup
                title="Approve college registrations"
                count={pendingRegs.length}
                actionLabel="Review"
              >
                {pendingRegs.slice(0, 5).map((item) => (
                  <ActionRow
                    key={item.id}
                    title={item.institutionName}
                    meta={`${item.district} · ${item.affiliationNumber}`}
                    badge="pending"
                    cta="Review"
                    onPress={() =>
                      navigation.navigate('TaskAdminReview', { enrollmentId: item.id })
                    }
                  />
                ))}
              </ActionGroup>
            ) : null}

            {pendingReqs.length > 0 ? (
              <ActionGroup
                title="Approve course requests"
                count={pendingReqs.length}
                actionLabel="Review"
              >
                {pendingReqs.slice(0, 5).map((item) => (
                  <ActionRow
                    key={item.id}
                    title={item.courseName}
                    meta={`${item.collegeName} · ${item.startDate} → ${item.endDate}`}
                    badge="pending"
                    cta="Review"
                    onPress={() =>
                      navigation.navigate('CourseRequestDetail', { requestId: item.id })
                    }
                  />
                ))}
              </ActionGroup>
            ) : null}

            {needsTrainerAssign.length > 0 ? (
              <ActionGroup
                title="Assign trainers to approved courses"
                count={needsTrainerAssign.length}
                actionLabel="Assign"
              >
                {needsTrainerAssign.slice(0, 5).map((item) => (
                  <ActionRow
                    key={item.id}
                    title={item.courseName}
                    meta={`${item.collegeName} · ${item.branch} · Batch ${item.batchSize}`}
                    badge="approved"
                    cta="Assign trainer"
                    onPress={() =>
                      navigation.navigate('CourseRequestDetail', { requestId: item.id })
                    }
                  />
                ))}
              </ActionGroup>
            ) : null}

            {assignedCourses.length > 0 ? (
              <ActionGroup
                title="Edit trainer assignments"
                count={assignedCourses.length}
                actionLabel="Edit"
              >
                {assignedCourses.slice(0, 5).map((item) => (
                  <ActionRow
                    key={item.id}
                    title={item.courseName}
                    meta={`${item.collegeName} · Trainer: ${item.trainerName}${
                      item.backupTrainerName ? ` · Backup: ${item.backupTrainerName}` : ''
                    }`}
                    badge="approved"
                    cta="Edit assignment"
                    onPress={() =>
                      navigation.navigate('CourseRequestDetail', { requestId: item.id })
                    }
                  />
                ))}
              </ActionGroup>
            ) : null}
          </>
        ) : null}

        {tab === 'registrations' ? (
          <>
            <Text style={styles.section}>College registration queue</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>No college registrations yet.</Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('TaskAdminReview', { enrollmentId: item.id })
                  }
                >
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.institutionName}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.meta}>
                    {item.district} · {item.affiliationNumber}
                  </Text>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {tab === 'courseRequests' ? (
          <>
            <Text style={styles.section}>Course request queue</Text>
            {requests.length === 0 ? (
              <Text style={styles.empty}>No course requests yet.</Text>
            ) : (
              requests.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('CourseRequestDetail', { requestId: item.id })
                  }
                >
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.courseName}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.meta}>{item.collegeName}</Text>
                  <Text style={styles.meta}>
                    {item.startDate} → {item.endDate} · Batch {item.batchSize}
                  </Text>
                  {item.status === 'approved' ? (
                    <Text style={styles.meta}>
                      Trainer: {item.trainerName || 'Not assigned yet'}
                      {item.trainerName ? ' · Tap to view / edit' : ' · Tap to assign'}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {tab === 'catalogue' ? (
          <>
            <Text style={styles.section}>Course catalogue</Text>
            <Text style={styles.lead}>
              Manage workshop titles available to colleges. Disabled courses are hidden from
              college request forms.
            </Text>
            <PrimaryButton
              title="Open course catalogue"
              onPress={() => navigation.navigate('TaskAdminCourses')}
            />
            <View style={{ height: 10 }} />
            <PrimaryButton
              title="Add new course"
              variant="secondary"
              onPress={() => navigation.navigate('TaskAdminCourseForm', {})}
            />
          </>
        ) : null}

        {tab === 'trainers' ? (
          <>
            <Text style={styles.section}>Trainer directory</Text>
            <Text style={styles.lead}>
              Create trainer profiles with login credentials. Active trainers can be assigned to
              course requests.
            </Text>
            <PrimaryButton
              title="Open trainer directory"
              onPress={() => navigation.navigate('TaskAdminTrainers')}
            />
            <View style={{ height: 10 }} />
            <PrimaryButton
              title="Create trainer"
              variant="secondary"
              onPress={() => navigation.navigate('TaskAdminTrainerForm', {})}
            />
          </>
        ) : null}

        {tab === 'calendar' ? (
          <>
            <Text style={styles.section}>Approved training calendar</Text>
            <Text style={styles.lead}>
              Clear list of approved college trainings across institutions.
            </Text>
            {calendar.length === 0 ? (
              <Text style={styles.empty}>No approved calendar sessions yet.</Text>
            ) : (
              calendar.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.calCard}
                  onPress={() =>
                    navigation.navigate('CourseRequestDetail', { requestId: item.id })
                  }
                >
                  <Text style={styles.name}>{item.courseName}</Text>
                  <Text style={styles.meta}>{item.collegeName}</Text>
                  <Text style={styles.dates}>
                    {item.startDate} – {item.endDate}
                  </Text>
                  <Text style={styles.meta}>
                    {item.branch} · Batch {item.batchSize}
                  </Text>
                  <Text style={styles.meta}>
                    Trainer: {item.trainerName || 'Not assigned yet'}
                  </Text>
                  <Text style={styles.cta}>
                    {item.trainerId ? 'Edit assignment →' : 'Assign trainer →'}
                  </Text>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {notifications.length > 0 && tab === 'actions' ? (
          <>
            <Text style={styles.section}>Notifications</Text>
            {notifications.slice(0, 4).map((n) => (
              <View key={n.id} style={styles.note}>
                <Text style={styles.noteTitle}>{n.title}</Text>
                <Text style={styles.meta}>{n.body}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </AdminShell>
  );
}

function ActionGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.actionGroup}>
      <View style={styles.actionHead}>
        <Text style={styles.actionTitle}>{title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function ActionRow({
  title,
  meta,
  badge,
  cta,
  onPress,
}: {
  title: string;
  meta: string;
  badge: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.name}>{title}</Text>
        <StatusBadge status={badge} />
      </View>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.cta}>{cta} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: { fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 4 },
  lead: { color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  empty: { color: colors.textMuted, marginBottom: 12 },
  caughtUp: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  caughtUpTitle: { fontWeight: '800', color: colors.success, marginBottom: 4 },
  caughtUpBody: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  actionGroup: { marginBottom: 16 },
  actionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionTitle: { fontWeight: '800', color: colors.primaryDark, fontSize: 14, flex: 1 },
  countPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  actionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cta: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  calCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  name: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  dates: { color: colors.text, fontWeight: '600', marginBottom: 2 },
  note: {
    backgroundColor: colors.warningSoft,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  noteTitle: { fontWeight: '700', color: colors.text, marginBottom: 2 },
});

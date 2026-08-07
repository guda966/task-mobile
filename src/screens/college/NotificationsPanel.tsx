import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  PanelPage,
  ResultBar,
} from '../../components/college/PanelChrome';
import { PrimaryButton } from '../../components/ui';
import { mockApi } from '../../services/mockApi';
import { colors } from '../../theme/colors';
import type { AppNotification, SessionUser } from '../../types/enrollment';

export function NotificationsPanel({
  user,
  enrollmentId,
  onChanged,
}: {
  user: SessionUser;
  enrollmentId: string;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await mockApi.getNotificationsFor({ ...user, enrollmentId }),
      );
    } finally {
      setLoading(false);
    }
  }, [user, enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markAllRead = async () => {
    await mockApi.markCollegeNotificationsRead(enrollmentId);
    await load();
    onChanged?.();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <PanelPage>
      <PanelHeader
        title="Alerts from TASK"
        subtitle="Simple updates about your college registration and course requests."
        action={
          unread > 0 ? (
            <PrimaryButton title="Mark all read" variant="secondary" onPress={markAllRead} />
          ) : undefined
        }
      />

      <ResultBar label="Messages" count={items.length} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title={loading ? 'Loading messages…' : 'No messages yet'}
            body="When TASK sends an update, it will appear here."
          />
        }
        renderItem={({ item }) => (
          <DataCard>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.read ? (
                <View style={styles.newPill}>
                  <Text style={styles.newText}>New</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.when}>
              {new Date(item.createdAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </DataCard>
        )}
      />
    </PanelPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  newPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  body: { color: colors.text, fontSize: 13, lineHeight: 20 },
  when: { marginTop: 8, color: colors.textMuted, fontSize: 11 },
});

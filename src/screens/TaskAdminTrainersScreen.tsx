import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { TRAINER_SKILL_OPTIONS } from '../constants/trainer';
import type { RootStackParamList } from '../navigation/types';
import { trainerApi } from '../services/trainerApi';
import { colors } from '../theme/colors';
import type { TrainerRecord } from '../types/trainer';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminTrainers'>;

export function TaskAdminTrainersScreen({ navigation }: Props) {
  const [items, setItems] = useState<TrainerRecord[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('pending');
  const [skill, setSkill] = useState('All');
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    await trainerApi.ensureDemoTrainer();
    setPendingCount(await trainerApi.countPending());
    setItems(await trainerApi.listTrainers({ query, status, skill }));
  }, [query, status, skill]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen
      title="Trainers"
      subtitle={
        pendingCount
          ? `${pendingCount} awaiting approval — only approved trainers can be assigned`
          : 'Only approved trainers can be assigned to courses'
      }
      showLogo={false}
    >
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search name, email, city…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        <DropdownField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'All', label: 'All' },
            { value: 'pending', label: 'Pending approval' },
            { value: 'active', label: 'Approved / active' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <DropdownField
          label="Skill / domain"
          value={skill}
          onChange={setSkill}
          options={[
            { value: 'All', label: 'All' },
            ...TRAINER_SKILL_OPTIONS.map((s) => ({ value: s, label: s })),
          ]}
        />
        <PrimaryButton
          title="Add authorised trainer"
          onPress={() => navigation.navigate('TaskAdminTrainerForm', {})}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No trainers in this filter. Self-registered trainers appear as Pending until you approve
            them.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('TaskAdminTrainerForm', { trainerId: item.id })
            }
          >
            <View style={styles.row}>
              <Text style={styles.name}>
                {item.firstName} {item.lastName}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>
              {item.city} · {item.mobile} · via {item.createdBy === 'self' ? 'self-registration' : 'admin'}
            </Text>
            <Text style={styles.skills}>{item.skills.join(' · ')}</Text>
            {item.resume ? <Text style={styles.meta}>Resume: {item.resume.fileName}</Text> : null}
            <Text style={styles.meta}>
              Certs {item.certificates.length} · Achievements {item.achievements.length}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingBottom: 8 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    marginBottom: 8,
  },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  empty: { color: colors.textMuted, marginTop: 20, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  name: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  skills: { marginTop: 6, color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
});

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
  const [status, setStatus] = useState('All');
  const [skill, setSkill] = useState('All');

  const load = useCallback(async () => {
    await trainerApi.ensureDemoTrainer();
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
      subtitle="TASK Admin creates trainers and shares login credentials with them"
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
            { value: 'active', label: 'Active' },
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
          title="Create trainer"
          onPress={() => navigation.navigate('TaskAdminTrainerForm', {})}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No trainers in this filter. Use Create trainer to add profiles and login credentials.
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
            <Text style={styles.meta}>
              {item.email} · {item.city} · {item.mobile}
            </Text>
            <Text style={styles.skills}>{item.skills.join(' · ')}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: 16, gap: 4 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontWeight: '800', color: colors.text, flex: 1 },
  meta: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  skills: { color: colors.primaryDark, marginTop: 4, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});

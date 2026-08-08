import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { REGIONAL_CENTERS } from '../constants/lookups';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { mockApi } from '../services/mockApi';
import { colors } from '../theme/colors';
import type { CollegeEnrollment } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminReview'>;

export function TaskAdminReviewScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [item, setItem] = useState<CollegeEnrollment | null>(null);
  const [regionalCenterId, setRegionalCenterId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const record = await mockApi.getEnrollment(route.params.enrollmentId);
    setItem(record);
    if (record?.regionalCenterId) setRegionalCenterId(record.regionalCenterId);
  }, [route.params.enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const approve = async () => {
    if (!item || !user) return;
    if (!regionalCenterId) {
      Alert.alert('Regional Centre required', 'Assign a Regional Centre before approval.');
      return;
    }
    try {
      setLoading(true);
      await mockApi.approveEnrollment(item.id, regionalCenterId, user.email);
      Alert.alert(
        'Approved',
        'College tenant activated, Regional Centre assigned, College Admin notified.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!item || !user) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Reason required', 'Provide a rejection reason for the College Admin.');
      return;
    }
    try {
      setLoading(true);
      await mockApi.rejectEnrollment(item.id, rejectionReason, user.email);
      Alert.alert('Rejected', 'College registration marked rejected and College Admin notified.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  if (!item) {
    return (
      <Screen title="Review College Registration">
        <Text style={styles.empty}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Review College Registration" subtitle={item.institutionName}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <StatusBadge status={item.status} />
          </View>
          <Detail label="Registration" value={item.registrationKind === 'RENEWAL' ? 'Renewal' : 'New'} />
          <Detail label="College" value={item.institutionName} />
          <Detail label="Type" value={item.institutionType} />
          <Detail label="Status / Type" value={`${item.collegeStatus} · ${item.collegeType}`} />
          <Detail label="Affiliation No." value={item.affiliationNumber} />
          <Detail label="University" value={item.affiliatedUniversity} />
          <Detail label="District" value={`${item.district} · PIN ${item.pinCode}`} />
          <Detail label="Address" value={item.address} />
          {item.societyName ? <Detail label="Society / Trust" value={item.societyName} /> : null}
          <Detail
            label="Contact"
            value={`${item.contactPersonName} (${item.contactDesignation})`}
          />
          <Detail label="Email" value={item.officialEmail} />
          <Detail label="Mobile" value={item.officialMobile} />
          <Detail
            label="Registration Fee"
            value={`₹ ${item.registrationFee.toLocaleString('en-IN')}`}
          />
        </View>

        {item.status === 'pending' ? (
          <>
            <DropdownField
              label="Assign Regional Centre"
              required
              placeholder="Select regional centre"
              options={REGIONAL_CENTERS.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.district}`,
              }))}
              value={regionalCenterId}
              onChange={setRegionalCenterId}
            />
            <PrimaryButton
              title={loading ? 'Working…' : 'Approve & Activate'}
              onPress={approve}
              disabled={loading}
            />
            <Text style={styles.rejectLabel}>Or reject with reason</Text>
            <TextInput
              style={styles.reason}
              multiline
              placeholder="Rejection reason (sent to College Admin)"
              placeholderTextColor={colors.textMuted}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <PrimaryButton
              title="Reject Application"
              variant="danger"
              onPress={reject}
              disabled={loading}
            />
          </>
        ) : (
          <View style={styles.card}>
            {item.status === 'approved' ? (
              <Text style={styles.success}>
                Approved · {item.regionalCenterName}
              </Text>
            ) : (
              <Text style={styles.danger}>Rejected · {item.rejectionReason}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  empty: { color: colors.textMuted, padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { fontWeight: '700', color: colors.text },
  detail: { marginBottom: 8 },
  detailLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  detailValue: { color: colors.text, fontSize: 14 },
  rejectLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontWeight: '700',
    color: colors.text,
  },
  reason: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.text,
    marginBottom: 10,
  },
  success: { color: colors.success, fontWeight: '700' },
  danger: { color: colors.danger, fontWeight: '700' },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CorporateHome'>;

export function CorporateHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <Screen
      title="Corporate Portal"
      subtitle={user?.name ? `Welcome, ${user.name}` : 'Corporate partnership desk'}
    >
      <View style={styles.body}>
        <Text style={styles.lead}>
          Your corporate registration is active in this demo. Partnership programmes, campus drives,
          and hiring requests will appear here.
        </Text>
        <PrimaryButton
          title="Sign out"
          variant="secondary"
          onPress={async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 24 },
  lead: { color: colors.text, fontSize: 14, lineHeight: 22 },
});

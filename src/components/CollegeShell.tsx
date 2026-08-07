import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { TaskLogo } from './ui';
import { colors } from '../theme/colors';

export type CollegeMenuKey =
  | 'overview'
  | 'students'
  | 'courses'
  | 'requests'
  | 'calendar'
  | 'progress'
  | 'reports'
  | 'renewal';

const MENU: { key: CollegeMenuKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'students', label: 'Students' },
  { key: 'courses', label: 'Courses' },
  { key: 'requests', label: 'Request for a Course' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'progress', label: 'Batch Progress' },
  { key: 'reports', label: 'Reports' },
  { key: 'renewal', label: 'College Renewal/Payment' },
];

export function CollegeShell({
  collegeName,
  active,
  onChange,
  onSignOut,
  children,
}: {
  collegeName: string;
  active: CollegeMenuKey;
  onChange: (key: CollegeMenuKey) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const sideLayout = width >= 900;

  const menu = (
    <View style={[styles.sidebar, sideLayout ? styles.sidebarWide : styles.sidebarTop]}>
      <View style={styles.brand}>
        <TaskLogo size={42} />
        {!sideLayout ? null : <Text style={styles.brandText}>TASK College</Text>}
      </View>
      <ScrollView
        horizontal={!sideLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sideLayout ? undefined : styles.menuRow}
      >
        {MENU.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[
                styles.menuItem,
                sideLayout && styles.menuItemSide,
                isActive && styles.menuItemActive,
              ]}
            >
              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.root, sideLayout && styles.rootRow]}>
      {menu}
      <View style={styles.main}>
        <View style={styles.topBar}>
          <Text style={styles.collegeName} numberOfLines={1}>
            {collegeName}
          </Text>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  rootRow: { flexDirection: 'row' },
  sidebar: {
    backgroundColor: '#EEF2F3',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  sidebarWide: { width: 240 },
  sidebarTop: { borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { alignItems: 'center', marginBottom: 12, gap: 6 },
  brandText: { fontWeight: '700', color: colors.primaryDark, fontSize: 13 },
  menuRow: { gap: 8, paddingBottom: 8 },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemSide: { marginBottom: 6 },
  menuItemActive: { backgroundColor: colors.primary },
  menuText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  menuTextActive: { color: colors.white },
  signOut: { marginTop: 8, padding: 10 },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  main: { flex: 1 },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  collegeName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'right',
  },
  content: { flex: 1 },
});

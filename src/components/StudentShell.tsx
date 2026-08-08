import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { TaskLogo } from './ui';
import { BellIconButton, ShellNavCluster } from './NavIconButton';
import { colors } from '../theme/colors';

export type StudentMenuKey = 'home' | 'alerts' | 'trainings' | 'profile';

const MENU: { key: StudentMenuKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'trainings', label: 'Trainings' },
  { key: 'profile', label: 'Profile' },
];

export function StudentShell({
  studentName,
  active,
  onChange,
  onSignOut,
  onBack,
  onHome,
  unreadCount = 0,
  children,
}: {
  studentName: string;
  active: StudentMenuKey;
  onChange: (key: StudentMenuKey) => void;
  onSignOut: () => void;
  onBack?: () => void;
  onHome?: () => void;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const sideLayout = width >= 900;
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerWidth = Math.min(300, Math.round(width * 0.86));

  useEffect(() => {
    if (sideLayout) setMenuOpen(false);
  }, [sideLayout]);

  const selectMenu = (key: StudentMenuKey) => {
    onChange(key);
    setMenuOpen(false);
  };

  const menuItems = (inDrawer: boolean) =>
    MENU.map((item) => {
      const isActive = item.key === active;
      const showBadge = item.key === 'alerts' && unreadCount > 0;
      return (
        <Pressable
          key={item.key}
          onPress={() => (inDrawer ? selectMenu(item.key) : onChange(item.key))}
          style={[styles.menuItem, isActive && styles.menuItemActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
          {showBadge ? (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      );
    });

  if (sideLayout) {
    return (
      <View style={[styles.root, styles.rootRow]}>
        <View style={[styles.sidebar, styles.sidebarWide]}>
          <View style={styles.brandSide}>
            <TaskLogo size={42} />
            <Text style={styles.brandText}>TASK Student</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.sideScroll}>
            {menuItems(false)}
          </ScrollView>
          <Pressable onPress={onSignOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.main}>
          <View style={styles.topBar}>
            <ShellNavCluster onBack={onBack} onHome={onHome} />
            <BellIconButton unreadCount={unreadCount} onPress={() => onChange('alerts')} />
            <Text style={styles.studentName} numberOfLines={1}>
              {studentName}
            </Text>
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    );
  }

  const activeLabel = MENU.find((m) => m.key === active)?.label || 'Menu';

  return (
    <View style={styles.root}>
      <View style={styles.mobileHeader}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          {unreadCount > 0 ? <View style={styles.menuDot} /> : null}
        </Pressable>

        <View style={styles.mobileBrand}>
          <TaskLogo size={36} />
          <View style={styles.mobileBrandText}>
            <Text style={styles.mobileTitle} numberOfLines={1}>
              TASK Student
            </Text>
            <Text style={styles.mobileSection} numberOfLines={1}>
              {activeLabel}
            </Text>
          </View>
        </View>

        <BellIconButton unreadCount={unreadCount} onPress={() => onChange('alerts')} />
        <ShellNavCluster onBack={onBack} onHome={onHome} />
      </View>

      <View style={styles.content}>{children}</View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.drawerRoot}>
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          <View style={[styles.drawer, { width: drawerWidth }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandSide}>
                <TaskLogo size={40} />
                <Text style={styles.brandText}>TASK Student</Text>
              </View>
              <Pressable
                onPress={() => setMenuOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.drawerName} numberOfLines={2}>
              {studentName}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerMenu}>
              {menuItems(true)}
            </ScrollView>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              style={styles.signOut}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  sideScroll: { flex: 1 },
  brandSide: { alignItems: 'center', marginBottom: 12, gap: 6 },
  brandText: { fontWeight: '700', color: colors.primaryDark, fontSize: 13 },
  menuItem: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  menuItemActive: { backgroundColor: colors.primary },
  menuText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  menuTextActive: { color: colors.white },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  signOut: { marginTop: 8, padding: 10 },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  main: { flex: 1 },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentName: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1, textAlign: 'right' },
  content: { flex: 1 },
  mobileHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  menuDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  burgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primaryDark,
  },
  mobileBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  mobileBrandText: { flex: 1, minWidth: 0 },
  mobileTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  mobileSection: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(15, 35, 35, 0.45)' },
  drawer: {
    backgroundColor: '#EEF2F3',
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 18,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  drawerName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  drawerMenu: { paddingBottom: 12 },
});

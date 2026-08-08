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
import { ShellNavCluster } from './NavIconButton';
import { TaskLogo } from './ui';
import { colors } from '../theme/colors';

export type RcMenuKey = 'home' | 'members' | 'sessions' | 'profile';

const MENU: { key: RcMenuKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'members', label: 'Students' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'profile', label: 'Profile' },
];

export function RcShell({
  centreName,
  active,
  onChange,
  onSignOut,
  onBack,
  onHome,
  children,
}: {
  centreName: string;
  active: RcMenuKey;
  onChange: (key: RcMenuKey) => void;
  onSignOut: () => void;
  onBack?: () => void;
  onHome?: () => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const sideLayout = width >= 900;
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerWidth = Math.min(300, Math.round(width * 0.86));

  useEffect(() => {
    if (sideLayout) setMenuOpen(false);
  }, [sideLayout]);

  const selectMenu = (key: RcMenuKey) => {
    onChange(key);
    setMenuOpen(false);
  };

  const menuItems = (inDrawer: boolean) =>
    MENU.map((item) => {
      const isActive = item.key === active;
      return (
        <Pressable
          key={item.key}
          onPress={() => (inDrawer ? selectMenu(item.key) : onChange(item.key))}
          style={[styles.menuItem, isActive && styles.menuItemActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
        </Pressable>
      );
    });

  if (sideLayout) {
    return (
      <View style={[styles.root, styles.rootRow]}>
        <View style={[styles.sidebar, styles.sidebarWide]}>
          <View style={styles.brandSide}>
            <TaskLogo size={42} />
            <Text style={styles.brandText}>TASK Regional Centre</Text>
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
            <Text style={styles.centreName} numberOfLines={1}>
              {centreName}
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
        </Pressable>
        <View style={styles.mobileBrand}>
          <TaskLogo size={36} />
          <View style={styles.mobileBrandText}>
            <Text style={styles.mobileTitle} numberOfLines={1}>
              Regional Centre
            </Text>
            <Text style={styles.mobileSection} numberOfLines={1}>
              {activeLabel}
            </Text>
          </View>
        </View>
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
                <Text style={styles.brandText}>TASK RC</Text>
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
              {centreName}
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
  brandText: { fontWeight: '700', color: colors.primaryDark, fontSize: 13, textAlign: 'center' },
  menuItem: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: { backgroundColor: colors.primary },
  menuText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  menuTextActive: { color: colors.white },
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
  centreName: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  burgerLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.primaryDark },
  mobileBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  mobileBrandText: { flex: 1, minWidth: 0 },
  mobileTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  mobileSection: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(15, 35, 35, 0.45)' },
  drawer: {
    backgroundColor: colors.surface,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
  drawerName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  drawerMenu: { paddingBottom: 12 },
});

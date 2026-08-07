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
import { colors } from '../theme/colors';

export type CollegeMenuKey =
  | 'overview'
  | 'messages'
  | 'students'
  | 'courses'
  | 'requests'
  | 'calendar'
  | 'progress'
  | 'reports'
  | 'renewal';

const MENU: { key: CollegeMenuKey; label: string }[] = [
  { key: 'overview', label: 'Home' },
  { key: 'messages', label: 'Messages' },
  { key: 'students', label: 'Students' },
  { key: 'courses', label: 'Courses' },
  { key: 'requests', label: 'My requests' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'progress', label: 'Progress' },
  { key: 'reports', label: 'Reports' },
  { key: 'renewal', label: 'Renewal' },
];

export function CollegeShell({
  collegeName,
  active,
  onChange,
  onSignOut,
  unreadCount = 0,
  children,
}: {
  collegeName: string;
  active: CollegeMenuKey;
  onChange: (key: CollegeMenuKey) => void;
  onSignOut: () => void;
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

  const selectMenu = (key: CollegeMenuKey) => {
    onChange(key);
    setMenuOpen(false);
  };

  const menuItems = (inDrawer: boolean) =>
    MENU.map((item) => {
      const isActive = item.key === active;
      const showBadge = item.key === 'messages' && unreadCount > 0;
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
            <View style={[styles.badge, isActive && styles.badgeOnActive]}>
              <Text style={[styles.badgeText, isActive && styles.badgeTextOnActive]}>
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
            <Text style={styles.brandText}>TASK College</Text>
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
            <Text style={styles.collegeName} numberOfLines={1}>
              {collegeName}
            </Text>
            <Pressable
              onPress={() => onChange('messages')}
              style={styles.topMsgBtn}
              accessibilityRole="button"
              accessibilityLabel="Open messages"
            >
              <Text style={styles.topMsgText}>Messages</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
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
              TASK College
            </Text>
            <Text style={styles.mobileSection} numberOfLines={1}>
              {activeLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => onChange('messages')}
          style={styles.mobileMsgBtn}
          accessibilityRole="button"
          accessibilityLabel="Open messages"
        >
          <Text style={styles.mobileMsgText}>Msgs</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.collegeBanner}>
        <Text style={styles.collegeBannerText} numberOfLines={1}>
          {collegeName}
        </Text>
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
                <Text style={styles.brandText}>TASK College</Text>
              </View>
              <Pressable
                onPress={() => setMenuOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.drawerCollege} numberOfLines={2}>
              {collegeName}
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
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOnActive: { backgroundColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  badgeTextOnActive: { color: colors.primary },
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
    justifyContent: 'space-between',
    gap: 12,
  },
  collegeName: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  topMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  topMsgText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
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
  mobileTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  mobileSection: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  mobileMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  mobileMsgText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  collegeBanner: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  collegeBannerText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  drawerRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 35, 0.45)',
  },
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
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  drawerCollege: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  drawerMenu: {
    paddingBottom: 12,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';

type Tone = 'onPrimary' | 'muted';

/** Compact header / shell nav control with a clear icon. */
export function NavIconButton({
  name,
  label,
  onPress,
  tone = 'onPrimary',
  size = 20,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** onPrimary = white on green header; muted = dark on light shell chrome */
  tone?: Tone;
  size?: number;
}) {
  const onPrimary = tone === 'onPrimary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        onPrimary ? styles.btnOnPrimary : styles.btnMuted,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons
        name={name}
        size={size}
        color={onPrimary ? colors.white : colors.primaryDark}
      />
    </Pressable>
  );
}

export function ShellNavCluster({
  onBack,
  onHome,
}: {
  onBack?: () => void;
  onHome?: () => void;
}) {
  if (!onBack && !onHome) return null;
  return (
    <View style={styles.cluster}>
      {onBack ? (
        <NavIconButton
          name="chevron-back"
          label="Back"
          onPress={onBack}
          tone="muted"
        />
      ) : null}
      {onHome ? (
        <NavIconButton name="home-outline" label="Home" onPress={onHome} tone="muted" />
      ) : null}
    </View>
  );
}

/** Alerts / notifications control — matches shell nav button chrome. */
export function BellIconButton({
  unreadCount,
  onPress,
}: {
  unreadCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, styles.btnMuted, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `Alerts, ${unreadCount} unread` : 'Alerts'
      }
      hitSlop={8}
    >
      <Ionicons
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
        size={20}
        color={colors.primaryDark}
      />
      {unreadCount > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOnPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  btnMuted: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  cluster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  countText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** Compact header / shell nav control with a clear symbol. */
export function NavIconButton({
  symbol,
  label,
  onPress,
  tone = 'onPrimary',
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  /** onPrimary = white on green header; muted = dark on light shell chrome */
  tone?: 'onPrimary' | 'muted';
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
      <Text style={[styles.symbol, onPrimary ? styles.symbolOnPrimary : styles.symbolMuted]}>
        {symbol}
      </Text>
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
        <NavIconButton symbol="←" label="Back" onPress={onBack} tone="muted" />
      ) : null}
      {onHome ? (
        <NavIconButton symbol="⌂" label="Home" onPress={onHome} tone="muted" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
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
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  symbolOnPrimary: { color: colors.white },
  symbolMuted: { color: colors.primaryDark },
  cluster: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

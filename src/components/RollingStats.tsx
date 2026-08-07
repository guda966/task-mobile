import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type StatDef = {
  /** Target numeric value used for the roll animation. */
  target: number;
  /** Optional decimals (e.g. 9.84). */
  decimals?: number;
  /** Suffix shown after the number (e.g. L+, +). */
  suffix?: string;
  label: string;
};

export const ROLLING_STATS: StatDef[] = [
  { target: 9.84, decimals: 2, suffix: 'L+', label: 'Students trained' },
  { target: 761, label: 'Registered colleges' },
  { target: 18650, suffix: '+', label: 'Faculty trained' },
  { target: 35000, suffix: '+', label: 'Placements facilitated' },
];

function formatValue(value: number, decimals = 0): string {
  if (decimals > 0) return value.toFixed(decimals);
  return Math.round(value).toLocaleString('en-IN');
}

function RollingStatCard({ stat }: { stat: StatDef }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    progress.setValue(0);
    const id = progress.addListener(({ value }) => {
      setDisplay(formatValue(value, stat.decimals ?? 0));
    });
    const anim = Animated.timing(progress, {
      toValue: stat.target,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      progress.removeListener(id);
      anim.stop();
    };
  }, [progress, stat.decimals, stat.target]);

  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {display}
        {stat.suffix ?? ''}
      </Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );
}

export function RollingStats({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
      {ROLLING_STATS.map((stat) => (
        <RollingStatCard key={stat.label} stat={stat} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statsRowCompact: {
    flexWrap: 'wrap',
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 148,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 22,
  },
  statLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

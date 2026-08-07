import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function ProgressBar({
  value,
  max = 100,
  color = colors.primary,
  height = 10,
  showLabel = true,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { height }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height }]} />
      </View>
      {showLabel ? <Text style={styles.progressLabel}>{pct}%</Text> : null}
    </View>
  );
}

export function HorizontalBars({
  items,
  maxValue,
}: {
  items: { label: string; value: number; color?: string; subLabel?: string }[];
  maxValue?: number;
}) {
  const peak = maxValue ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.bars}>
      {items.map((item) => {
        const pct = Math.max(4, Math.round((item.value / peak) * 100));
        return (
          <View key={item.label} style={styles.barRow}>
            <View style={styles.barMeta}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.barValue}>
                {item.value}
                {item.subLabel ? ` · ${item.subLabel}` : ''}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: item.color || colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function StackedLegend({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View>
      <View style={styles.stackTrack}>
        {segments.map((seg) => {
          const width = Math.max(seg.value > 0 ? 6 : 0, (seg.value / total) * 100);
          if (width <= 0) return null;
          return (
            <View
              key={seg.label}
              style={{ width: `${width}%`, backgroundColor: seg.color, height: 16 }}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendText}>
              {seg.label}: {seg.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1,
    backgroundColor: '#E8EEEF',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { borderRadius: 999 },
  progressLabel: { width: 40, textAlign: 'right', color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  bars: { gap: 12 },
  barRow: { gap: 4 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barLabel: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  barValue: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  barTrack: {
    height: 12,
    backgroundColor: '#E8EEEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: { height: 12, borderRadius: 8 },
  stackTrack: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#E8EEEF',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});

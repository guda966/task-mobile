import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';

export function PanelPage({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.page, style]}>{children}</View>;
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < 720;

  return (
    <View style={[styles.header, stacked && styles.headerStacked]}>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={[styles.headerAction, stacked && styles.headerActionFull]}>{action}</View> : null}
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onSubmit?: () => void;
}) {
  return (
    <TextInput
      style={styles.search}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      onSubmitEditing={onSubmit}
      autoCapitalize="none"
      clearButtonMode="while-editing"
    />
  );
}

export function FilterGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const cols = width >= 960 ? 3 : width >= 640 ? 2 : 1;
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.filterGrid}>
      {items.map((child, index) => (
        <View
          key={index}
          style={[
            styles.filterCell,
            { width: cols === 1 ? '100%' : cols === 2 ? '48.5%' : '31.5%' },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export function ResultBar({
  label,
  count,
  trailing,
}: {
  label: string;
  count: number;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.resultBar}>
      <Text style={styles.resultText}>
        {label}: <Text style={styles.resultCount}>{count}</Text>
      </Text>
      {trailing}
    </View>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.tabs}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function DataCard({
  children,
  onPress,
  accent,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accent?: boolean;
}) {
  const content = (
    <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function StatTiles({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : width >= 600 ? 2 : 2;

  return (
    <View style={styles.stats}>
      {items.map((item) => (
        <View key={item.label} style={[styles.statTile, { width: cols === 4 ? '23.5%' : '48%' }]}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
          {item.hint ? <Text style={styles.statHint}>{item.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerStacked: {
    flexDirection: 'column',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerAction: {
    minWidth: 160,
  },
  headerActionFull: {
    width: '100%',
    minWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  filterCell: {
    minWidth: 140,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    gap: 10,
  },
  resultText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  resultCount: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.white,
  },
  empty: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 20,
    marginTop: 4,
  },
  emptyTitle: {
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 6,
    fontSize: 15,
  },
  emptyBody: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardAccent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statLabel: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  statHint: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
});

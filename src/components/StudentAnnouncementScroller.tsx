import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { STUDENT_ANNOUNCEMENTS } from '../constants/studentAnnouncements';
import { colors } from '../theme/colors';

const ITEM_HEIGHT = 40;

/** Single-line horizontal-feel vertical scroller for TASK programme updates. */
export function StudentAnnouncementScroller() {
  const translateY = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const items = STUDENT_ANNOUNCEMENTS.map((a) => `${a.title}: ${a.body}`);
  const loopItems = [...items, items[0]];

  useEffect(() => {
    translateY.setValue(0);
    const distance = ITEM_HEIGHT * items.length;
    const anim = Animated.loop(
      Animated.timing(translateY, {
        toValue: -distance,
        duration: Math.max(16000, items.length * 4000),
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    anim.start();
    return () => {
      anim.stop();
      translateY.stopAnimation();
    };
  }, [items.length, translateY, useNativeDriver]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>TASK updates</Text>
      <View style={styles.ticker}>
        <View style={styles.track}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            {loopItems.map((item, index) => (
              <View key={`${index}-${item.slice(0, 18)}`} style={styles.row}>
                <Text style={styles.dot}>●</Text>
                <Text style={styles.text} numberOfLines={2}>
                  {item}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  eyebrow: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  ticker: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDCDC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  track: {
    height: ITEM_HEIGHT,
    overflow: 'hidden',
  },
  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { color: colors.primary, fontSize: 8 },
  text: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});

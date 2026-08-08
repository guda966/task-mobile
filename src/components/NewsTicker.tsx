import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export const NEWS_ITEMS = [
  'Students can join any of 16 TASK Regional Centres for ₹599 (valid 6 months) to attend RC courses and services.',
  'College registrations are open for the current academic cycle.',
  'Students from TASK-approved colleges can browse and join training batches.',
  'Regional Centre sessions appear under Student → Trainings → RC after membership is active.',
  'Certificates require minimum 75% attendance and completed assignments.',
  'Skill offerings cover Engineering, Degree, Pharmacy, Polytechnic, and PG programmes.',
];

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;

export function NewsTicker() {
  const translateY = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const loopItems = [...NEWS_ITEMS, ...NEWS_ITEMS.slice(0, VISIBLE_ROWS)];

  useEffect(() => {
    translateY.setValue(0);
    const distance = ITEM_HEIGHT * NEWS_ITEMS.length;
    const anim = Animated.loop(
      Animated.timing(translateY, {
        toValue: -distance,
        duration: Math.max(14000, NEWS_ITEMS.length * 3200),
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    anim.start();
    return () => {
      anim.stop();
      translateY.stopAnimation();
    };
  }, [translateY, useNativeDriver]);

  return (
    <View style={styles.ticker}>
      <View style={styles.tickerTrack}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {loopItems.map((item, index) => (
            <View key={`${index}-${item.slice(0, 12)}`} style={styles.tickerItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.tickerText} numberOfLines={2}>
                {item}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticker: {
    width: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  tickerTrack: {
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    overflow: 'hidden',
  },
  tickerItem: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  bullet: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  tickerText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

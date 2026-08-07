import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const NEWS_ITEMS = [
  'College registrations are open for the current academic cycle.',
  'Students from TASK-approved colleges can browse and join training batches.',
  'Trainers may apply online; TASK Admin approval is required before assignment.',
  'Certificates require minimum 75% attendance and completed assignments.',
  'Skill offerings cover Engineering, Degree, Pharmacy, Polytechnic, and PG programmes.',
];

const ITEM_HEIGHT = 36;

export function NewsTicker() {
  const translateY = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const loopItems = [...NEWS_ITEMS, NEWS_ITEMS[0]];

  useEffect(() => {
    translateY.setValue(0);
    const step = Animated.sequence([
      Animated.delay(2200),
      Animated.timing(translateY, {
        toValue: -ITEM_HEIGHT * NEWS_ITEMS.length,
        duration: NEWS_ITEMS.length * 2600,
        easing: Easing.linear,
        useNativeDriver,
      }),
    ]);
    const anim = Animated.loop(step);
    anim.start();
    return () => {
      anim.stop();
      translateY.stopAnimation();
    };
  }, [translateY, useNativeDriver]);

  return (
    <View style={styles.ticker}>
      <Text style={styles.tickerLabel}>Updates</Text>
      <View style={styles.tickerTrack}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {loopItems.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.tickerItem}>
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
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  tickerLabel: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tickerTrack: {
    flex: 1,
    height: ITEM_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  tickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingRight: 4,
  },
  tickerText: {
    color: '#E8F6F6',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

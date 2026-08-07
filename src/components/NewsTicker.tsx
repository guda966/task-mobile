import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';

const NEWS_ITEMS = [
  'College registrations are open for the current academic cycle.',
  'Students from TASK-approved colleges can browse and join training batches.',
  'Trainers may apply online; TASK Admin approval is required before assignment.',
  'Certificates require minimum 75% attendance and completed assignments.',
];

export function NewsTicker() {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const message = NEWS_ITEMS.join('     •     ');

  useEffect(() => {
    if (textWidth <= 0) return;
    translateX.setValue(width);
    const distance = textWidth + width;
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: Math.max(18000, distance * 18),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [textWidth, width, translateX]);

  return (
    <View style={styles.ticker}>
      <Text style={styles.tickerLabel}>Updates</Text>
      <View style={styles.tickerTrack}>
        <Animated.Text
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          style={[styles.tickerText, { transform: [{ translateX }] }]}
          numberOfLines={1}
        >
          {message}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticker: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  tickerTrack: {
    flex: 1,
    overflow: 'hidden',
    height: 22,
    justifyContent: 'center',
  },
  tickerText: {
    position: 'absolute',
    color: '#E8F6F6',
    fontSize: 13,
    fontWeight: '600',
  },
});

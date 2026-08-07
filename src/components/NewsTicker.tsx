import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';

const NEWS_ITEMS = [
  'College registrations are open for the current academic cycle.',
  'Students from TASK-approved colleges can browse and join training batches.',
  'Trainers may apply online; TASK Admin approval is required before assignment.',
  'Certificates require minimum 75% attendance and completed assignments.',
];

export function NewsTicker() {
  const { width: windowWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const message = NEWS_ITEMS.join('     •     ');
  const gap = 48;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (textWidth <= 0 || trackWidth <= 0) return;

    const travel = textWidth + gap;
    translateX.setValue(0);

    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -travel,
        duration: Math.max(14000, travel * 25),
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    anim.start();
    return () => {
      anim.stop();
      translateX.stopAnimation();
    };
  }, [textWidth, trackWidth, windowWidth, translateX, useNativeDriver]);

  return (
    <View style={styles.ticker}>
      <Text style={styles.tickerLabel}>Updates</Text>
      <View
        style={styles.tickerTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[styles.tickerRow, { transform: [{ translateX }] }]}
        >
          <Text
            style={styles.tickerText}
            numberOfLines={1}
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          >
            {message}
          </Text>
          <Text style={[styles.tickerText, { marginLeft: gap }]} numberOfLines={1}>
            {message}
          </Text>
        </Animated.View>
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
  tickerRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  tickerText: {
    color: '#E8F6F6',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
    ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null),
  },
});

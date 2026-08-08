import type { RefObject } from 'react';
import { Platform, type ScrollView } from 'react-native';

/** Reset window + optional ScrollView so each page/step opens from the top. */
export function scrollToTop(scrollRef?: RefObject<ScrollView | null>) {
  scrollRef?.current?.scrollTo({ y: 0, animated: false });
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.scrollTo(0, 0);
    document.documentElement?.scrollTo?.(0, 0);
    document.body?.scrollTo?.(0, 0);
  }
}

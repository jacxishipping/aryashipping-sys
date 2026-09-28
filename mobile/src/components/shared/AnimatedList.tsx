import React from 'react';
import { FlatList, FlatListProps } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface AnimatedListProps<T> extends FlatListProps<T> {
  staggerDelay?: number;
}

export function AnimatedList<T>({
  data,
  renderItem,
  staggerDelay = 50,
  ...props
}: AnimatedListProps<T>) {
  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInUp.delay(index * staggerDelay).springify()}>
          {renderItem?.({ item, index, separators: {} as any })}
        </Animated.View>
      )}
      {...props}
    />
  );
}

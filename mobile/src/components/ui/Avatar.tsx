import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { useAppTheme } from '../../hooks/useAppTheme';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 40 }) => {
  const { colors } = useAppTheme();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accent,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
              color: colors.textPrimary,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: Typography.fontWeight.bold,
  },
});

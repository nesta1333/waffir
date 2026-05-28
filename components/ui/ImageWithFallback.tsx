import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ImageWithFallbackProps {
  uri?: string;
  style?: ViewStyle | ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** Background colour of the placeholder card */
  placeholderBg?: string;
}

/**
 * Drop-in replacement for <Image> that shows an elegant placeholder
 * when the URI is empty or the image fails to load.
 */
export default function ImageWithFallback({
  uri,
  style,
  resizeMode = 'cover',
  placeholderBg,
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return (
      <View
        style={[
          styles.placeholder,
          { backgroundColor: placeholderBg ?? Colors.bg.surfaceHigh },
          style as ViewStyle,
        ]}
      >
        <View style={styles.shimmerBlock} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as ImageStyle}
      resizeMode={resizeMode}
      onError={() => setErrored(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmerBlock: {
    width: '55%',
    height: '55%',
    borderRadius: 14,
    backgroundColor: 'rgba(207,188,255,0.06)',
  },
});

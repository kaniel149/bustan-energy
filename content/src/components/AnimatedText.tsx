import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts } from '../styles';

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: 'heading' | 'body';
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 48,
  color = colors.white,
  delay = 0,
  align = 'center',
  fontFamily = 'heading',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(springValue, [0, 1], [0, 1]);
  const translateY = interpolate(springValue, [0, 1], [30, 0]);

  return (
    <div
      style={{
        fontSize,
        fontWeight: fontFamily === 'heading' ? 700 : 400,
        fontFamily: fontFamily === 'heading' ? fonts.heading : fonts.body,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        textAlign: align,
      }}
    >
      {text}
    </div>
  );
};

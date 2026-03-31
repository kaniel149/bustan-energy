import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts } from '../styles';

interface StatCardProps {
  value: string;
  label: string;
  color?: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  color = colors.gold,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const scale = 0.9 + springValue * 0.1;
  const opacity = springValue;

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        backgroundColor: colors.card,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(232, 168, 32, 0.15)',
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          fontFamily: fonts.heading,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.gray,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
};

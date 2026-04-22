import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors } from '../styles';

interface GlassCardProps {
  children: React.ReactNode;
  width?: number;
  delay?: number;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  width = 800,
  delay = 0,
  padding = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const scale = 0.9 + springValue * 0.1; // 0.9 → 1.0
  const opacity = springValue; // 0 → 1

  return (
    <div
      style={{
        width,
        padding,
        backgroundColor: colors.card,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(232, 168, 32, 0.15)',
        borderRadius: 24,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts } from '../styles';

interface ProgressBarProps {
  progress: number;
  color?: string;
  label?: string;
  delay?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = colors.gold,
  label,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const animatedWidth = springValue * progress; // 0 → progress

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div
          style={{
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.white,
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${animatedWidth}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 8,
          }}
        />
      </div>
    </div>
  );
};

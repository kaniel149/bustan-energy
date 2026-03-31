import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts } from '../styles';

interface BrandFooterProps {
  tagline?: string;
  delay?: number;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({
  tagline = 'Solar Intelligence',
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

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 30,
        opacity: springValue,
      }}
    >
      {/* Gold separator line */}
      <div
        style={{
          width: 60,
          height: 2,
          backgroundColor: colors.gold,
          marginBottom: 16,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          fontSize: 24,
          fontFamily: fonts.heading,
          fontWeight: 700,
          color: colors.gold,
          letterSpacing: 2,
        }}
      >
        TM ENERGY
      </div>
      <div
        style={{
          fontSize: 16,
          fontFamily: fonts.body,
          color: colors.white,
          marginTop: 4,
          opacity: 0.8,
        }}
      >
        {tagline}
      </div>
    </div>
  );
};

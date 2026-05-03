import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { BrandFooter } from '../components/BrandFooter';
import { colors, fonts } from '../styles';

export const MythCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gold glow pulse on BUSTAN ENERGY text
  const pulsePhase = Math.sin((frame / 30) * Math.PI * 2) * 0.5 + 0.5;
  const glowIntensity = interpolate(pulsePhase, [0, 1], [30, 60]);
  const glowOpacity = interpolate(pulsePhase, [0, 1], [0.3, 0.6]);

  // BUSTAN ENERGY entrance
  const tmSpring = spring({
    frame: Math.max(0, frame - 45),
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const tmScale = interpolate(tmSpring, [0, 1], [0.7, 1]);
  const tmOpacity = tmSpring;

  return (
    <SceneWrapper>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Stop Guessing. */}
        <AnimatedText
          text="Stop Guessing."
          fontSize={48}
          color={colors.white}
          fontFamily="heading"
        />

        <div style={{ marginTop: 16 }}>
          <AnimatedText
            text="Start Saving."
            fontSize={48}
            color={colors.gold}
            fontFamily="heading"
            delay={20}
          />
        </div>

        {/* Gap */}
        <div style={{ height: 60 }} />

        {/* BUSTAN ENERGY with glow pulse */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.gold,
            letterSpacing: 4,
            textShadow: `0 0 ${glowIntensity}px rgba(232, 168, 32, ${glowOpacity})`,
            opacity: tmOpacity,
            transform: `scale(${tmScale})`,
          }}
        >
          BUSTAN ENERGY
        </div>

        <div style={{ marginTop: 16 }}>
          <AnimatedText
            text="energy-tm.com"
            fontSize={20}
            color={colors.gray}
            fontFamily="body"
            delay={60}
          />
        </div>

        {/* Brand footer */}
        <BrandFooter delay={30} />
      </div>
    </SceneWrapper>
  );
};

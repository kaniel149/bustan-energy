import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { BrandFooter } from '../components/BrandFooter';
import { colors, fonts } from '../styles';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gold glow pulse on TM ENERGY text
  const pulsePhase = Math.sin((frame / 30) * Math.PI * 2) * 0.5 + 0.5; // 0-1 oscillation
  const glowIntensity = interpolate(pulsePhase, [0, 1], [30, 60]);
  const glowOpacity = interpolate(pulsePhase, [0, 1], [0.3, 0.6]);

  // Entrance spring for main title
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.7, 1]);
  const titleOpacity = titleSpring;

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
        {/* TM ENERGY with glow pulse */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.gold,
            letterSpacing: 4,
            textShadow: `0 0 ${glowIntensity}px rgba(232, 168, 32, ${glowOpacity})`,
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            marginBottom: 30,
          }}
        >
          TM ENERGY
        </div>

        {/* Subtitle lines */}
        <AnimatedText
          text="Solar Intelligence for Koh Phangan"
          fontSize={28}
          color={colors.white}
          fontFamily="body"
          delay={15}
        />

        <div style={{ marginTop: 30 }}>
          <AnimatedText
            text="Free Roof Assessment"
            fontSize={24}
            color={colors.greenLight}
            fontFamily="body"
            delay={30}
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <AnimatedText
            text="energy-tm.com"
            fontSize={20}
            color={colors.gray}
            fontFamily="body"
            delay={45}
          />
        </div>

        {/* Brand footer */}
        <BrandFooter delay={30} />
      </div>
    </SceneWrapper>
  );
};

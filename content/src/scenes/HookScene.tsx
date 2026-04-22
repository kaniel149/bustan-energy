import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { BrandFooter } from '../components/BrandFooter';
import { colors, fonts } from '../styles';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated dollar signs
  const dollarSigns = ['$', '$', '$', '$', '$'];

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
        {/* Main title */}
        <AnimatedText
          text="3 Solar Myths"
          fontSize={56}
          color={colors.gold}
          fontFamily="heading"
        />

        <div style={{ marginTop: 16 }}>
          <AnimatedText
            text="Costing You Money"
            fontSize={40}
            color={colors.white}
            fontFamily="heading"
            delay={15}
          />
        </div>

        {/* Animated gold dollar signs */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
          }}
        >
          {dollarSigns.map((sign, i) => {
            const signDelay = 30 + i * 6;
            const adjustedFrame = Math.max(0, frame - signDelay);

            const signSpring = spring({
              frame: adjustedFrame,
              fps,
              config: { damping: 8, stiffness: 120 },
            });

            const opacity = interpolate(signSpring, [0, 1], [0, 1]);
            const translateY = interpolate(signSpring, [0, 1], [40, 0]);
            const scale = interpolate(signSpring, [0, 1], [0.5, 1]);

            // Floating animation after entrance
            const floatOffset =
              adjustedFrame > 15
                ? Math.sin(((adjustedFrame - 15) / 20) * Math.PI * 2 + i * 1.2) * 6
                : 0;

            return (
              <div
                key={i}
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  fontFamily: fonts.heading,
                  color: colors.gold,
                  opacity,
                  transform: `translateY(${translateY + floatOffset}px) scale(${scale})`,
                  textShadow: `0 0 20px rgba(232, 168, 32, 0.5)`,
                }}
              >
                {sign}
              </div>
            );
          })}
        </div>

        {/* Brand footer */}
        <BrandFooter delay={20} />
      </div>
    </SceneWrapper>
  );
};

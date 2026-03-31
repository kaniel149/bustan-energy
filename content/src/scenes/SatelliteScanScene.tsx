import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { BrandFooter } from '../components/BrandFooter';
import { colors } from '../styles';

export const SatelliteScanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Concentric radar rings ---
  const rings = [0, 1, 2, 3, 4];

  // --- Roof outline (appears at frame 90) ---
  const roofAppear = spring({
    frame: Math.max(0, frame - 90),
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // --- Scan lines (start at frame 150) ---
  const scanProgress = interpolate(frame, [150, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
        {/* Hook text */}
        <div style={{ position: 'absolute', top: 260 }}>
          <AnimatedText
            text="We scan your roof"
            fontSize={56}
            color={colors.gold}
            fontFamily="heading"
          />
          <AnimatedText
            text="from space"
            fontSize={56}
            color={colors.gold}
            fontFamily="heading"
            delay={10}
          />
        </div>

        {/* Radar / Satellite scan animation */}
        <div
          style={{
            position: 'relative',
            width: 500,
            height: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 80,
          }}
        >
          {/* Concentric expanding rings */}
          {rings.map((i) => {
            const ringDelay = i * 20;
            const cycleLength = 90; // frames per pulse cycle
            const adjustedFrame = Math.max(0, frame - ringDelay - 30);
            const cycleFrame = adjustedFrame % cycleLength;

            const ringScale = interpolate(cycleFrame, [0, cycleLength], [0.2 + i * 0.18, 1.0 + i * 0.18], {
              extrapolateRight: 'clamp',
            });

            const ringOpacity = interpolate(cycleFrame, [0, cycleLength * 0.6, cycleLength], [0.6 - i * 0.08, 0.4 - i * 0.06, 0], {
              extrapolateRight: 'clamp',
              extrapolateLeft: 'clamp',
            });

            const baseSize = 80 + i * 70;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: baseSize,
                  height: baseSize,
                  borderRadius: '50%',
                  border: `2px solid ${colors.gold}`,
                  opacity: Math.max(0, ringOpacity),
                  transform: `scale(${ringScale})`,
                }}
              />
            );
          })}

          {/* Center dot (satellite) */}
          <div
            style={{
              position: 'absolute',
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: colors.gold,
              boxShadow: `0 0 20px ${colors.gold}, 0 0 40px ${colors.gold}80`,
            }}
          />

          {/* Roof outline (appears at frame 90) */}
          <div
            style={{
              position: 'absolute',
              width: 260,
              height: 180,
              opacity: roofAppear,
              transform: `scale(${0.8 + roofAppear * 0.2})`,
            }}
          >
            {/* Roof shape using borders */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '130px solid transparent',
                borderRight: '130px solid transparent',
                borderBottom: `70px solid ${colors.gold}40`,
              }}
            />
            {/* Roof body */}
            <div
              style={{
                position: 'absolute',
                top: 68,
                left: 0,
                width: 260,
                height: 110,
                backgroundColor: `${colors.gold}20`,
                border: `1.5px solid ${colors.gold}60`,
                borderTop: 'none',
              }}
            />

            {/* Scan lines sweeping across the roof */}
            {[0, 1, 2, 3, 4].map((lineIndex) => {
              const lineY = 80 + lineIndex * 22;
              const lineDelay = lineIndex * 0.15;
              const lineProgress = interpolate(
                scanProgress,
                [lineDelay, Math.min(1, lineDelay + 0.6)],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              return (
                <div
                  key={lineIndex}
                  style={{
                    position: 'absolute',
                    top: lineY,
                    left: 10,
                    width: `${lineProgress * 240}px`,
                    height: 2,
                    background: `linear-gradient(90deg, ${colors.gold}00, ${colors.gold}cc, ${colors.gold}00)`,
                    opacity: lineProgress > 0 ? 0.8 : 0,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Brand footer */}
        <BrandFooter delay={20} />
      </div>
    </SceneWrapper>
  );
};

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { colors, fonts } from '../styles';

export const SavingsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Animated counter for "Before" bill ---
  const beforeSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  const beforeValue = Math.round(interpolate(beforeSpring, [0, 1], [0, 45000]));

  // --- Animated counter for "After" bill ---
  const afterSpring = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  const afterValue = Math.round(interpolate(afterSpring, [0, 1], [0, 8000]));

  // --- Bar chart widths ---
  const beforeBarWidth = interpolate(beforeSpring, [0, 1], [0, 100]);
  const afterBarWidth = interpolate(afterSpring, [0, 1], [0, 18]); // 8000/45000 ≈ 18%

  // --- Reduction text ---
  const reductionSpring = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const reductionOpacity = interpolate(reductionSpring, [0, 1], [0, 1]);
  const reductionScale = interpolate(reductionSpring, [0, 1], [0.8, 1]);

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
          padding: 60,
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 60 }}>
          <AnimatedText
            text="Your Savings"
            fontSize={40}
            color={colors.white}
            fontFamily="heading"
          />
        </div>

        {/* Before / After counters */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            width: 900,
            marginBottom: 50,
          }}
        >
          {/* Before */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatedText
              text="Before"
              fontSize={22}
              color={colors.gray}
              fontFamily="body"
              align="left"
              delay={10}
            />
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                fontFamily: fonts.heading,
                color: '#F87171', // red-ish for high bill
                lineHeight: 1,
              }}
            >
              ฿{beforeValue.toLocaleString()}
            </div>
            {/* Bar */}
            <div
              style={{
                width: '100%',
                height: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${beforeBarWidth}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #F87171, #EF4444)',
                  borderRadius: 12,
                }}
              />
            </div>
          </div>

          {/* After */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatedText
              text="After"
              fontSize={22}
              color={colors.gray}
              fontFamily="body"
              align="left"
              delay={35}
            />
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                fontFamily: fonts.heading,
                color: colors.greenLight,
                lineHeight: 1,
              }}
            >
              ฿{afterValue.toLocaleString()}
            </div>
            {/* Bar */}
            <div
              style={{
                width: '100%',
                height: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${afterBarWidth}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${colors.green}, ${colors.greenLight})`,
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        </div>

        {/* 82% reduction highlight */}
        <div
          style={{
            opacity: reductionOpacity,
            transform: `scale(${reductionScale})`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              fontFamily: fonts.heading,
              color: colors.gold,
              lineHeight: 1.1,
              textShadow: `0 0 40px ${colors.gold}60`,
            }}
          >
            82% reduction
          </div>
          <div
            style={{
              fontSize: 22,
              fontFamily: fonts.body,
              color: colors.gray,
              marginTop: 12,
            }}
          >
            in monthly electricity costs
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
};

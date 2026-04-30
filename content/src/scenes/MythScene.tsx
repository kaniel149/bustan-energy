import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';
import { BrandFooter } from '../components/BrandFooter';
import { colors, fonts } from '../styles';

interface MythSceneProps {
  mythNumber: number;
  myth: string;
  reality: string;
  stat?: string;
}

export const MythScene: React.FC<MythSceneProps> = ({
  mythNumber,
  myth,
  reality,
  stat,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const red = '#F87171';
  const green = '#22A06B';

  // --- Phase 1: "MYTH #N" label (frames 0-15) ---
  const mythLabelSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // --- Phase 2: Myth text + red X (frames 15-60) ---
  const mythTextSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // --- Phase 3: Strikethrough + "REALITY" label (frames 60-75) ---
  const strikeSpring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const strikeWidth = interpolate(strikeSpring, [0, 1], [0, 100]);

  const realityLabelSpring = spring({
    frame: Math.max(0, frame - 65),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // --- Phase 4: Reality text + green checkmark (frames 75-150) ---
  const realityTextSpring = spring({
    frame: Math.max(0, frame - 75),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // --- Phase 5: Stat highlight (frames 100-150) ---
  const statSpring = spring({
    frame: Math.max(0, frame - 100),
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const statScale = interpolate(statSpring, [0, 1], [0.6, 1]);
  const statOpacity = interpolate(statSpring, [0, 1], [0, 1]);

  // Myth text fade out when reality appears
  const mythFade = interpolate(frame, [60, 75], [1, 0.35], {
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
          padding: 60,
          position: 'relative',
        }}
      >
        {/* MYTH #N label */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: red,
            letterSpacing: 4,
            opacity: mythLabelSpring,
            transform: `translateY(${interpolate(mythLabelSpring, [0, 1], [30, 0])}px)`,
            marginBottom: 40,
          }}
        >
          MYTH #{mythNumber}
        </div>

        {/* Myth text with red X */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            opacity: mythTextSpring * mythFade,
            transform: `translateY(${interpolate(mythTextSpring, [0, 1], [30, 0])}px)`,
            width: 900,
            position: 'relative',
          }}
        >
          {/* Red X icon */}
          <div
            style={{
              fontSize: 48,
              color: red,
              fontWeight: 700,
              lineHeight: 1,
              flexShrink: 0,
              textShadow: `0 0 20px ${red}80`,
            }}
          >
            ✗
          </div>
          {/* Myth text */}
          <div
            style={{
              fontSize: 28,
              fontFamily: fonts.body,
              color: red,
              lineHeight: 1.4,
              textShadow: `0 0 30px ${red}30`,
              position: 'relative',
            }}
          >
            {myth}
            {/* Strikethrough line */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: `${strikeWidth}%`,
                height: 3,
                backgroundColor: red,
                opacity: 0.8,
              }}
            />
          </div>
        </div>

        {/* Divider space */}
        <div style={{ height: 50 }} />

        {/* REALITY label */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: green,
            letterSpacing: 4,
            opacity: realityLabelSpring,
            transform: `translateY(${interpolate(realityLabelSpring, [0, 1], [30, 0])}px)`,
            marginBottom: 30,
          }}
        >
          REALITY
        </div>

        {/* Reality text with green checkmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            opacity: realityTextSpring,
            transform: `translateY(${interpolate(realityTextSpring, [0, 1], [30, 0])}px)`,
            width: 900,
          }}
        >
          {/* Green checkmark */}
          <div
            style={{
              fontSize: 48,
              color: green,
              fontWeight: 700,
              lineHeight: 1,
              flexShrink: 0,
              textShadow: `0 0 20px ${green}80`,
            }}
          >
            ✓
          </div>
          {/* Reality text */}
          <div
            style={{
              fontSize: 24,
              fontFamily: fonts.body,
              color: colors.white,
              lineHeight: 1.5,
              textShadow: `0 0 30px ${green}20`,
            }}
          >
            {reality}
          </div>
        </div>

        {/* Stat highlight (optional) */}
        {stat && (
          <div
            style={{
              marginTop: 40,
              opacity: statOpacity,
              transform: `scale(${statScale})`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                fontFamily: fonts.heading,
                color: colors.gold,
                lineHeight: 1,
                textShadow: `0 0 40px ${colors.gold}60`,
              }}
            >
              {stat}
            </div>
          </div>
        )}

        {/* Brand footer */}
        <BrandFooter delay={10} />
      </div>
    </SceneWrapper>
  );
};

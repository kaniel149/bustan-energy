import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors } from '../styles';

interface SceneWrapperProps {
  children: React.ReactNode;
  bg?: string;
}

export const SceneWrapper: React.FC<SceneWrapperProps> = ({
  children,
  bg = colors.bg,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in over first 15 frames
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade out over last 15 frames
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
    }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: bg,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

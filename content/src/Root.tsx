import React from 'react';
import { Composition } from 'remotion';
import { SatelliteScanReel } from './videos/SatelliteScanReel';
import { SolarMythsReel } from './videos/SolarMythsReel';

export const Root: React.FC = () => {
  return (
    <>
      {/* Reels — 9:16 portrait, 30fps */}
      <Composition
        id="SatelliteScanReel"
        component={SatelliteScanReel}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SolarMythsReel"
        component={SolarMythsReel}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

import React from 'react';
import { Series } from 'remotion';
import { HookScene } from '../scenes/HookScene';
import { MythScene } from '../scenes/MythScene';
import { MythCTAScene } from '../scenes/MythCTAScene';

export const SolarMythsReel: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={90}>
      <HookScene />
    </Series.Sequence>
    <Series.Sequence durationInFrames={150}>
      <MythScene
        mythNumber={1}
        myth="Solar doesn't work in rainy season"
        reality="Thailand gets 1,600 hours of sun per year. Even in monsoon, panels produce 60-70% of peak output."
        stat="60-70%"
      />
    </Series.Sequence>
    <Series.Sequence durationInFrames={150}>
      <MythScene
        mythNumber={2}
        myth="Solar panels damage your roof"
        reality="Modern mounting systems actually protect your roof from direct sun and heat."
      />
    </Series.Sequence>
    <Series.Sequence durationInFrames={150}>
      <MythScene
        mythNumber={3}
        myth="The payback takes 10 years"
        reality="In Koh Phangan, average payback is 3-4 years. After that — free electricity."
        stat="3-4 yrs"
      />
    </Series.Sequence>
    <Series.Sequence durationInFrames={210}>
      <MythCTAScene />
    </Series.Sequence>
  </Series>
);

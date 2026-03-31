import React from 'react';
import { Series, staticFile, Audio } from 'remotion';
import { SatelliteScanScene } from '../scenes/SatelliteScanScene';
import { DataRevealScene } from '../scenes/DataRevealScene';
import { SavingsScene } from '../scenes/SavingsScene';
import { CTAScene } from '../scenes/CTAScene';

export const SatelliteScanReel: React.FC = () => (
  <>
    {/* Uncomment when voiceover is generated: */}
    {/* <Audio src={staticFile('audio/reel-01-voiceover.mp3')} /> */}
    <Series>
      <Series.Sequence durationInFrames={240}>
        <SatelliteScanScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <DataRevealScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <SavingsScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={180}>
        <CTAScene />
      </Series.Sequence>
    </Series>
  </>
);

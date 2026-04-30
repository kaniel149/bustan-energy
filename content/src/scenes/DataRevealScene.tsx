import React from 'react';
import { SceneWrapper } from '../components/SceneWrapper';
import { AnimatedText } from '../components/AnimatedText';
import { GlassCard } from '../components/GlassCard';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { colors } from '../styles';

export const DataRevealScene: React.FC = () => {
  const stats = [
    { value: '245 m²', label: 'Roof Area', color: colors.gold, delay: 20 },
    { value: '18°', label: 'Optimal Angle', color: colors.greenLight, delay: 30 },
    { value: '4%', label: 'Shade Factor', color: colors.gold, delay: 40 },
    { value: '38 kW', label: 'System Size', color: colors.greenLight, delay: 50 },
  ];

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
            text="Instant Roof Analysis"
            fontSize={40}
            color={colors.white}
            fontFamily="heading"
          />
        </div>

        {/* GlassCard with 2x2 grid of StatCards */}
        <GlassCard width={900} delay={10} padding={32}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
            }}
          >
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                value={stat.value}
                label={stat.label}
                color={stat.color}
                delay={stat.delay}
              />
            ))}
          </div>
        </GlassCard>

        {/* Progress bar */}
        <div style={{ width: 900, marginTop: 50 }}>
          <ProgressBar
            progress={94}
            color={colors.greenLight}
            label="Solar Potential — 94%"
            delay={60}
          />
        </div>
      </div>
    </SceneWrapper>
  );
};

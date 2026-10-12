'use client';

import { light } from '@/design/tokens';
import type { QualityPreset } from './quality';

/**
 * Iluminação noturna (estudo: fundo-vivo-e-3d):
 * - luz da janela fria e direcional (única que projeta sombra);
 * - luz hemisférica com a sombra em roxo, nunca preta;
 * - azul elétrico do gabinete e ciano do monitor como luzes de destaque.
 */
export function Lights({ preset }: { preset: QualityPreset }) {
  return (
    <>
      <hemisphereLight args={['#33416b', light.violet, 0.55]} />
      <directionalLight
        position={[-2.6, 2.6, 0.2]}
        color="#8fb4ff"
        intensity={1.3}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={8}
      />
      <pointLight position={[0.95, 0.4, -0.45]} color={light.electric} intensity={2.2} distance={2.6} decay={2} />
      <pointLight position={[0, 1.15, -0.5]} color={light.cyan} intensity={1.1} distance={2.2} decay={2} />
      <pointLight position={[1.2, 2.5, -0.9]} color={light.violet} intensity={1.6} distance={3.2} decay={2} />
    </>
  );
}

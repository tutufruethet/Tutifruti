'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { color } from '@/design/tokens';
import { usePageHidden } from '@/experience/browser';
import { useClientCapabilities } from '@/experience/capabilities';
import { shouldRoomHandleKey } from '@/os/keyboard/scope';
import { useSettingsStore } from '@/settings/store';
import { CameraRig } from './CameraRig';
import { DebugBridge } from './DebugBridge';
import { htmlLayerRef } from './html-layer';
import { CAMERA } from './layout';
import { Lights } from './Lights';
import { Monitor } from './Monitor';
import { PlaceholderRoom } from './PlaceholderRoom';
import { resolveQuality } from './quality';
import { useRoomStore } from './room-store';

const CAMERA_PROPS = {
  position: [...CAMERA.overview.position] as [number, number, number],
  fov: CAMERA.fov,
  near: 0.05,
  far: 30,
};

/** Teclas do quarto: F foca o monitor, Esc sai. Ignoradas quando vêm do OS. */
function useRoomKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldRoomHandleKey(event)) return;
      const key = event.key.toLowerCase();
      if (key === 'f') useRoomStore.getState().requestFocus();
      else if (key === 'escape') useRoomStore.getState().releaseFocus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

/**
 * Cena 3D. Carregada sob demanda (lazy) só quando o modo 3D é usado.
 * Renderiza sob demanda (`frameloop="demand"`): parada, a GPU descansa;
 * com a aba escondida, não renderiza nada.
 */
export default function Room3D() {
  const capabilities = useClientCapabilities();
  const qualitySetting = useSettingsStore((state) => state.settings.graphicsQuality);
  const preset = resolveQuality(qualitySetting, capabilities ?? { coarsePointer: false });
  const hidden = usePageHidden();
  useRoomKeys();

  return (
    <div className="relative h-full w-full">
      {/* Camada do DOM 3D (OS no monitor). Vem antes do canvas e fica acima dele. */}
      <div ref={htmlLayerRef} className="pointer-events-none absolute inset-0 z-[1]" />
      <Canvas
        // Antialias só vale na criação do contexto: trocar a qualidade recria o canvas.
        key={preset.level}
        data-quality={preset.level}
        frameloop={hidden ? 'never' : 'demand'}
        dpr={[1, preset.maxDpr]}
        shadows={preset.shadows}
        gl={{ antialias: preset.antialias, powerPreference: 'high-performance' }}
        camera={CAMERA_PROPS}
      >
        <color attach="background" args={[color.ink]} />
        <fog attach="fog" args={[color.ink, 4.5, 11]} />
        <Lights preset={preset} />
        <PlaceholderRoom />
        <Monitor />
        <CameraRig reducedMotion={capabilities?.reducedMotion ?? false} />
        <DebugBridge />
      </Canvas>
    </div>
  );
}

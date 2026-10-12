'use client';

import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';
import { color } from '@/design/tokens';
import { OsRoot } from '@/os/shell/OsRoot';
import { ShellProbe } from '@/os/shell/ShellProbe';
import { MONITOR_VIEWPORT, htmlDistanceFactor } from '@/os/shell/viewport';
import { htmlLayerRef } from './html-layer';
import { DESK, MONITOR } from './layout';
import { useRoomStore } from './room-store';

const BEZEL = 0.015;
const DEPTH = 0.03;
const DISTANCE_FACTOR =
  MONITOR_VIEWPORT.mode === 'fixed' ? htmlDistanceFactor(MONITOR.screenWidth, MONITOR_VIEWPORT.width) : 1;
const MONITOR_POSITION: [number, number, number] = [...MONITOR.center];
const [, centerY] = MONITOR.center;
const standBottom = DESK.top + 0.012 - centerY;
const screenBottom = -MONITOR.screenHeight / 2 - BEZEL;

function requestFocusOnPointer() {
  const { focused, requestFocus } = useRoomStore.getState();
  if (!focused) requestFocus();
}

/**
 * Monitor provisório (blocos) com o OS de verdade na tela: o DOM do OS é
 * posicionado em 3D pelo `<Html transform>` do Drei, então input, foco e
 * acessibilidade continuam sendo do navegador.
 */
export function Monitor() {
  const invalidate = useThree((state) => state.invalidate);
  // O conteúdo do <Html> monta numa raiz React própria, depois dos primeiros
  // quadros. Com frameloop "demand", é preciso pedir um quadro para o Drei
  // aplicar a transformação 3D ao DOM recém-montado.
  const onContentMount = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) invalidate();
    },
    [invalidate],
  );

  return (
    <group position={MONITOR_POSITION}>
      <mesh name="placeholder:monitor-bezel" position={[0, 0, -DEPTH / 2]} castShadow>
        <boxGeometry args={[MONITOR.screenWidth + BEZEL * 2, MONITOR.screenHeight + BEZEL * 2, DEPTH]} />
        <meshStandardMaterial color="#0b0d12" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh name="placeholder:monitor-neck" position={[0, (screenBottom + standBottom) / 2, -0.05]} castShadow>
        <boxGeometry args={[0.05, screenBottom - standBottom, 0.03]} />
        <meshStandardMaterial color="#10141c" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh name="placeholder:monitor-base" position={[0, standBottom - 0.006, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.012, 0.18]} />
        <meshStandardMaterial color="#10141c" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh name="monitor-screen" position={[0, 0, 0.0005]}>
        <planeGeometry args={[MONITOR.screenWidth, MONITOR.screenHeight]} />
        <meshBasicMaterial color={color.ink} toneMapped={false} />
      </mesh>
      <Html
        transform
        portal={htmlLayerRef}
        distanceFactor={DISTANCE_FACTOR}
        position={[0, 0, 0.002]}
        zIndexRange={[50, 0]}
      >
        <div ref={onContentMount} onPointerDownCapture={requestFocusOnPointer} className="[backface-visibility:hidden]">
          <OsRoot viewport={MONITOR_VIEWPORT}>
            <ShellProbe />
          </OsRoot>
        </div>
      </Html>
    </group>
  );
}

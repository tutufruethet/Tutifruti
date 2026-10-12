'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import { type PerspectiveCamera, Vector3 } from 'three';
import { focusDistance, overviewDistance } from './focus';
import { CAMERA, MONITOR } from './layout';
import { nextCameraPhase, useRoomStore } from './room-store';

const OVERVIEW_POSITION = new Vector3(...CAMERA.overview.position);
const OVERVIEW_TARGET = new Vector3(...CAMERA.overview.target);
const OVERVIEW_DIRECTION = OVERVIEW_POSITION.clone().sub(OVERVIEW_TARGET).normalize();
const BASE_DISTANCE = OVERVIEW_POSITION.distanceTo(OVERVIEW_TARGET);
const SCREEN_CENTER = new Vector3(...MONITOR.center);
/** Tupla estável: o R3F só reaplica a prop `target` se a referência mudar. */
const INITIAL_TARGET: [number, number, number] = [...CAMERA.overview.target];
/** Velocidade da aproximação exponencial (1/s). ~1,3 s para assentar. */
const SMOOTHING = 5.5;
const SETTLE_EPSILON = 0.0015;

// Vetores de trabalho fora do componente: mutados a cada quadro, sem alocar.
const goalPosition = new Vector3();
const goalTarget = new Vector3();
const offset = new Vector3();

type Controls = ComponentRef<typeof OrbitControls>;

function requiredOverviewDistance(camera: PerspectiveCamera, aspect: number): number {
  return overviewDistance({ baseDistance: BASE_DISTANCE, frame: CAMERA.overviewFrame, fovDeg: camera.fov, aspect });
}

/**
 * Câmera orbital com limites + transição para o monitor. Na Fase 5 a
 * transição ganha a coreografia cinematográfica com GSAP; aqui é uma
 * aproximação exponencial simples, suficiente para validar a interação.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const controls = useRef<Controls>(null);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);

  // Com frameloop "demand", um pedido de foco precisa acordar o render.
  useEffect(
    () =>
      useRoomStore.subscribe((state, previous) => {
        if (state.focused !== previous.focused) invalidate();
      }),
    [invalidate],
  );

  // Em tela estreita (celular em retrato), afasta a câmera até o monitor caber.
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || useRoomStore.getState().phase !== 'free') return;
    const camera = get().camera as PerspectiveCamera;
    const required = requiredOverviewDistance(camera, size.width / size.height);
    orbit.maxDistance = Math.max(4, required + 0.3);
    offset.copy(camera.position).sub(orbit.target);
    if (offset.length() < required) {
      camera.position.copy(orbit.target).add(offset.setLength(required));
      orbit.update();
      invalidate();
    }
  }, [size, get, invalidate]);

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const { focused, phase, setPhase } = useRoomStore.getState();

    if (phase === 'free' && !focused) {
      orbit.enabled = true;
      return;
    }
    orbit.enabled = false;

    const camera = state.camera as PerspectiveCamera;
    const aspect = state.size.width / state.size.height;
    if (focused) {
      const distance = focusDistance({
        width: MONITOR.screenWidth,
        height: MONITOR.screenHeight,
        fovDeg: camera.fov,
        aspect,
        fill: CAMERA.focusFill,
      });
      goalTarget.copy(SCREEN_CENTER);
      goalPosition.set(SCREEN_CENTER.x, SCREEN_CENTER.y, SCREEN_CENTER.z + distance);
    } else {
      goalTarget.copy(OVERVIEW_TARGET);
      goalPosition.copy(OVERVIEW_TARGET).addScaledVector(OVERVIEW_DIRECTION, requiredOverviewDistance(camera, aspect));
    }

    const t = reducedMotion ? 1 : 1 - Math.exp(-SMOOTHING * Math.min(delta, 0.1));
    camera.position.lerp(goalPosition, t);
    orbit.target.lerp(goalTarget, t);

    const settled =
      camera.position.distanceTo(goalPosition) < SETTLE_EPSILON &&
      orbit.target.distanceTo(goalTarget) < SETTLE_EPSILON;
    if (settled) {
      camera.position.copy(goalPosition);
      orbit.target.copy(goalTarget);
    }
    camera.lookAt(orbit.target);

    const next = nextCameraPhase(phase, focused, settled);
    if (next === 'free') {
      orbit.enabled = true;
      orbit.update();
    } else if (!settled || next !== phase) {
      state.invalidate();
    }
    if (next !== phase) setPhase(next);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={INITIAL_TARGET}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.45}
      enablePan={false}
      minDistance={1}
      maxDistance={4}
      minAzimuthAngle={-0.65}
      maxAzimuthAngle={0.65}
      minPolarAngle={0.85}
      maxPolarAngle={1.62}
    />
  );
}

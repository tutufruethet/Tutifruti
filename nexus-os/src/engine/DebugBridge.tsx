'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Spherical, Vector3 } from 'three';
import { hasDebugParam } from '@/experience/mode';
import { CAMERA, MONITOR } from './layout';
import { type CameraPhase, useRoomStore } from './room-store';

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Gancho de teste (`?debug`): os testes leem o estado sem depender do FPS. */
export interface NexusDebugApi {
  readonly ready: true;
  phase: () => CameraPhase;
  focused: () => boolean;
  frames: () => number;
  camera: () => [number, number, number];
  /** Retângulo da tela do monitor projetado na página, em px CSS. */
  screenRect: () => ScreenRect | null;
  requestFocus: () => void;
  releaseFocus: () => void;
  /** Gira a câmera em volta do alvo (radianos, 0 = de frente). */
  orbitTo: (azimuth: number) => void;
}

declare global {
  interface Window {
    __nexus?: NexusDebugApi;
  }
}

const OVERVIEW_TARGET = new Vector3(...CAMERA.overview.target);
const corner = new Vector3();

export function DebugBridge() {
  const get = useThree((state) => state.get);
  const frames = useRef(0);

  useFrame(() => {
    frames.current += 1;
  });

  useEffect(() => {
    if (!hasDebugParam(window.location.search)) return;

    const api: NexusDebugApi = {
      ready: true,
      phase: () => useRoomStore.getState().phase,
      focused: () => useRoomStore.getState().focused,
      frames: () => frames.current,
      camera: () => {
        const { x, y, z } = get().camera.position;
        return [x, y, z];
      },
      screenRect: () => {
        const { scene, camera, gl } = get();
        const screen = scene.getObjectByName('monitor-screen');
        if (!screen) return null;
        screen.updateWorldMatrix(true, false);
        const canvas = gl.domElement.getBoundingClientRect();
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          corner.set((sx * MONITOR.screenWidth) / 2, (sy * MONITOR.screenHeight) / 2, 0);
          screen.localToWorld(corner).project(camera);
          xs.push(canvas.left + ((corner.x + 1) / 2) * canvas.width);
          ys.push(canvas.top + ((1 - corner.y) / 2) * canvas.height);
        }
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
      },
      requestFocus: () => useRoomStore.getState().requestFocus(),
      releaseFocus: () => useRoomStore.getState().releaseFocus(),
      orbitTo: (azimuth) => {
        const { camera, invalidate } = get();
        const offset = new Vector3(...CAMERA.overview.position).sub(OVERVIEW_TARGET);
        const spherical = new Spherical().setFromVector3(offset);
        spherical.theta = azimuth;
        camera.position.copy(OVERVIEW_TARGET).add(new Vector3().setFromSpherical(spherical));
        camera.lookAt(OVERVIEW_TARGET);
        invalidate();
      },
    };

    window.__nexus = api;
    return () => {
      delete window.__nexus;
    };
  }, [get]);

  return null;
}

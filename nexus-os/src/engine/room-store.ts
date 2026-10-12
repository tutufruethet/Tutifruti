import { create } from 'zustand';

/**
 * - `free`: câmera orbital, usuário explora o quarto.
 * - `focusing` / `leaving`: câmera em transição para o monitor ou de volta.
 * - `focused`: câmera de frente para o monitor; o OS recebe a interação.
 */
export type CameraPhase = 'free' | 'focusing' | 'focused' | 'leaving';

interface RoomState {
  focused: boolean;
  phase: CameraPhase;
  requestFocus: () => void;
  releaseFocus: () => void;
  setPhase: (phase: CameraPhase) => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  focused: false,
  phase: 'free',
  requestFocus: () => set({ focused: true }),
  releaseFocus: () => set({ focused: false }),
  setPhase: (phase) => set({ phase }),
}));

/** Próxima fase da câmera a partir do pedido atual (lógica pura, testável). */
export function nextCameraPhase(phase: CameraPhase, focused: boolean, settled: boolean): CameraPhase {
  if (focused) {
    if (phase === 'free' || phase === 'leaving') return 'focusing';
    if (phase === 'focusing' && settled) return 'focused';
    return phase;
  }
  if (phase === 'focused' || phase === 'focusing') return 'leaving';
  if (phase === 'leaving' && settled) return 'free';
  return phase;
}

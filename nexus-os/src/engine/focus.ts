/**
 * Distância da câmera (de frente para a tela) para que a tela ocupe `fill`
 * da viewport no eixo que limitar primeiro (largura ou altura).
 */
export function focusDistance({
  width,
  height,
  fovDeg,
  aspect,
  fill,
}: {
  width: number;
  height: number;
  /** FOV vertical da câmera, em graus. */
  fovDeg: number;
  /** Largura ÷ altura da viewport. */
  aspect: number;
  fill: number;
}): number {
  if (width <= 0 || height <= 0 || aspect <= 0 || fill <= 0 || fill > 1) {
    throw new Error('Parâmetros de foco inválidos');
  }
  const halfV = (fovDeg * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const byHeight = height / fill / 2 / Math.tan(halfV);
  const byWidth = width / fill / 2 / Math.tan(halfH);
  return Math.max(byHeight, byWidth);
}

/** Fração da viewport ocupada por um objeto de tamanho `size` a `distance`. */
export function viewportFraction(size: number, distance: number, halfFovRad: number): number {
  return size / (2 * distance * Math.tan(halfFovRad));
}

/**
 * Distância da câmera na visão geral: a padrão, ou mais longe se a tela for
 * estreita (celular em retrato) e o enquadramento não couber.
 */
export function overviewDistance({
  baseDistance,
  frame,
  fovDeg,
  aspect,
}: {
  baseDistance: number;
  frame: { width: number; height: number };
  fovDeg: number;
  aspect: number;
}): number {
  return Math.max(baseDistance, focusDistance({ ...frame, fovDeg, aspect, fill: 0.9 }));
}

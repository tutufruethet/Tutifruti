'use client';

import { light } from '@/design/tokens';
import { DESK, ROOM } from './layout';

/**
 * GEOMETRIA PROVISÓRIA (Fase 1). Blocos com as medidas reais do quarto para
 * validar câmera, luz e o OS no monitor. A Fase 4 troca cada peça por um
 * modelo GLB (pipeline em docs/arquitetura.md). Todos os meshes têm nome
 * com o prefixo `placeholder:` para serem fáceis de achar e remover.
 */
const surface = { color: '#0d1119', roughness: 0.9, metalness: 0 } as const;
const furniture = { color: '#151b26', roughness: 0.55, metalness: 0.25 } as const;
const dark = { color: '#0b0e14', roughness: 0.45, metalness: 0.5 } as const;

const legX = DESK.width / 2 - 0.05;
const legZ = DESK.depth / 2 - 0.05;
const legHeight = DESK.top - DESK.thickness;

export function PlaceholderRoom() {
  return (
    <group name="placeholder:room">
      {/* Piso e paredes */}
      <mesh name="placeholder:floor" rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial {...surface} color="#0a0d13" />
      </mesh>
      <mesh name="placeholder:back-wall" position={[0, ROOM.height / 2, ROOM.backWallZ]} receiveShadow>
        <planeGeometry args={[6, ROOM.height]} />
        <meshStandardMaterial {...surface} />
      </mesh>
      <mesh
        name="placeholder:left-wall"
        position={[ROOM.leftWallX, ROOM.height / 2, 0.5]}
        rotation-y={Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[4, ROOM.height]} />
        <meshStandardMaterial {...surface} />
      </mesh>

      {/* Janela (a chuva entra na Fase 4) */}
      <group name="placeholder:window" position={[ROOM.leftWallX + 0.01, 1.5, -0.1]} rotation-y={Math.PI / 2}>
        <mesh>
          <planeGeometry args={[1.3, 1.1]} />
          <meshStandardMaterial color="#060b18" emissive="#0d2a5c" emissiveIntensity={0.9} roughness={0.2} />
        </mesh>
        {[-0.65, 0, 0.65].map((x) => (
          <mesh key={`v${x}`} position={[x, 0, 0.01]}>
            <boxGeometry args={[0.03, 1.13, 0.03]} />
            <meshStandardMaterial {...dark} />
          </mesh>
        ))}
        {[-0.55, 0.55].map((y) => (
          <mesh key={`h${y}`} position={[0, y, 0.01]}>
            <boxGeometry args={[1.33, 0.03, 0.03]} />
            <meshStandardMaterial {...dark} />
          </mesh>
        ))}
      </group>

      {/* Fita RGB no alto da parede do fundo */}
      <mesh name="placeholder:rgb-strip" position={[0.2, 2.35, ROOM.backWallZ + 0.02]}>
        <boxGeometry args={[2.4, 0.012, 0.012]} />
        <meshBasicMaterial color={light.violet} toneMapped={false} />
      </mesh>

      {/* Mesa */}
      <group name="placeholder:desk" position={[0, 0, DESK.centerZ]}>
        <mesh position={[0, DESK.top - DESK.thickness / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[DESK.width, DESK.thickness, DESK.depth]} />
          <meshStandardMaterial {...furniture} />
        </mesh>
        {[
          [-legX, -legZ],
          [legX, -legZ],
          [-legX, legZ],
          [legX, legZ],
        ].map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x ?? 0, legHeight / 2, z ?? 0]} castShadow>
            <boxGeometry args={[0.04, legHeight, 0.04]} />
            <meshStandardMaterial {...dark} />
          </mesh>
        ))}
      </group>

      {/* Teclado e mouse */}
      <mesh name="placeholder:keyboard" position={[-0.05, DESK.top + 0.011, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.022, 0.14]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh name="placeholder:mouse" position={[0.33, DESK.top + 0.015, -0.48]} scale={[0.6, 0.35, 1]} castShadow>
        <sphereGeometry args={[0.05, 24, 16]} />
        <meshStandardMaterial {...dark} />
      </mesh>

      {/* Gabinete com fita no azul elétrico */}
      <group name="placeholder:pc" position={[0.98, 0.25, -0.62]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.5, 0.48]} />
          <meshStandardMaterial {...furniture} color="#10151f" />
        </mesh>
        <mesh position={[-0.111, 0, 0]}>
          <boxGeometry args={[0.002, 0.42, 0.006]} />
          <meshBasicMaterial color={light.electric} toneMapped={false} />
        </mesh>
      </group>

      {/* Cadeira */}
      <group name="placeholder:chair" position={[-0.55, 0, 0.05]} rotation-y={0.45}>
        <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.07, 0.46]} />
          <meshStandardMaterial {...furniture} />
        </mesh>
        <mesh position={[0, 0.82, 0.22]} rotation-x={-0.12} castShadow>
          <boxGeometry args={[0.46, 0.62, 0.06]} />
          <meshStandardMaterial {...furniture} />
        </mesh>
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.42, 16]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 32]} />
          <meshStandardMaterial {...dark} />
        </mesh>
      </group>
    </group>
  );
}

import { createRef, type RefObject } from 'react';

/**
 * Camada DOM fixa para o `<Html>` do Drei. Sem ela, o Drei escolhe o alvo pelo
 * `events.connected` do R3F, que muda logo depois da montagem; o Drei então
 * recria a raiz React no mesmo elemento e o conteúdo (o OS) some.
 *
 * `current` é `null` até a camada montar; o tipo segue o que o Drei espera.
 */
export const htmlLayerRef = createRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

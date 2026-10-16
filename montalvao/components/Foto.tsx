import { foto, srcFoto } from "@/lib/midia";

type Props = {
  id: string;
  /** Atributo sizes do srcset, ex.: "(min-width: 64rem) 50vw, 100vw". */
  sizes: string;
  alt?: string;
  prioridade?: boolean;
  className?: string;
  /** object-position da imagem, ex.: "50% 30%". */
  posicao?: string;
};

/** <picture> com AVIF + WebP em várias larguras, dimensões reservadas e cor de fundo enquanto carrega. */
export function Foto({ id, sizes, alt, prioridade = false, className = "", posicao }: Props) {
  const info = foto(id);
  const srcset = (formato: "avif" | "webp") => info.larguras.map((l) => `${srcFoto(id, l, formato)} ${l}w`).join(", ");
  const maior = info.larguras[info.larguras.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <img
        src={srcFoto(id, maior, "webp")}
        srcSet={srcset("webp")}
        sizes={sizes}
        width={info.largura}
        height={info.altura}
        alt={alt ?? info.alt}
        loading={prioridade ? "eager" : "lazy"}
        fetchPriority={prioridade ? "high" : undefined}
        decoding="async"
        className={className}
        style={{ backgroundColor: info.cor, objectPosition: posicao ?? info.foco }}
      />
    </picture>
  );
}

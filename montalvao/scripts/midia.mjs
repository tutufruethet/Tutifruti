// Gera as imagens responsivas e o vídeo da abertura a partir de midia/originais.
// Rode com `npm run midia` sempre que trocar ou adicionar um original.
// Saída: public/midia/* e content/midia.json (manifesto usado pelo componente <Foto>).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAIS = join(raiz, "midia/originais");
const SAIDA = join(raiz, "public/midia");
const TMP = join(raiz, "midia/.tmp");
const LARGURAS = [480, 800, 1200];

const VIDEO = join(ORIGINAIS, "reels-march-2026-10-15.mp4");

// Quadros do vídeo usados como foto do March. São do mesmo exemplar.
// t=0 é o único quadro sem nenhuma sobreposição; t=21.6 tem o @ e a tarja,
// que ficam fora do recorte abaixo.
const QUADROS = [
  { nome: "march-quadro-0", t: 0 },
  { nome: "march-quadro-21", t: 21.6 },
];

// Recortes em pixels do original: [x, y, largura, altura]. `foco` = object-position padrão quando a foto é recortada pelo layout.
// Os recortes tiram textos sobrepostos (tarjas, slogans, @) sem cortar pessoas nem os carros.
const IMAGENS = [
  { id: "salao", arquivo: "salao.jpg", recorte: [0, 0, 948, 935], foco: "50% 40%", alt: "Salão da Montalvão com fileiras de carros e iluminação linear no teto; um homem de camiseta clara em primeiro plano" },
  { id: "creta", arquivo: "creta-hexagonos.jpg", recorte: [0, 0, 950, 1180], foco: "45% 70%", alt: "Hyundai Creta prata sob a luminária hexagonal do showroom, com um homem ao lado" },
  { id: "hexagonos", arquivo: "creta-hexagonos.jpg", recorte: [0, 0, 950, 520], foco: "50% 50%", alt: "Luminária de LED em formato de colmeia no teto do showroom" },
  { id: "laco", arquivo: "carro-laco.jpg", recorte: null, foco: "50% 60%", alt: "Carro branco com um grande laço vermelho no capô e um homem sorrindo ao lado" },
  { id: "renault", arquivo: "renault-branco.jpg", recorte: null, foco: "40% 70%", alt: "Renault branco no showroom, com um homem ao lado" },
  { id: "hyundai", arquivo: "hyundai-prata.png", recorte: null, foco: "45% 70%", alt: "Hyundai prata no showroom, com um homem de camiseta verde apoiado no carro" },
  { id: "march-1", arquivo: "march-quadro-0.png", recorte: [0, 660, 1080, 860], foco: "38% 55%", alt: "Nissan March prata visto de frente, com um homem ao fundo ao lado de um carro vermelho" },
  { id: "march-2", arquivo: "march-quadro-21.png", recorte: [0, 640, 1080, 820], foco: "55% 55%", alt: "Nissan March prata de frente, com um homem ao lado" },
];

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
}

async function corMedia(img) {
  const { dominant } = await img.clone().stats();
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(dominant.r)}${h(dominant.g)}${h(dominant.b)}`;
}

async function gerarImagem(spec, manifesto) {
  const origem = existsSync(join(ORIGINAIS, spec.arquivo)) ? join(ORIGINAIS, spec.arquivo) : join(TMP, spec.arquivo);
  let base = sharp(origem).rotate();
  if (spec.recorte) {
    const [left, top, width, height] = spec.recorte;
    base = base.extract({ left, top, width, height });
  }
  const buf = await base.toBuffer();
  const img = sharp(buf);
  const { width, height } = await img.metadata();
  const larguras = [...new Set(LARGURAS.filter((l) => l < width).concat(width))].sort((a, b) => a - b);
  for (const l of larguras) {
    const r = img.clone().resize({ width: l });
    await r.clone().avif({ quality: 55, effort: 6 }).toFile(join(SAIDA, `${spec.id}-${l}.avif`));
    await r.clone().webp({ quality: 78 }).toFile(join(SAIDA, `${spec.id}-${l}.webp`));
  }
  manifesto[spec.id] = { largura: width, altura: height, larguras, cor: await corMedia(img), alt: spec.alt, foco: spec.foco ?? "50% 50%" };
}

async function gerarVideo(manifesto) {
  // Trecho de 2,5 a 8,6 s: o @ fica no canto direito (x ≥ 788 px) e a tarja de preço abaixo de y = 1480.
  // O recorte 760×1460 a partir do canto superior esquerdo deixa as duas sobreposições de fora.
  // Antes de 2,5 s a pessoa passa pela borda do recorte e ficaria cortada ao meio, por isso fica de fora.
  // Os trechos entram na ordem 6,8–8,6 + 2,5–6,8 para o loop emendar sem salto (8,6 → 2,5 é o único corte).
  const filtro =
    "[0:v]trim=6.8:8.6,setpts=PTS-STARTPTS[b];[0:v]trim=2.5:6.8,setpts=PTS-STARTPTS[a];" +
    "[b][a]concat=n=2:v=1:a=0,crop=760:1460:0:0,fps=30,format=yuv420p[v]";
  const corte = join(TMP, "abertura-corte.mp4");
  ffmpeg(["-i", VIDEO, "-filter_complex", filtro, "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "16", "-preset", "medium", corte]);

  for (const l of [720, 480]) {
    const vf = `scale=${l}:-2:flags=lanczos`;
    ffmpeg(["-i", corte, "-vf", vf, "-an", "-c:v", "libx264", "-profile:v", "high", "-crf", l === 720 ? "26" : "27", "-preset", "slow", "-movflags", "+faststart", join(SAIDA, `abertura-${l}.mp4`)]);
    ffmpeg(["-i", corte, "-vf", vf, "-an", "-c:v", "libsvtav1", "-crf", "38", "-preset", "6", "-movflags", "+faststart", join(SAIDA, `abertura-${l}-av1.mp4`)]);
  }

  // Poster = primeiro quadro do vídeo (sem salto quando o vídeo começa).
  const poster = join(TMP, "abertura-poster.png");
  ffmpeg(["-i", corte, "-frames:v", "1", poster]);
  await gerarImagem({ id: "abertura-poster", arquivo: "abertura-poster.png", recorte: null, foco: "50% 35%", alt: "" }, manifesto);
  manifesto["abertura-video"] = { largura: 760, altura: 1460, duracao: 6.1 };
}

async function main() {
  rmSync(SAIDA, { recursive: true, force: true });
  mkdirSync(SAIDA, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  for (const q of QUADROS) ffmpeg(["-ss", String(q.t), "-i", VIDEO, "-frames:v", "1", join(TMP, `${q.nome}.png`)]);

  const manifesto = {};
  for (const spec of IMAGENS) await gerarImagem(spec, manifesto);
  await gerarVideo(manifesto);

  // Imagem para compartilhamento (Open Graph), 1200×630.
  await sharp(join(ORIGINAIS, "salao.jpg")).extract({ left: 0, top: 120, width: 948, height: 498 }).resize(1200, 630).jpeg({ quality: 82, mozjpeg: true }).toFile(join(SAIDA, "og.jpg"));

  writeFileSync(join(raiz, "content/midia.json"), JSON.stringify(manifesto, null, 2) + "\n");
  rmSync(TMP, { recursive: true, force: true });
  console.log("Mídia gerada:", Object.keys(manifesto).join(", "));
}

main();

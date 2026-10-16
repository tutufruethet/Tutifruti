"use client";

import { useId, useRef, useState } from "react";
import { IconeWhatsApp } from "@/components/Icones";

type Opcao = { valor: string; rotulo: string; url: string };

type Props = {
  /** Número do WhatsApp só com dígitos. null = pendente (só na prévia o formulário aparece assim). */
  numero: string | null;
  veiculos: Opcao[];
  veiculoInicial?: string;
};

type Erros = Partial<Record<"nome" | "mensagem", string>>;

const VISITAS = ["Ainda não sei", "Nesta semana", "Na próxima semana", "Neste mês"];

function montarMensagem(nome: string, veiculo: Opcao | undefined, visita: string, texto: string) {
  const partes = [`Olá! Meu nome é ${nome}. Conheci a Montalvão pelo site.`];
  partes.push(veiculo ? `Tenho interesse no ${veiculo.rotulo}: ${veiculo.url}` : "Gostaria de saber mais sobre os veículos.");
  if (visita && visita !== VISITAS[0]) partes.push(`Pretendo visitar a loja ${visita.toLowerCase()}.`);
  let mensagem = partes.join(" ");
  if (texto.trim()) mensagem += `\n\n${texto.trim()}`;
  return mensagem;
}

/**
 * Sem backend: o formulário monta a mensagem e abre o WhatsApp. Nada é enviado nem guardado pelo site;
 * a pessoa conclui tocando em enviar no WhatsApp. Não pede CPF nem documentos.
 */
export function FormularioContato({ numero, veiculos, veiculoInicial = "" }: Props) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [erros, setErros] = useState<Erros>({});
  const [estado, setEstado] = useState<"livre" | "abrindo" | "aberto" | "bloqueado" | "previa">("livre");
  const [link, setLink] = useState("");
  const [mensagemPrevia, setMensagemPrevia] = useState("");

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const nome = String(dados.get("nome") ?? "").trim();
    const texto = String(dados.get("mensagem") ?? "");
    const novos: Erros = {};
    if (nome.length < 2) novos.nome = "Escreva seu nome para a equipe saber com quem está falando.";
    if (texto.length > 600) novos.mensagem = "A mensagem passou de 600 caracteres. Resuma um pouco.";
    setErros(novos);
    if (Object.keys(novos).length) {
      form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    const veiculo = veiculos.find((v) => v.valor === dados.get("veiculo"));
    const mensagem = montarMensagem(nome, veiculo, String(dados.get("visita") ?? ""), texto);

    if (!numero) {
      setMensagemPrevia(mensagem);
      setEstado("previa");
      return;
    }

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    setLink(url);
    setEstado("abrindo");
    const janela = window.open(url, "_blank");
    if (janela) {
      janela.opener = null;
      setEstado("aberto");
    } else {
      setEstado("bloqueado");
    }
  }

  const campo =
    "mt-2 block w-full rounded-[2px] border border-linha bg-transparent px-4 py-3.5 text-[1.0625rem] text-tx placeholder:text-tx-2/70 transition-colors duration-300 hover:border-tx-2 focus:border-tx focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 aria-[invalid=true]:border-[#e07a5f]";

  return (
    <form ref={form} onSubmit={aoEnviar} noValidate className="grid gap-6" aria-describedby={`${id}-nota`}>
      <div>
        <label htmlFor={`${id}-nome`} className="text-[0.9375rem] font-semibold">
          Seu nome
        </label>
        <input
          id={`${id}-nome`}
          name="nome"
          type="text"
          autoComplete="given-name"
          required
          maxLength={80}
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={erros.nome ? `${id}-erro-nome` : undefined}
          className={campo}
        />
        {erros.nome && (
          <p id={`${id}-erro-nome`} className="mt-2 text-[0.9375rem] text-[#f0a08a]">
            {erros.nome}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-veiculo`} className="text-[0.9375rem] font-semibold">
            Veículo de interesse <span className="font-normal text-tx-2">(opcional)</span>
          </label>
          <select id={`${id}-veiculo`} name="veiculo" defaultValue={veiculoInicial} className={`${campo} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23a8a59e%22 stroke-width=%221.5%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`}>
            <option value="">Ainda não escolhi</option>
            {veiculos.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-visita`} className="text-[0.9375rem] font-semibold">
            Quando pensa em visitar <span className="font-normal text-tx-2">(opcional)</span>
          </label>
          <select id={`${id}-visita`} name="visita" defaultValue={VISITAS[0]} className={`${campo} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23a8a59e%22 stroke-width=%221.5%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`}>
            {VISITAS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-mensagem`} className="text-[0.9375rem] font-semibold">
          Mensagem <span className="font-normal text-tx-2">(opcional)</span>
        </label>
        <textarea
          id={`${id}-mensagem`}
          name="mensagem"
          rows={4}
          maxLength={700}
          placeholder="Ex.: procuro um carro para o dia a dia, até tal valor."
          aria-invalid={erros.mensagem ? true : undefined}
          aria-describedby={erros.mensagem ? `${id}-erro-mensagem` : undefined}
          className={`${campo} resize-y`}
        />
        {erros.mensagem && (
          <p id={`${id}-erro-mensagem`} className="mt-2 text-[0.9375rem] text-[#f0a08a]">
            {erros.mensagem}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <button type="submit" className="botao botao-cheio w-full sm:w-auto sm:self-start" aria-busy={estado === "abrindo"} disabled={estado === "abrindo"}>
          <IconeWhatsApp />
          {estado === "abrindo" ? "Abrindo o WhatsApp…" : "Continuar no WhatsApp"}
        </button>
        <p id={`${id}-nota`} className="text-[0.9375rem] leading-relaxed text-tx-2">
          O botão abre o WhatsApp com a sua mensagem pronta. Ela só chega à loja quando você tocar em enviar lá.
          Este site não guarda o que você escreve.
        </p>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {estado === "aberto" && (
          <p className="border-l-2 border-acento pl-4 text-[1rem]">
            Abrimos o WhatsApp com a sua mensagem. Para concluir, toque em <strong>enviar</strong> na conversa.{" "}
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Abrir de novo
            </a>
          </p>
        )}
        {estado === "bloqueado" && (
          <p className="border-l-2 border-[#e07a5f] pl-4 text-[1rem]">
            O navegador não deixou abrir o WhatsApp automaticamente.{" "}
            <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
              Toque aqui para abrir a conversa
            </a>
            .
          </p>
        )}
        {estado === "previa" && (
          <div className="border border-dashed border-acento p-4 text-[0.9375rem]">
            <p className="rotulo text-acento">Prévia · número de WhatsApp pendente</p>
            <p className="mt-2 text-tx-2">Com o número configurado, o WhatsApp abriria com esta mensagem:</p>
            <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[0.9375rem] text-tx">{mensagemPrevia}</pre>
          </div>
        )}
      </div>
    </form>
  );
}

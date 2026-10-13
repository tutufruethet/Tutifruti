"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm, useWatch, type Control, type FieldPath, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { BriefingSchema, LIMITS, type Briefing } from "@/lib/schema";
import {
  CONTENT_ITEMS,
  FEATURE_NEED,
  FEATURES,
  GOALS,
  MATERIAL_AVAILABILITY,
  MOTION_LEVELS,
  STAGES,
  THEMES,
  TRAFFIC_SOURCES,
  VISUAL_STYLES,
} from "@/lib/schema/catalog";
import { newId } from "@/lib/schema/factory";
import { SEGMENTS } from "@/lib/schema/segments";
import { BRIEFING_STEPS, briefingGaps } from "@/lib/plan/gaps";
import { Button, cx, Field, IconButton, Segmented } from "@/components/ui";
import { useProject } from "@/components/project/ProjectProvider";

type Reg = UseFormRegister<Briefing>;

const STEP_FIELDS: FieldPath<Briefing>[][] = [
  ["business"],
  ["audience"],
  ["goals"],
  ["content"],
  ["visual"],
  ["features"],
];

const GUIDE: { title: string; tips: string[] }[] = [
  {
    title: "Por que isso importa",
    tips: [
      "Serviços e região viram títulos e páginas. Escreva como o cliente procuraria no Google.",
      "Diferenciais precisam ser verificáveis: horário, estrutura, garantia, prazo. “Qualidade” e “excelência” não ajudam.",
    ],
  },
  {
    title: "Fale como o cliente fala",
    tips: [
      "Use as palavras que o cliente final usa no WhatsApp ou no balcão.",
      "Objeções viram perguntas frequentes. Sem elas, o SitePlan usa hipóteses do segmento, marcadas para confirmar.",
    ],
  },
  {
    title: "Um objetivo manda",
    tips: [
      "O objetivo principal define o tipo de site, os botões e as jornadas. Os secundários entram sem competir com ele.",
      "Conversão é uma ação observável: “inicia conversa no WhatsApp”, “envia o formulário”, “compra”.",
    ],
  },
  {
    title: "Nada é inventado",
    tips: [
      "Depoimentos, cases e certificações só entram se forem reais. Marque como pendente o que ainda vai chegar.",
      "Não se aplica remove a seção do planejamento.",
    ],
  },
  {
    title: "Referências são registradas, não visitadas",
    tips: [
      "As URLs ficam no prompt como referência informada por você. O SitePlan não acessa nem analisa esses sites.",
      "Diga o que gosta em cada referência: é isso que vira orientação concreta.",
    ],
  },
  {
    title: "Simples primeiro",
    tips: [
      "Marque “Avaliar” quando não houver certeza: vira melhoria futura, não requisito do lançamento.",
      "Área restrita e pagamento aumentam bastante a complexidade e a manutenção.",
    ],
  },
];

function TextArea({ reg, name, rows = 3, placeholder, max = LIMITS.long, ...p }: { reg: Reg; name: FieldPath<Briefing>; rows?: number; placeholder?: string; max?: number } & Record<string, unknown>) {
  return <textarea {...p} {...reg(name)} rows={rows} maxLength={max} placeholder={placeholder} className="field-input" />;
}
function Input({ reg, name, placeholder, max = LIMITS.short, type = "text", ...p }: { reg: Reg; name: FieldPath<Briefing>; placeholder?: string; max?: number; type?: string } & Record<string, unknown>) {
  return <input {...p} {...reg(name)} type={type} maxLength={max} placeholder={placeholder} className="field-input" />;
}

function ChipChecks<T extends string>({
  legend,
  options,
  value,
  onChange,
  exclude,
}: {
  legend: string;
  options: readonly { key: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  exclude?: T | null;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options
          .filter((o) => o.key !== exclude)
          .map((o) => {
            const on = value.includes(o.key);
            return (
              <label
                key={o.key}
                className={cx(
                  "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  on ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => onChange(on ? value.filter((v) => v !== o.key) : [...value, o.key])}
                />
                {on && <Check className="size-3.5" aria-hidden />}
                {o.label}
              </label>
            );
          })}
      </div>
    </fieldset>
  );
}

export function BriefingForm() {
  const { project, update } = useProject();
  const router = useRouter();
  const step = project.briefingStep;
  const form = useForm<Briefing>({
    defaultValues: project.briefing as Briefing,
    resolver: zodResolver(BriefingSchema),
    mode: "onTouched",
  });
  const { register, control, setValue, trigger, formState } = form;
  const errors = formState.errors;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Cada alteração vai para o projeto (e daí para o salvamento automático).
  useEffect(() => {
    const sub = form.watch((values) => {
      update((d) => {
        d.briefing = structuredClone(values) as Briefing;
        if (values.business?.companyName?.trim() && d.name === "Projeto sem nome") d.name = values.business.companyName.trim();
      });
    });
    return () => sub.unsubscribe();
  }, [form, update]);

  const goTo = async (next: number, validate = true) => {
    if (validate && next > step) {
      const ok = await trigger(STEP_FIELDS[step]);
      if (!ok) return;
    }
    update((d) => {
      d.briefingStep = Math.max(0, Math.min(5, next));
    });
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  };

  const finish = async () => {
    const ok = await trigger();
    if (!ok) {
      const firstBad = STEP_FIELDS.findIndex((f) => f.some((k) => k.split(".")[0] in errors));
      if (firstBad >= 0) await goTo(firstBad, false);
      return;
    }
    router.push(`/projetos/${project.id}/revisao`);
  };

  const gaps = briefingGaps(project.briefing as Briefing).filter((g) => g.step === step);
  const filledSteps = BRIEFING_STEPS.map((_, i) => !briefingGaps(project.briefing as Briefing).some((g) => g.step === i && g.level !== "recomendado"));

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-10 lg:py-8">
      <div className="min-w-0">
        <nav aria-label="Etapas do briefing" className="mb-6">
          <p className="mb-2 text-[13px] text-ink-3">
            Etapa {step + 1} de {BRIEFING_STEPS.length}
          </p>
          <ol className="grid grid-cols-6 gap-1.5">
            {BRIEFING_STEPS.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => void goTo(i, false)}
                  aria-current={i === step ? "step" : undefined}
                  className="group flex w-full flex-col gap-1.5 text-left"
                >
                  <span
                    className={cx(
                      "h-1 rounded-full transition-colors duration-200",
                      i === step ? "bg-accent" : i < step ? "bg-ink-2" : "bg-line-strong group-hover:bg-ink-3",
                    )}
                  />
                  <span className={cx("hidden truncate text-[13px] md:block", i === step ? "font-semibold text-ink" : "text-ink-3 group-hover:text-ink")}>
                    {s.label}
                    {i !== step && filledSteps[i] && i < step && <Check className="ml-1 inline size-3 text-ok" aria-label="ok" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {BRIEFING_STEPS[step].label}
        </h1>

        <form
          className="mt-6 flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void (step < 5 ? goTo(step + 1) : finish());
          }}
        >
          {step === 0 && <StepBusiness reg={register} control={control} setValue={setValue} errors={errors} />}
          {step === 1 && <StepAudience reg={register} control={control} setValue={setValue} />}
          {step === 2 && <StepGoals reg={register} control={control} setValue={setValue} errors={errors} />}
          {step === 3 && <StepContent reg={register} control={control} setValue={setValue} />}
          {step === 4 && <StepVisual reg={register} control={control} setValue={setValue} errors={errors} />}
          {step === 5 && <StepFeatures reg={register} control={control} setValue={setValue} />}

          <div className="sticky bottom-[68px] z-10 -mx-4 flex items-center justify-between gap-2 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:bg-surface lg:bottom-4">
            <Button variant="ghost" icon={<ArrowLeft className="size-4" />} disabled={step === 0} onClick={() => void goTo(step - 1, false)}>
              Voltar
            </Button>
            {step < 5 ? (
              <Button variant="primary" type="submit">
                Próxima: {BRIEFING_STEPS[step + 1].label}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="primary" type="submit">
                Revisar informações
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start" aria-label="Orientações da etapa">
        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">{GUIDE[step].title}</h2>
          <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-ink-2">
            {GUIDE[step].tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Lacunas desta etapa</h2>
          {gaps.length ? (
            <ul className="mt-2 flex flex-col gap-2 text-[13px]">
              {gaps.map((g) => (
                <li key={g.label}>
                  <span className={cx("font-medium", g.level === "obrigatorio" ? "text-danger" : g.level === "importante" ? "text-warn" : "text-ink-2")}>
                    {g.label}
                  </span>
                  <span className="block text-ink-3">{g.why}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ok">
              <Check className="size-4" aria-hidden /> Nada importante faltando.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

type StepProps = { reg: Reg; control: Control<Briefing>; setValue?: UseFormSetValue<Briefing>; errors?: ReturnType<typeof useForm<Briefing>>["formState"]["errors"] };
const setOpts = { shouldDirty: true, shouldTouch: true } as const;

function StepBusiness({ reg, control, setValue, errors }: StepProps) {
  const segment = useWatch({ control, name: "business.segment" });
  const stage = useWatch({ control, name: "business.stage" });
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome da empresa" error={errors?.business?.companyName?.message}>
          {(p) => <Input {...p} reg={reg} name="business.companyName" placeholder="Ex.: Clínica Sorriso Pinheiros" />}
        </Field>
        <Field label="Segmento">
          {(p) => (
            <select {...p} {...reg("business.segment")} className="field-input">
              {SEGMENTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {segment === "outro" && (
        <Field label="Qual segmento?" optional>
          {(p) => <Input {...p} reg={reg} name="business.segmentOther" placeholder="Ex.: Escola de idiomas para adultos" />}
        </Field>
      )}
      <Field label="Descrição do negócio" optional hint="Duas ou três frases: o que faz, para quem, como atende.">
        {(p) => <TextArea {...p} reg={reg} name="business.description" placeholder="Ex.: Clínica com três dentistas, atendimento particular e por alguns convênios, foco em implantes e alinhadores." />}
      </Field>
      <Field label="Produtos ou serviços principais" hint="Um por linha, do mais importante para o menos.">
        {(p) => <TextArea {...p} reg={reg} name="business.offerings" rows={4} placeholder={"Implantes dentários\nClareamento\nAlinhadores invisíveis"} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Região de atuação" optional hint="Bairro e cidade, ou “todo o Brasil”, “on-line”.">
          {(p) => <Input {...p} reg={reg} name="business.region" placeholder="Ex.: Pinheiros, São Paulo (SP)" />}
        </Field>
      </div>
      <Field label="Diferenciais" optional hint="Um por linha. Fatos que o cliente pode conferir.">
        {(p) => <TextArea {...p} reg={reg} name="business.differentiators" placeholder={"Atendimento até as 21h\nTomografia na própria clínica"} />}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Estágio do negócio <span className="font-normal text-ink-3">opcional</span>
        </span>
        <Segmented
          name="stage"
          legend="Estágio do negócio"
          value={stage}
          options={STAGES}
          onChange={(v) => setValue?.("business.stage", v, setOpts)}
        />
      </div>
    </>
  );
}

function StepAudience({ reg, control, setValue }: StepProps) {
  const sources = useWatch({ control, name: "audience.trafficSources" });
  return (
    <>
      <Field label="Quem é o cliente ideal" hint="Idade, situação, o que faz, onde está.">
        {(p) => <TextArea {...p} reg={reg} name="audience.idealClient" placeholder="Ex.: Adultos de 30 a 55 anos que trabalham na região e querem tratar sem faltar ao trabalho." />}
      </Field>
      <Field label="Problema que deseja resolver" optional>
        {(p) => <TextArea {...p} reg={reg} name="audience.problem" placeholder="Ex.: Adiam o tratamento por falta de horário e medo de gastar mais que o previsto." />}
      </Field>
      <Field label="Principais dúvidas e objeções" optional hint="Uma por linha. Viram as perguntas frequentes.">
        {(p) => <TextArea {...p} reg={reg} name="audience.objections" rows={4} placeholder={"Quanto custa?\nAtende convênio?\nDói?"} />}
      </Field>
      <Field label="O que influencia a decisão" optional>
        {(p) => <TextArea {...p} reg={reg} name="audience.decisionFactors" rows={2} placeholder="Ex.: horário, preço transparente, avaliações no Google, indicação." />}
      </Field>
      <ChipChecks
        legend="De onde os visitantes devem chegar"
        options={TRAFFIC_SOURCES}
        value={sources}
        onChange={(v) => setValue?.("audience.trafficSources", v, setOpts)}
      />
      <Field label="Outra origem" optional>
        {(p) => <Input {...p} reg={reg} name="audience.trafficOther" placeholder="Ex.: parceria com academias do bairro" />}
      </Field>
    </>
  );
}

function StepGoals({ reg, control, setValue, errors }: StepProps) {
  const primary = useWatch({ control, name: "goals.primary" });
  const secondary = useWatch({ control, name: "goals.secondary" });
  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium">Objetivo principal</legend>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {GOALS.map((g) => (
            <label
              key={g.key}
              className={cx(
                "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                primary === g.key ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-line-strong bg-surface hover:border-ink-3",
              )}
            >
              <input
                type="radio"
                name="goal-primary"
                className="size-4 accent-[var(--color-accent)]"
                checked={primary === g.key}
                onChange={() => {
                  setValue?.("goals.primary", g.key, setOpts);
                  setValue?.(
                    "goals.secondary",
                    secondary.filter((s) => s !== g.key),
                    setOpts,
                  );
                }}
              />
              {g.label}
            </label>
          ))}
        </div>
        {errors?.goals?.primary && <p className="mt-1.5 text-[13px] font-medium text-danger">Escolha o objetivo principal.</p>}
      </fieldset>
      {(primary === "outro" || secondary.includes("outro")) && (
        <Field label="Descreva o outro objetivo">
          {(p) => <Input {...p} reg={reg} name="goals.other" max={LIMITS.medium} placeholder="Ex.: Recrutar franqueados" />}
        </Field>
      )}
      <ChipChecks legend="Objetivos secundários (opcional)" options={GOALS} value={secondary} exclude={primary} onChange={(v) => setValue?.("goals.secondary", v, setOpts)} />
      <Field label="Que ação representa uma conversão?" hint="Uma ação que dá para observar e medir.">
        {(p) => <Input {...p} reg={reg} name="goals.conversionAction" max={LIMITS.medium} placeholder="Ex.: O visitante inicia uma conversa no WhatsApp pedindo avaliação." />}
      </Field>
      <Field label="Qual oferta será apresentada?" optional hint="O motivo concreto para agir agora. Sem promessa de resultado.">
        {(p) => <Input {...p} reg={reg} name="goals.offer" max={LIMITS.medium} placeholder="Ex.: Avaliação com plano de tratamento por escrito" />}
      </Field>
    </>
  );
}

function StepContent({ reg, control, setValue }: StepProps) {
  const items = useWatch({ control, name: "content.items" });
  return (
    <>
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {CONTENT_ITEMS.map((c) => (
          <div key={c.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              {"hint" in c && c.hint && <p className="text-[13px] text-ink-3">{c.hint}</p>}
            </div>
            <Segmented
              size="sm"
              name={`content-${c.key}`}
              legend={c.label}
              value={items[c.key]?.status ?? "pendente"}
              options={MATERIAL_AVAILABILITY}
              onChange={(v) => setValue?.(`content.items.${c.key}.status`, v, setOpts)}
            />
            {items[c.key]?.status !== "na" && (
              <input
                {...reg(`content.items.${c.key}.note`)}
                aria-label={`Observação sobre ${c.label}`}
                maxLength={LIMITS.medium}
                placeholder="Observação (opcional)"
                className="field-input !py-1.5 text-sm sm:col-span-2"
              />
            )}
          </div>
        ))}
      </div>
      <fieldset className="flex flex-col gap-4">
        <legend className="text-base font-semibold">Informações de contato</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" optional>
            {(p) => <Input {...p} reg={reg} name="content.contact.whatsapp" type="tel" placeholder="(11) 90000-0000" />}
          </Field>
          <Field label="Telefone" optional>
            {(p) => <Input {...p} reg={reg} name="content.contact.phone" type="tel" />}
          </Field>
          <Field label="E-mail" optional>
            {(p) => <Input {...p} reg={reg} name="content.contact.email" type="email" placeholder="contato@empresa.com.br" />}
          </Field>
          <Field label="Horários" optional>
            {(p) => <Input {...p} reg={reg} name="content.contact.hours" placeholder="Seg. a sex., 8h às 18h" />}
          </Field>
        </div>
        <Field label="Endereço" optional>
          {(p) => <Input {...p} reg={reg} name="content.contact.address" max={LIMITS.medium} />}
        </Field>
      </fieldset>
    </>
  );
}

function StepVisual({ reg, control, setValue, errors }: StepProps) {
  const style = useWatch({ control, name: "visual.style" });
  const theme = useWatch({ control, name: "visual.theme" });
  const motion = useWatch({ control, name: "visual.motion" });
  const refs = useFieldArray({ control, name: "visual.references", keyName: "_key" });
  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium">Estilo desejado</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VISUAL_STYLES.map((s) => (
            <label
              key={s.key}
              className={cx(
                "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                style === s.key ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
              )}
            >
              <input type="radio" name="visual-style" className="sr-only" checked={style === s.key} onChange={() => setValue?.("visual.style", s.key, setOpts)} />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Observações de estilo" optional>
        {(p) => <TextArea {...p} reg={reg} name="visual.styleNotes" rows={2} max={LIMITS.medium} placeholder="Ex.: Nada de fotos de banco com sorrisos perfeitos." />}
      </Field>
      <Field label="Cores" optional hint="Nomes ou códigos. Diga também o que evitar.">
        {(p) => <Input {...p} reg={reg} name="visual.colors" max={LIMITS.medium} placeholder="Ex.: verde-água #2a9d8f e branco; evitar azul hospitalar" />}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Referências</legend>
        <p className="-mt-1 text-[13px] text-ink-3">Registradas como informadas por você. O SitePlan não acessa esses endereços.</p>
        {refs.fields.map((f, i) => (
          <div key={f._key} className="grid gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="URL" error={errors?.visual?.references?.[i]?.url?.message}>
              {(p) => <input {...p} {...reg(`visual.references.${i}.url`)} type="url" maxLength={500} placeholder="https://" className="field-input" />}
            </Field>
            <Field label="O que você gosta nela">
              {(p) => <input {...p} {...reg(`visual.references.${i}.note`)} maxLength={LIMITS.medium} placeholder="Ex.: a tabela de preços clara" className="field-input" />}
            </Field>
            <IconButton label={`Remover referência ${i + 1}`} className="self-end" onClick={() => refs.remove(i)}>
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ))}
        {refs.fields.length < 12 && (
          <Button size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => refs.append({ id: newId("ref"), url: "", note: "" })}>
            Adicionar referência
          </Button>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tema</span>
          <Segmented name="theme" legend="Tema" value={theme} options={THEMES} onChange={(v) => setValue?.("visual.theme", v, setOpts)} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Intensidade das animações</span>
          <Segmented name="motion" legend="Intensidade das animações" value={motion} options={MOTION_LEVELS} onChange={(v) => setValue?.("visual.motion", v, setOpts)} />
          <p className="text-[13px] text-ink-3">{MOTION_LEVELS.find((m) => m.key === motion)?.hint}</p>
        </div>
      </div>
      <Field label="Elementos que devem ser evitados" optional>
        {(p) => <TextArea {...p} reg={reg} name="visual.avoid" rows={2} max={LIMITS.medium} placeholder="Ex.: carrossel automático, pop-up ao entrar, fotos de banco de imagem" />}
      </Field>
    </>
  );
}

function StepFeatures({ reg, control, setValue }: StepProps) {
  const needs = useWatch({ control, name: "features.needs" });
  return (
    <>
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {FEATURES.map((f) => (
          <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <span className="text-sm font-medium">{f.label}</span>
            <Segmented size="sm" name={`need-${f.key}`} legend={f.label} value={needs[f.key]} options={FEATURE_NEED} onChange={(v) => setValue?.(`features.needs.${f.key}`, v, setOpts)} />
          </div>
        ))}
      </div>
      <Field label="Integrações" optional hint="Separadas por vírgula.">
        {(p) => <Input {...p} reg={reg} name="features.integrations" max={LIMITS.medium} placeholder="Ex.: Google Analytics, RD Station, Calendly" />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Idiomas">
          {(p) => <Input {...p} reg={reg} name="features.languages" placeholder="Português (Brasil)" />}
        </Field>
        <Field label="Prazo" optional>
          {(p) => <Input {...p} reg={reg} name="features.deadline" placeholder="Ex.: 4 semanas" />}
        </Field>
        <Field label="Orçamento aproximado" optional>
          {(p) => <Input {...p} reg={reg} name="features.budget" placeholder="Ex.: até R$ 5 mil" />}
        </Field>
        <Field label="Tecnologia preferida" optional>
          {(p) => <Input {...p} reg={reg} name="features.technology" placeholder="Ex.: WordPress, Webflow, Next.js" />}
        </Field>
      </div>
      <Field label="Restrições de hospedagem ou manutenção" optional>
        {(p) => <TextArea {...p} reg={reg} name="features.hosting" rows={2} max={LIMITS.medium} placeholder="Ex.: o cliente não tem equipe técnica; edições de texto precisam ser simples." />}
      </Field>
    </>
  );
}

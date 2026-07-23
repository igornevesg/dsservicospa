"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, CalendarDays, ClipboardCopy, FileDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  converterValorHora,
  formatarDataCurta,
  formatarMoeda,
  gerarListaDetalhada,
  gerarPlantoes,
  gerarResumo,
  MESES,
  obterFeriadosAutomaticos,
} from "@/lib/plantoes/calculos";
import type { EmpresaPlantao, Feriado } from "@/lib/plantoes/types";
import styles from "./GeradorPlantoes.module.css";

const CHAVE_STORAGE = "ds-servicos-configuracao-plantoes-v1";
const EMPRESAS_INICIAIS: EmpresaPlantao[] = [
  { id: "empresa-1", nome: "Nova Geração Montes Claros", valorHora: "31,53", feriadosManuais: [] },
  { id: "empresa-2", nome: "Nova Geração Janaúba", valorHora: "31,53", feriadosManuais: [] },
  { id: "empresa-3", nome: "Nova Geração Capelinha", valorHora: "31,53", feriadosManuais: [] },
];

function criarId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function GeradorPlantoes() {
  const hoje = new Date();
  const [empresas, setEmpresas] = useState<EmpresaPlantao[]>(EMPRESAS_INICIAIS);
  const [empresaAtivaId, setEmpresaAtivaId] = useState(EMPRESAS_INICIAIS[0].id);
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [feriadosDesmarcados, setFeriadosDesmarcados] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const dadosSalvos = window.localStorage.getItem(CHAVE_STORAGE);
    if (dadosSalvos) {
      try {
        const salvas = JSON.parse(dadosSalvos) as EmpresaPlantao[];
        if (Array.isArray(salvas) && salvas.length > 0) {
          setEmpresas(salvas);
          setEmpresaAtivaId(salvas[0].id);
        }
      } catch {
        window.localStorage.removeItem(CHAVE_STORAGE);
      }
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(empresas));
  }, [empresas, carregado]);

  useEffect(() => setFeriadosDesmarcados([]), [ano, mes]);

  const empresaAtiva = empresas.find((empresa) => empresa.id === empresaAtivaId) ?? empresas[0];

  const feriadosAutomaticos = useMemo(() =>
    obterFeriadosAutomaticos(ano)
      .filter((feriado) => new Date(`${feriado.data}T12:00:00`).getMonth() === mes)
      .map((feriado) => ({ ...feriado, selecionado: !feriadosDesmarcados.includes(feriado.id) })),
    [ano, mes, feriadosDesmarcados],
  );

  const feriadosManuais: Feriado[] = empresaAtiva.feriadosManuais
    .filter((feriado) => {
      if (!feriado.data) return false;
      const data = new Date(`${feriado.data}T12:00:00`);
      return data.getFullYear() === ano && data.getMonth() === mes;
    })
    .map((feriado) => ({ ...feriado, origem: "manual", selecionado: true }));

  const plantoes = useMemo(() => gerarPlantoes({
    ano,
    mes,
    feriados: [...feriadosAutomaticos, ...feriadosManuais],
  }), [ano, mes, feriadosAutomaticos, feriadosManuais]);

  const horasTotais = plantoes.reduce((total, plantao) => total + plantao.horas, 0);
  const valorHora = converterValorHora(empresaAtiva.valorHora);
  const valorTotal = horasTotais * valorHora;
  const resumo = gerarResumo(plantoes);
  const listaDetalhada = gerarListaDetalhada(plantoes);
  const textoCompleto = `${listaDetalhada}\n\nHoras Total: ${horasTotais} hs\n\nValor Total: ${formatarMoeda(valorTotal)}`;

  function atualizarEmpresa(atualizacao: Partial<Omit<EmpresaPlantao, "id">>) {
    setEmpresas((atual) => atual.map((empresa) =>
      empresa.id === empresaAtivaId ? { ...empresa, ...atualizacao } : empresa,
    ));
  }

  function adicionarFeriadoManual() {
    atualizarEmpresa({
      feriadosManuais: [...empresaAtiva.feriadosManuais, { id: criarId(), data: "", nome: "" }],
    });
  }

  function atualizarFeriadoManual(id: string, campo: "data" | "nome", valor: string) {
    atualizarEmpresa({
      feriadosManuais: empresaAtiva.feriadosManuais.map((feriado) =>
        feriado.id === id ? { ...feriado, [campo]: valor } : feriado,
      ),
    });
  }

  function removerFeriadoManual(id: string) {
    atualizarEmpresa({
      feriadosManuais: empresaAtiva.feriadosManuais.filter((feriado) => feriado.id !== id),
    });
  }

  function alternarFeriadoAutomatico(id: string) {
    setFeriadosDesmarcados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  }

  async function copiarLista() {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setMensagem("Lista copiada para a área de transferência.");
    } catch {
      setMensagem("Não foi possível copiar automaticamente.");
    }
    window.setTimeout(() => setMensagem(""), 3000);
  }

  return (
    <main id="conteudo" className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" aria-label="Voltar ao site da DS Serviços">
            <Image src="/logo-ds-servicos.png" alt="DS Serviços" width={178} height={39} priority />
          </Link>
          <Link className={styles.backLink} href="/">Voltar ao site</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>Área administrativa</span>
          <h1>Gerador de <em>plantões</em></h1>
          <p>Calcule automaticamente finais de semana e feriados, totalize as horas e prepare a relação para faturamento.</p>
        </div>
      </section>

      <div className={`${styles.container} ${styles.content}`}>
        <nav className={styles.tabs} aria-label="Empresas cadastradas">
          {empresas.map((empresa) => (
            <button
              className={empresa.id === empresaAtivaId ? styles.tabActive : styles.tab}
              key={empresa.id}
              onClick={() => setEmpresaAtivaId(empresa.id)}
              type="button"
            >
              <Building2 size={17} /> {empresa.nome}
            </button>
          ))}
        </nav>

        <section className={styles.card}>
          <div className={styles.formGrid}>
            <label><span>Empresa</span><input value={empresaAtiva.nome} onChange={(e) => atualizarEmpresa({ nome: e.target.value })} /></label>
            <label><span>Mês</span><select value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((nome, i) => <option key={nome} value={i}>{nome}</option>)}</select></label>
            <label><span>Ano</span><input min={2020} max={2100} type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} /></label>
            <label><span>Valor da hora</span><input inputMode="decimal" value={empresaAtiva.valorHora} onChange={(e) => atualizarEmpresa({ valorHora: e.target.value })} /></label>
          </div>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={copiarLista} type="button"><ClipboardCopy size={18} /> Copiar lista</button>
            <button className={styles.secondaryButton} onClick={() => window.print()} type="button"><FileDown size={18} /> Imprimir / PDF</button>
          </div>
          {mensagem ? <p className={styles.message}>{mensagem}</p> : null}
        </section>

        <div className={styles.twoColumns}>
          <section className={styles.card}>
            <div className={styles.cardHeader}><div><h2><CalendarDays size={21} /> Feriados automáticos</h2><p>Desmarque datas que não devam entrar no cálculo.</p></div></div>
            <div className={styles.holidayList}>
              {feriadosAutomaticos.length ? feriadosAutomaticos.map((feriado) => (
                <label className={styles.checkboxRow} key={feriado.id}>
                  <input checked={feriado.selecionado} type="checkbox" onChange={() => alternarFeriadoAutomatico(feriado.id)} />
                  <span><strong>{formatarDataCurta(new Date(`${feriado.data}T12:00:00`))}</strong>{feriado.nome}</span>
                </label>
              )) : <p className={styles.empty}>Nenhum feriado automático neste mês.</p>}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div><h2><Plus size={21} /> Feriados adicionais</h2><p>Inclua feriados municipais ou específicos.</p></div>
              <button className={styles.smallButton} onClick={adicionarFeriadoManual} type="button"><Plus size={17} /> Adicionar</button>
            </div>
            <div className={styles.manualList}>
              {empresaAtiva.feriadosManuais.length ? empresaAtiva.feriadosManuais.map((feriado) => (
                <div className={styles.manualRow} key={feriado.id}>
                  <input aria-label="Data do feriado" type="date" value={feriado.data} onChange={(e) => atualizarFeriadoManual(feriado.id, "data", e.target.value)} />
                  <input aria-label="Nome do feriado" placeholder="Nome do feriado" value={feriado.nome} onChange={(e) => atualizarFeriadoManual(feriado.id, "nome", e.target.value)} />
                  <button className={styles.removeButton} onClick={() => removerFeriadoManual(feriado.id)} type="button" aria-label="Remover feriado"><Trash2 size={18} /></button>
                </div>
              )) : <p className={styles.empty}>Nenhum feriado adicional cadastrado.</p>}
            </div>
          </section>
        </div>

        <section className={styles.card}>
          <div className={styles.metrics}>
            <article><span>Horas totais</span><strong>{horasTotais} h</strong></article>
            <article><span>Valor por hora</span><strong>{formatarMoeda(valorHora)}</strong></article>
            <article><span>Valor total</span><strong>{formatarMoeda(valorTotal)}</strong></article>
          </div>
          <div className={styles.results}>
            <div><h2>Resumo para conferência</h2><pre>{resumo || "Nenhum plantão encontrado."}</pre></div>
            <div><h2>Lista detalhada para envio</h2><pre>{textoCompleto}</pre></div>
          </div>
        </section>
      </div>
    </main>
  );
}

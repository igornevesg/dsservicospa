"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, MessageCircle, Send } from "lucide-react";

const WHATSAPP_NUMBER = "5538999701900";

const serviceOptions = [
  "Vigilância Patrimonial",
  "Monitoramento com Drones",
  "Portaria",
  "Controle de Acesso",
  "Recepção",
  "Limpeza e Conservação",
  "Apoio Operacional",
  "Projeto completo de segurança",
  "Outro serviço"
];

type FormState = {
  nome: string;
  empresa: string;
  cnpj: string;
  telefone: string;
  servico: string;
  observacao: string;
};

type FieldName = keyof FormState;

const FIELD_LIMITS: Record<FieldName, number> = {
  nome: 80,
  empresa: 100,
  cnpj: 18,
  telefone: 15,
  servico: 60,
  observacao: 500
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}

function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  return true;
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const initialForm: FormState = {
  nome: "",
  empresa: "",
  cnpj: "",
  telefone: "",
  servico: "",
  observacao: ""
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const cleanPhone = useMemo(() => onlyDigits(form.telefone), [form.telefone]);

  function updateField(field: FieldName, value: string) {
    const rawValue = value.slice(0, FIELD_LIMITS[field]);
    const maskedValue = field === "cnpj" ? maskCnpj(rawValue) : field === "telefone" ? maskPhone(rawValue) : rawValue;

    setForm((current) => ({ ...current, [field]: maskedValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateForm() {
    const newErrors: Partial<Record<FieldName, string>> = {};

    if (!form.nome.trim()) newErrors.nome = "Informe seu nome.";
    if (!form.empresa.trim()) newErrors.empresa = "Informe o nome da empresa.";
    if (!form.cnpj.trim()) newErrors.cnpj = "Informe o CNPJ.";
    else if (!isValidCnpj(form.cnpj)) newErrors.cnpj = "Digite um CNPJ válido no formato 00.000.000/0000-00.";
    if (!form.telefone.trim()) newErrors.telefone = "Informe o WhatsApp.";
    else if (!isValidPhone(form.telefone)) newErrors.telefone = "Digite um telefone válido no formato (00) 00000-0000.";
    if (!form.servico) newErrors.servico = "Selecione um serviço.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    const mensagem = [
      "Olá, DS Serviços! Gostaria de solicitar um orçamento.",
      "",
      `Nome: ${sanitizeText(form.nome, FIELD_LIMITS.nome)}`,
      `Empresa: ${sanitizeText(form.empresa, FIELD_LIMITS.empresa)}`,
      `CNPJ: ${form.cnpj}`,
      `WhatsApp: ${form.telefone}`,
      `Serviço de interesse: ${sanitizeText(form.servico, FIELD_LIMITS.servico)}`,
      `Observação: ${sanitizeText(form.observacao, FIELD_LIMITS.observacao) || "Sem observações"}`
    ].join("\n");

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section id="contato" className="section contact-section">
      <div className="container contact-grid reveal">
        <div className="contact-copy">
          <p className="eyebrow">Solicite um orçamento</p>
          <h2>Fale com nossos <span>especialistas.</span></h2>
          <p>
            Preencha os dados abaixo e enviaremos sua solicitação diretamente para o WhatsApp da DS Serviços.
            Nossa equipe retornará com uma proposta personalizada para sua empresa.
          </p>
          <div className="contact-highlights">
            <div><MessageCircle /> Atendimento rápido pelo WhatsApp</div>
            <div><Send /> Dados organizados para agilizar seu orçamento</div>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row two-columns">
            <label>
              Nome
              <input
                required
                type="text"
                placeholder="Seu nome"
                maxLength={FIELD_LIMITS.nome}
                autoComplete="name"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
                aria-invalid={Boolean(errors.nome)}
              />
              {errors.nome && <span className="field-error"><AlertCircle size={14} /> {errors.nome}</span>}
            </label>
            <label>
              Nome da empresa
              <input
                required
                type="text"
                placeholder="Nome da empresa"
                maxLength={FIELD_LIMITS.empresa}
                autoComplete="organization"
                value={form.empresa}
                onChange={(event) => updateField("empresa", event.target.value)}
                aria-invalid={Boolean(errors.empresa)}
              />
              {errors.empresa && <span className="field-error"><AlertCircle size={14} /> {errors.empresa}</span>}
            </label>
          </div>

          <div className="form-row two-columns">
            <label>
              CNPJ
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={FIELD_LIMITS.cnpj}
                pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(event) => updateField("cnpj", event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  updateField("cnpj", event.clipboardData.getData("text"));
                }}
                aria-invalid={Boolean(errors.cnpj)}
              />
              {errors.cnpj && <span className="field-error"><AlertCircle size={14} /> {errors.cnpj}</span>}
            </label>
            <label>
              Telefone / WhatsApp
              <input
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={FIELD_LIMITS.telefone}
                pattern="\(\d{2}\) \d{4,5}-\d{4}"
                placeholder="(38) 99999-9999"
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  updateField("telefone", event.clipboardData.getData("text"));
                }}
                aria-invalid={Boolean(errors.telefone)}
              />
              {errors.telefone && <span className="field-error"><AlertCircle size={14} /> {errors.telefone}</span>}
              {!errors.telefone && cleanPhone.length > 0 && cleanPhone.length < 10 && (
                <span className="field-hint">Digite o DDD e o número completo.</span>
              )}
            </label>
          </div>

          <label>
            Serviço de interesse
            <select
              required
              value={form.servico}
              onChange={(event) => updateField("servico", event.target.value)}
              aria-invalid={Boolean(errors.servico)}
            >
              <option value="" disabled>Selecione um serviço</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            {errors.servico && <span className="field-error"><AlertCircle size={14} /> {errors.servico}</span>}
          </label>

          <label>
            Observação
            <textarea
              rows={5}
              maxLength={FIELD_LIMITS.observacao}
              placeholder="Conte um pouco sobre sua necessidade, local de atendimento ou quantidade de postos desejada."
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </label>

          <button className="btn btn-primary form-submit" type="submit">
            Enviar solicitação pelo WhatsApp <MessageCircle size={18} />
          </button>
          <small>Ao clicar, uma conversa será aberta no WhatsApp com os dados preenchidos.</small>
        </form>
      </div>
    </section>
  );
}

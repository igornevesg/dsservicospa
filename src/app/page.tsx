import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  Factory,
  Headset,
  Hospital,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Warehouse,
  RadioTower,
  Video,
  ClipboardList,
  UserCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { DroneVideo } from "@/components/DroneVideo";
import { ContactForm } from "@/components/ContactForm";

const whatsapp = "https://wa.me/5538999701900";

const stats = [
  { number: "+18", label: "anos de mercado", icon: ShieldCheck },
  { number: "+590", label: "colaboradores", icon: Users },
  { number: "+1.200", label: "postos ativos", icon: Building2 },
  { number: "24h", label: "de operação", icon: Clock3 },
  { number: "100%", label: "empresa autorizada", icon: BadgeCheck }
];

const services = [
  { title: "Vigilância Patrimonial", text: "Proteção preventiva com vigilantes treinados para garantir segurança de pessoas, patrimônios e operações.", icon: ShieldCheck, image: "service-vigilancia" },
  { title: "Monitoramento com Drones", text: "Monitoramento aéreo em tempo real para grandes áreas, condomínios, indústrias, fazendas, obras e eventos.", icon: RadioTower, image: "service-drone" },
  { title: "Portaria", text: "Controle rigoroso de entrada e saída de pessoas e veículos.", icon: DoorOpen, image: "service-portaria" },
  { title: "Controle de Acesso", text: "Tecnologia integrada para gerenciamento seguro de acessos.", icon: LockKeyhole, image: "service-acesso" },
  { title: "Recepção", text: "Profissionais preparados para representar sua empresa com excelência.", icon: Headset, image: "service-recepcao" },
  { title: "Limpeza e Conservação", text: "Equipes especializadas para manter ambientes limpos, organizados e seguros.", icon: Sparkles, image: "service-limpeza" },
  { title: "Apoio Operacional", text: "Terceirização de profissionais conforme a necessidade do cliente.", icon: ClipboardCheck, image: "service-apoio" }
];

const tech = [
  { label: "Monitoramento por drones", icon: RadioTower },
  { label: "Rondas programadas", icon: MapPin },
  { label: "Controle digital de ocorrências", icon: ClipboardList },
  { label: "Supervisão operacional", icon: UserCheck },
  { label: "Comunicação em tempo real", icon: Phone },
  { label: "Gestão estratégica de equipes", icon: Video }
];

const segments = [
  ["Indústrias", Factory],
  ["Condomínios", Building2],
  ["Hospitais", Hospital],
  ["Construção Civil", Warehouse],
  ["Mineradoras", Factory],
  ["Empresas", Building2],
  ["Fazendas", Warehouse],
  ["Eventos", Users]
] as const;

const benefits = [
  ["Equipe qualificada", Users],
  ["Tecnologia de ponta", Camera],
  ["Supervisão constante", UserCheck],
  ["Atendimento 24 horas", Headset],
  ["Projetos personalizados", ClipboardCheck],
  ["Resposta rápida", ShieldCheck]
] as const;

const faqs = [
  {
    question: "Quanto custa contratar os serviços da DS Serviços?",
    answer: "O valor depende do tipo de serviço, quantidade de profissionais, escala, local de atendimento, nível de risco e recursos envolvidos na operação. Por isso, a DS Serviços realiza uma análise personalizada para montar uma proposta adequada à necessidade de cada cliente."
  },
  {
    question: "Vocês atendem quais cidades?",
    answer: "Atendemos Montes Claros e região, com possibilidade de operação em outras cidades conforme o porte do contrato e a necessidade do cliente. Entre em contato para avaliarmos a viabilidade de atendimento no seu endereço."
  },
  {
    question: "Os vigilantes são treinados e uniformizados?",
    answer: "Sim. Nossos profissionais são uniformizados, orientados e preparados para atuar com postura, atenção, disciplina operacional e foco na prevenção de riscos, seguindo os procedimentos definidos para cada posto de serviço."
  },
  {
    question: "Como funciona o monitoramento por drones?",
    answer: "O monitoramento por drones permite ampliar a visão da operação, acompanhar grandes áreas em menos tempo e apoiar rondas, inspeções, eventos, obras, fazendas, condomínios e ambientes industriais. A solução pode ser integrada à estratégia de segurança definida para cada cliente."
  },
  {
    question: "Posso contratar apenas portaria ou recepção?",
    answer: "Sim. A DS Serviços oferece soluções individuais ou combinadas. Você pode contratar apenas portaria, recepção, controle de acesso, limpeza, vigilância, monitoramento com drones ou montar um projeto completo com vários serviços integrados."
  },
  {
    question: "A DS Serviços possui autorização para atuar?",
    answer: "Sim. A DS Serviços atua de forma regularizada, com estrutura preparada para oferecer serviços terceirizados e soluções de segurança conforme as exigências aplicáveis ao tipo de operação contratada."
  }
];

export default function Home() {
  return (
    <main id="conteudo">
      <Header />

      <section id="inicio" className="hero section-dark">
        <div className="container hero-inner">
          <div className="hero-content">
            <p className="eyebrow">Segurança inteligente</p>
            <h1>Segurança inteligente para proteger o que <span>realmente importa.</span></h1>
            <p>
              Soluções completas em segurança patrimonial, monitoramento com drones, portaria, controle de acesso,
              recepção e terceirização de mão de obra para empresas, indústrias, condomínios e grandes empreendimentos.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">Solicitar orçamento <MessageCircle size={18} /></Link>
              <Link className="btn btn-outline" href="#servicos">Conhecer serviços ↓</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section" aria-label="Indicadores da DS Serviços">
        <div className="container stats-card">
          {stats.map(({ number, label, icon: Icon }) => (
            <div className="stat" key={label}>
              <Icon />
              <strong>{number}</strong>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </section>

      <section id="sobre" className="section about-section">
        <div className="container about-grid reveal">
          <div className="photo-box about-photo" aria-label="Profissional de segurança corporativa em frente a prédio moderno" />
          <div className="about-copy">
            <p className="eyebrow">Quem somos</p>
            <h2>Segurança, tecnologia e <span>confiança.</span></h2>
            <p>A DS Serviços nasceu com um propósito claro: oferecer soluções completas em segurança patrimonial e terceirização de serviços com alto padrão de qualidade, tecnologia e profissionais altamente capacitados.</p>
            <p>Atendemos empresas de diversos segmentos, desenvolvendo projetos personalizados conforme a necessidade de cada cliente.</p>
            <p>Nossa atuação combina experiência operacional, gestão eficiente e inovação tecnológica para reduzir riscos, proteger patrimônios e garantir tranquilidade aos nossos clientes.</p>
          </div>
        </div>
      </section>

      <section id="servicos" className="section services-section">
        <div className="container center-title">
          <p className="eyebrow">Nossos serviços</p>
          <h2>Soluções completas para sua <span>segurança e tranquilidade.</span></h2>
          <div className="service-grid reveal">
            {services.map(({ title, text, icon: Icon, image }) => (
              <article className="service-card" key={title}>
                <Icon className="service-icon" />
                <h3>{title}</h3>
                <div className={`service-photo ${image}`} />
                <p>{text}</p>
                <Link href={whatsapp} target="_blank" aria-label={`Solicitar orçamento para ${title}`}>→</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tecnologia" className="tech-band section-dark">
        <div className="container tech-grid reveal">
          <div>
            <p className="eyebrow">Tecnologia que trabalha</p>
            <h2>pela sua <span>segurança.</span></h2>
            <p>Na DS Serviços utilizamos recursos tecnológicos para tornar nossas operações mais eficientes e inteligentes.</p>
          </div>
          <div className="tech-items">
            {tech.map(({ label, icon: Icon }) => <div key={label}><Icon /> <span>{label}</span></div>)}
          </div>
        </div>
      </section>

      <section className="section drone-section">
        <div className="container drone-grid reveal">
          <DroneVideo />
          <div>
            <p className="eyebrow">Monitoramento por drone</p>
            <h2>Uma nova visão da <span>segurança.</span></h2>
            <p>O monitoramento aéreo com drones amplia significativamente a capacidade de vigilância, permitindo acompanhar grandes áreas em poucos minutos.</p>
            <div className="list-columns">
              <div><h3>Ideal para:</h3>{["Indústrias", "Fazendas", "Condomínios", "Mineração", "Obras", "Centros Logísticos", "Eventos"].map(i => <p key={i}><CheckCircle2 />{i}</p>)}</div>
              <div><h3>Benefícios:</h3>{["Cobertura muito maior", "Redução de custos", "Imagens em tempo real", "Resposta imediata", "Registro das operações"].map(i => <p key={i}><CheckCircle2 />{i}</p>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="compact-section">
        <div className="container compact-grid reveal">
          <div>
            <p className="eyebrow">Segmentos atendidos</p>
            <h2>Atendemos os mais diversos segmentos.</h2>
            <div className="segment-grid">{segments.map(([name, Icon]) => <div key={name}><Icon />{name}</div>)}</div>
          </div>
          <div id="diferenciais">
            <p className="eyebrow">Por que escolher a DS Serviços?</p>
            <h2>Diferenciais que fazem a diferença.</h2>
            <div className="benefit-grid">{benefits.map(([name, Icon]) => <div key={name}><Icon />{name}</div>)}</div>
          </div>
        </div>
      </section>

      <section className="process section-dark">
        <div className="container process-grid reveal">
          <div><p className="eyebrow">Como funciona</p><h2>Um processo simples e eficiente.</h2></div>
          {["Solicite uma visita", "Analisamos os riscos", "Desenvolvemos o projeto", "Implantamos a operação", "Acompanhamento contínuo"].map((step, index) => (
            <div className="step" key={step}><span>{index + 1}</span><p>{step}</p></div>
          ))}
          <div className="process-cta">
            <h2>Vamos <span>proteger</span><br />seu patrimônio?</h2>
            <p>Nossa equipe está pronta para desenvolver um projeto personalizado para sua empresa.</p>
            <Link className="btn btn-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">Solicitar orçamento <MessageCircle size={18} /></Link>
          </div>
        </div>
      </section>

      <ContactForm />

      <section className="section faq-section">
        <div className="container center-title">
          <p className="eyebrow">Dúvidas frequentes</p>
          <h2>Perguntas frequentes</h2>
          <div className="faq-grid reveal">{faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <footer className="footer section-dark">
        <div className="container footer-grid">
          <div><Image src="/logo-ds-servicos.png" alt="DS Serviços" width={170} height={42} /><p>Segurança inteligente para proteger o que realmente importa.</p></div>
          <div><h3>Navegação</h3><Link href="#inicio">Início</Link><Link href="#servicos">Serviços</Link><Link href="#tecnologia">Tecnologia</Link><Link href="#sobre">Sobre nós</Link><Link href="#diferenciais">Diferenciais</Link></div>
          <div><h3>Serviços</h3>{services.slice(0, 6).map(s => <Link key={s.title} href="#servicos">{s.title}</Link>)}</div>
          <div><h3>Contato</h3><Link href="tel:+5538999701900"><Phone /> (38) 99970-1900</Link><p><MessageCircle /> WhatsApp 24h</p><p><MapPin /> Montes Claros - MG</p><div className="security-seals"><Image src="/selos-seguranca.png" alt="Google Safe Browsing, Compra Segura, Site Protegido e avaliações do consumidor" width={390} height={86} /></div></div>
        </div>
      </footer>

      <Link className="whatsapp-float" href={whatsapp} target="_blank" aria-label="Falar no WhatsApp"><MessageCircle /></Link>
    </main>
  );
}

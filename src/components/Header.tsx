"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, Menu, ShieldCheck, Sparkles, UserRound, X, Mail, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Início", href: "#inicio", icon: Home },
  { label: "Serviços", href: "#servicos", icon: ShieldCheck },
  { label: "Tecnologia", href: "#tecnologia", icon: Sparkles },
  { label: "Sobre nós", href: "#sobre", icon: UserRound },
  { label: "Diferenciais", href: "#diferenciais", icon: ShieldCheck },
  { label: "Contato", href: "#contato", icon: Mail }
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container header-inner">
        <Link href="#inicio" className="logo-link" aria-label="DS Serviços - Início" onClick={closeMenu}>
          <Image src="/logo-ds-servicos.png" alt="DS Serviços" width={170} height={37} priority />
        </Link>

        <nav className="desktop-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>

        <Link className="btn btn-primary header-cta" href="https://wa.me/5538999701900" target="_blank" rel="noopener noreferrer">
          Solicitar orçamento
        </Link>

        <button
          className="menu-button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <button
        aria-label="Fechar menu"
        className={`mobile-backdrop ${open ? "is-open" : ""}`}
        onClick={closeMenu}
        type="button"
      />

      <aside className={`mobile-menu ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="mobile-menu-header">
          <Image src="/logo-ds-servicos.png" alt="DS Serviços" width={190} height={42} />
          <button className="mobile-menu-close" aria-label="Fechar menu" onClick={closeMenu} type="button">
            <X size={28} />
          </button>
        </div>

        <nav className="mobile-menu-nav" aria-label="Menu mobile">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={closeMenu}>
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <Link className="btn btn-primary mobile-menu-cta" href="https://wa.me/5538999701900" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
          <MessageCircle size={18} />
          Solicitar orçamento
        </Link>

        <p className="mobile-menu-note">Atendimento rápido pelo WhatsApp para empresas, condomínios, obras, indústrias e eventos.</p>
      </aside>
    </header>
  );
}

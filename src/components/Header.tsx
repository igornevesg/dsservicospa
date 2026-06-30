"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Tecnologia", href: "#tecnologia" },
  { label: "Sobre nós", href: "#sobre" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Contato", href: "#contato" }
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
    return () => document.body.classList.remove("menu-open");
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

      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={closeMenu}>{item.label}</Link>
        ))}
        <Link className="btn btn-primary" href="https://wa.me/5538999701900" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
          Solicitar orçamento
        </Link>
      </div>
    </header>
  );
}

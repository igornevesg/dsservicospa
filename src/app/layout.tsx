import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dsservicospa.com.br"),
  title: {
    default: "DS Serviços | Segurança Patrimonial e Monitoramento com Drones",
    template: "%s | DS Serviços"
  },
  description:
    "Soluções completas em segurança patrimonial, monitoramento com drones, portaria, controle de acesso, recepção e terceirização de mão de obra.",
  keywords: [
    "DS Serviços",
    "segurança patrimonial",
    "monitoramento com drones",
    "portaria",
    "controle de acesso",
    "terceirização de serviços"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "DS Serviços | Segurança Inteligente",
    description: "Segurança patrimonial, monitoramento com drones, portaria, controle de acesso e facilities para empresas.",
    url: "https://dsservicospa.com.br",
    siteName: "DS Serviços",
    type: "website",
    locale: "pt_BR"
  },
  twitter: {
    card: "summary_large_image",
    title: "DS Serviços | Segurança Inteligente",
    description: "Soluções completas em segurança patrimonial, drones, portaria e facilities."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020b10"
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "DS Serviços",
  url: "https://dsservicospa.com.br",
  telephone: "+55 38 99970-1900",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Montes Claros",
    addressRegion: "MG",
    addressCountry: "BR"
  },
  areaServed: "Montes Claros e região",
  description: "Segurança patrimonial, monitoramento com drones, portaria, controle de acesso, recepção e terceirização de serviços."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head />
      <body>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}

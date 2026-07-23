import type { Metadata } from "next";
import { GeradorPlantoes } from "@/components/plantoes/GeradorPlantoes";

export const metadata: Metadata = {
  title: "Gerador de Plantões",
  description: "Ferramenta administrativa para cálculo mensal de plantões da DS Serviços.",
  robots: { index: false, follow: false },
};

export default function PlantoesPage() {
  return <GeradorPlantoes />;
}

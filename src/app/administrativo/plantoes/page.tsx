import type { Metadata } from "next";
import { GeradorPlantoes } from "@/components/plantoes/GeradorPlantoes";

export const metadata: Metadata = {
  title: "Plantões Especiais",
  description: "Cálculo de plantões para empresas atendidas exclusivamente em finais de semana e feriados.",
  robots: { index: false, follow: false },
};

export default function PlantoesPage() {
  return <GeradorPlantoes />;
}

export type Feriado = {
  id: string;
  data: string;
  nome: string;
  origem: "automatico" | "manual";
  selecionado: boolean;
};

export type EmpresaPlantao = {
  id: string;
  nome: string;
  valorHora: string;
  feriadosManuais: Array<{
    id: string;
    data: string;
    nome: string;
  }>;
};

export type Plantao = {
  chave: string;
  inicio: Date;
  fim: Date;
  dataExibicao: Date;
  dataGrupo: Date;
  horas: number;
  origem: "fim-de-semana" | "feriado";
};

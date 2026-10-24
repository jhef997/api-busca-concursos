export class LocalSource {
  constructor() {
    this.id = 'local_fallback';
    this.nome = 'Base Local de Contingência';
  }

  async buscarConcursos() {
    return {
      sucesso: true,
      dados: [
        {
          id: 'pmma-2026-01',
          titulo: 'Concurso Polícia Militar do Maranhão - PMMA',
          orgao: 'Polícia Militar do Maranhão (PM-MA)',
          cargo: 'Soldado / Oficial',
          escolaridade: 'Ensino Médio / Superior',
          vagas: 'A definir',
          remuneracao: 'R$ 4.800,00',
          uf: 'MA',
          municipio: 'São Luís',
          situacao: 'ABERTO',
          dataEncerramento: null,
          banca: 'A definir',
          linkFonte: 'https://www.ma.gov.br/pmma',
          fonteOrigem: 'Base Local',
          atualizadoEm: new Date().toISOString()
        },
        {
          id: 'cbmma-2026-02',
          titulo: 'Concurso Corpo de Bombeiros Militar do Maranhão - CBMMA',
          orgao: 'Corpo de Bombeiros Militar do Maranhão (CBM-MA)',
          cargo: 'Soldado Bombeiro Militar',
          escolaridade: 'Ensino Médio',
          vagas: 'A definir',
          remuneracao: 'R$ 4.500,00',
          uf: 'MA',
          municipio: 'São Luís',
          situacao: 'ABERTO',
          dataEncerramento: null,
          banca: 'A definir',
          linkFonte: 'https://www.ma.gov.br/cbmma',
          fonteOrigem: 'Base Local',
          atualizadoEm: new Date().toISOString()
        }
      ]
    };
  }

  async checarDisponibilidade() {
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

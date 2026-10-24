import { BaseSource } from './base.source.js';

export class LocalSource extends BaseSource {
  constructor() {
    super('local_fallback');
    this.id = 'local_fallback';
    this.nome = 'Base Local de Contingência';
  }

  async buscarConcursos() {
    return {
      sucesso: true,
      dados: [
        {
          id: 'pmma-2026-01',
          titulo: 'Concurso Polícia Militar do Maranhão',
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
          linkFonte: 'https://www.ma.gov.br',
          fonteOrigem: 'Base Local',
          atualizadoEm: new Date().toISOString()
        },
        {
          id: 'cbmma-2026-02',
          titulo: 'Concurso Corpo de Bombeiros Militar do Maranhão',
          orgao: 'CBM-MA',
          cargo: 'Soldado Bombeiro Militar',
          escolaridade: 'Ensino Médio',
          vagas: 'A definir',
          remuneracao: 'R$ 4.500,00',
          uf: 'MA',
          municipio: 'São Luís',
          situacao: 'ABERTO',
          dataEncerramento: null,
          banca: 'A definir',
          linkFonte: 'https://www.ma.gov.br',
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

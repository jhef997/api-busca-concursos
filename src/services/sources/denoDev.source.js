import axios from 'axios';
import { BaseSource } from './base.source.js';
import { gerarHashEstavel } from '../../utils/hash.util.js';
import { normalizarTexto } from '../../utils/text.util.js';

export class DenoDevSource extends BaseSource {
  constructor() {
    super('denodev');
    this.id = 'denodev';
    this.nome = 'DenoDev API';
  }

  async buscarConcursos() {
    try {
      const url = process.env.DENO_DEV_API_URL || 'https://concursos-br.deno.dev/api/v1/concursos';
      const response = await axios.get(url, { timeout: 8000 });

      if (!response.data || !Array.isArray(response.data)) {
        return { sucesso: true, dados: [] };
      }

      const dados = response.data.map(item => ({
        id: gerarHashEstavel(item.titulo || item.orgao || '', item.uf || ''),
        titulo: item.titulo || 'Concurso sem título',
        orgao: item.orgao || 'Não informado',
        cargo: item.cargo || item.titulo || 'Não informado',
        escolaridade: item.escolaridade || 'Não informada',
        vagas: item.vagas || 'Não informado',
        remuneracao: item.salario || 'Não informado',
        uf: item.uf ? item.uf.toUpperCase() : 'BR',
        municipio: item.municipio || null,
        situacao: item.situacao || 'ABERTO',
        dataEncerramento: item.dataEncerramento || null,
        banca: item.banca || 'Não informada',
        linkFonte: item.link || '',
        fonteOrigem: 'DenoDev',
        atualizadoEm: new Date().toISOString()
      }));

      return { sucesso: true, dados };
    } catch (error) {
      console.error('Erro na fonte DenoDev:', error.message);
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    try {
      const res = await this.buscarConcursos();
      return { id: this.id, nome: this.nome, disponivel: res.sucesso };
    } catch {
      return { id: this.id, nome: this.nome, disponivel: false };
    }
  }
}

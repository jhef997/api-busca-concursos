import Parser from 'rss-parser';
import { BaseSource } from './base.source.js';
import { gerarHashEstavel } from '../../utils/hash.util.js';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  timeout: 10000
});

export class PciRssSource extends BaseSource {
  constructor() {
    super('pci_rss');
    this.id = 'pci_rss';
    this.nome = 'PCI Concursos RSS';
  }

  async buscarConcursos() {
    try {
      const url = process.env.PCI_RSS_URL || 'https://www.pciconcursos.com.br/rss/';
      const feed = await parser.parseURL(url);

      if (!feed || !feed.items) {
        return { sucesso: true, dados: [] };
      }

      const dados = feed.items.map(item => ({
        id: gerarHashEstavel(item.title || '', 'BR'),
        titulo: item.title || 'Concurso sem título',
        orgao: item.title ? item.title.split('-')[0].trim() : 'Não informado',
        cargo: 'Consulte o edital',
        escolaridade: 'Consulte o edital',
        vagas: 'Consulte o edital',
        remuneracao: 'Consulte o edital',
        uf: 'BR',
        municipio: null,
        situacao: 'ABERTO',
        dataEncerramento: null,
        banca: 'Não informada',
        linkFonte: item.link || '',
        fonteOrigem: 'PCI Concursos RSS',
        atualizadoEm: new Date().toISOString()
      }));

      return { sucesso: true, dados };
    } catch (error) {
      console.error('Erro na fonte PCI RSS:', error.message);
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

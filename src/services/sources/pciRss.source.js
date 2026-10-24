import Parser from 'rss-parser';
import { gerarHashEstavel } from '../../utils/hash.util.js';

const parser = new Parser({ timeout: 8000 });

export class PciRssSource {
  constructor() {
    this.id = 'pci_rss';
    this.nome = 'PCI Concursos RSS';
  }

  async buscarConcursos() {
    try {
      const url = process.env.PCI_RSS_URL || 'https://www.pciconcursos.com.br/rss/';
      const feed = await parser.parseURL(url);

      if (!feed || !feed.items || !Array.isArray(feed.items)) {
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
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

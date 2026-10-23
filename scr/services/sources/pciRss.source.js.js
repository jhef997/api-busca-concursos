import Parser from 'rss-parser';
import { BaseSource } from './base.source.js';
import { SOURCES_CONFIG } from '../../config/sources.config.js';
import { gerarIdEstavel } from '../../utils/hash.util.js';
import { normalizarTexto, sanitizarUrlCanonica } from '../../utils/text.util.js';
import { formatarDataISO } from '../../utils/date.util.js';

export class PciRssSource extends BaseSource {
  constructor() {
    super('pcirss', 'PCI Concursos RSS', 'https://www.pciconcursos.com.br/rss/');
    this.parser = new Parser({ timeout: SOURCES_CONFIG.httpTimeoutMs });
  }

  async checarDisponibilidade() {
    const inicio = Date.now();
    try {
      const feed = await this.parser.parseURL(this.url);
      return {
        id: this.id,
        nome: this.nome,
        url: this.url,
        status: feed && Array.isArray(feed.items) ? 'OPERACIONAL' : 'INSTAVEL',
        latenciaMs: Date.now() - inicio,
        detalhes: `${feed?.items?.length || 0} itens retornados`
      };
    } catch (error) {
      return {
        id: this.id,
        nome: this.nome,
        url: this.url,
        status: 'INDISPONIVEL',
        latenciaMs: Date.now() - inicio,
        detalhes: error.code === 'ECONNABORTED' ? 'Timeout excedido' : error.message
      };
    }
  }

  async buscarConcursos() {
    try {
      const feed = await this.parser.parseURL(this.url);
      if (!feed || !Array.isArray(feed.items)) {
        return { sucesso: false, dados: [], erro: 'Estrutura XML/RSS inválida.' };
      }

      const formatados = feed.items.map(item => this.normalizar(item));
      return { sucesso: true, dados: formatados };
    } catch (error) {
      return {
        sucesso: false,
        dados: [],
        erro: error.code === 'ECONNABORTED' ? 'Tempo limite (timeout) atingido no RSS.' : error.message
      };
    }
  }

  normalizar(item) {
    const titulo = item.title ? item.title.trim() : 'Concurso Público';
    const urlCanonica = sanitizarUrlCanonica(item.link);
    const ufExtraida = this.extrairUfDoTitulo(titulo);

    const payloadHash = urlCanonica || `${normalizarTexto(titulo)}|${ufExtraida || 'BR'}`;
    const id = gerarIdEstavel(this.id, payloadHash);

    return {
      id,
      titulo,
      orgao: this.extrairOrgao(titulo),
      cargo: null,
      escolaridade: null,
      vagas: null,
      remuneracao: null,
      uf: ufExtraida,
      municipio: null,
      situacao: this.inferirSituacaoConservadora(titulo, item.contentSnippet),
      dataEncerramento: null,
      banca: null,
      linkFonte: urlCanonica || this.url,
      fonteOrigem: this.id,
      atualizadoEm: formatarDataISO(item.pubDate) || new Date().toISOString()
    };
  }

  inferirSituacaoConservadora(titulo, descricao) {
    const texto = normalizarTexto(`${titulo} ${descricao || ''}`);

    if (texto.includes('cancelad') || texto.includes('revogad')) return 'CANCELADO';
    if (texto.includes('suspen') || texto.includes('adiad')) return 'SUSPENSO';
    if (texto.includes('encerrad') || texto.includes('prorrogadas ate') === false && texto.includes('inscricoes encerradas')) return 'ENCERRADO';
    if (texto.includes('prorrogadas ate') || texto.includes('inscricoes abertas') || texto.includes('reabertas')) return 'ABERTO';
    if (texto.includes('previsto') || texto.includes('autorizado')) return 'PREVISTO';

    // Regra Conservadora: Notícias de "retificação", "homologação", "gabarito" são marcadas como INDEFINIDO
    return 'INDEFINIDO';
  }

  extrairUfDoTitulo(titulo) {
    if (!titulo) return null;
    const match = titulo.match(/\b([A-Z]{2})\b/);
    if (match && SOURCES_CONFIG.allowedUfs.includes(match[1])) {
      return match[1];
    }
    return null;
  }

  extrairOrgao(titulo) {
    if (!titulo) return null;
    const partes = titulo.split('-');
    return partes[0] ? partes[0].trim() : titulo;
  }
}
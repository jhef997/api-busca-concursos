import { LocalSource } from './sources/local.source.js';
import { DenoDevSource } from './sources/denoDev.source.js';
import { PciRssSource } from './sources/pciRss.source.js';
import { cacheService } from './cache.service.js';
import { normalizarTexto } from '../utils/text.util.js';
import { ServiceUnavailableError } from '../errors/api.errors.js';

class ConcursosService {
  constructor() {
    this.sources = [
      new LocalSource(),
      new DenoDevSource(),
      new PciRssSource()
    ];
  }

  async obterDadosAgregados() {
    const cacheKey = 'agregado_concursos_v1';
    const cachedRecord = cacheService.get(cacheKey);

    if (cachedRecord && !cachedRecord.obsoleto) {
      return cachedRecord;
    }

    if (!cacheService.fetchingLocks.has(cacheKey)) {
      const lockPromise = this.executarColetaEmRede(cacheKey, cachedRecord);
      cacheService.fetchingLocks.set(cacheKey, lockPromise);
    }

    if (cachedRecord && cachedRecord.obsoleto) {
      return cachedRecord;
    }

    return cacheService.fetchingLocks.get(cacheKey);
  }

  async executarColetaEmRede(cacheKey, fallbackCache) {
    try {
      const promessas = this.sources.map(fonte =>
        fonte.buscarConcursos().then(res => ({
          fonteId: fonte.id,
          nome: fonte.nome,
          resultado: res
        })).catch(err => ({
          fonteId: fonte.id,
          nome: fonte.nome,
          resultado: { sucesso: false, dados: [], erro: err.message }
        }))
      );

      const resultadosList = await Promise.allSettled(promessas);

      let todosConcursos = [];
      let relatorioFontes = [];
      let fontesComSucesso = 0;

      for (const item of resultadosList) {
        if (item.status === 'fulfilled' && item.value) {
          const { fonteId, nome, resultado } = item.value;
          if (resultado && resultado.sucesso && Array.isArray(resultado.dados)) {
            todosConcursos.push(...resultado.dados);
            relatorioFontes.push({ id: fonteId, nome, status: 'OPERACIONAL', erro: null });
            fontesComSucesso++;
          } else {
            relatorioFontes.push({ id: fonteId, nome, status: 'FALHA', erro: resultado?.erro || 'Erro desconhecido' });
          }
        }
      }

      if (fontesComSucesso === 0) {
        if (fallbackCache) {
          return fallbackCache;
        }
        throw new ServiceUnavailableError('Todas as fontes externas falharam e não há cache disponível.');
      }

      const concursosDeduplicados = this.deduplicarEMesclar(todosConcursos);
      cacheService.set(cacheKey, concursosDeduplicados, relatorioFontes);

      return cacheService.get(cacheKey);
    } finally {
      cacheService.fetchingLocks.delete(cacheKey);
    }
  }

  async buscarConcursosFiltrados(filtros = {}) {
    const { q, estado, municipio, orgao, cargo, situacao, pagina = 1, limite = 20 } = filtros;
    const registroCache = await this.obterDadosAgregados();

    let filtrados = registroCache.dados.filter(c => {
      if (q) {
        const termo = normalizarTexto(q);
        const emTitulo = normalizarTexto(c.titulo).includes(termo);
        const emOrgao = normalizarTexto(c.orgao).includes(termo);
        const emCargo = normalizarTexto(c.cargo).includes(termo);
        if (!emTitulo && !emOrgao && !emCargo) return false;
      }

      if (estado) {
        if (!c.uf || c.uf.toUpperCase() !== estado.toUpperCase()) return false;
      }

      if (municipio) {
        if (!c.municipio || !normalizarTexto(c.municipio).includes(normalizarTexto(municipio))) return false;
      }

      if (orgao) {
        if (!c.orgao || !normalizarTexto(c.orgao).includes(normalizarTexto(orgao))) return false;
      }

      if (cargo) {
        if (!c.cargo || !normalizarTexto(c.cargo).includes(normalizarTexto(cargo))) return false;
      }

      if (situacao) {
        if (!c.situacao || c.situacao.toUpperCase() !== situacao.toUpperCase()) return false;
      }

      return true;
    });

    const pageNum = Math.max(1, parseInt(pagina, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limite, 10) || 20));
    const inicio = (pageNum - 1) * limitNum;
    const paginados = filtrados.slice(inicio, inicio + limitNum);

    return {
      sucesso: true,
      dados: paginados,
      total: filtrados.length,
      pagina: pageNum,
      limite: limitNum,
      cacheObsoleto: registroCache.obsoleto || false,
      ultimaAtualizacao: registroCache.ultimaAtualizacaoIso,
      fontes: registroCache.fontes
    };
  }

  async buscarPorId(id) {
    const registroCache = await this.obterDadosAgregados();
    return registroCache.dados.find(c => c.id === id) || null;
  }

  deduplicarEMesclar(concursos) {
    const mapa = new Map();

    concursos.forEach(item => {
      const chaveDeduplicacao = item.linkFonte && item.linkFonte.startsWith('http')
        ? normalizarTexto(item.linkFonte)
        : `${normalizarTexto(item.titulo)}|${normalizarTexto(item.orgao)}|${item.uf || 'BR'}`;

      if (!mapa.has(chaveDeduplicacao)) {
        mapa.set(chaveDeduplicacao, {
          ...item,
          fontesEncontradas: [item.fonteOrigem]
        });
      } else {
        const existente = mapa.get(chaveDeduplicacao);

        mapa.set(chaveDeduplicacao, {
          id: existente.id,
          titulo: existente.titulo.length >= item.titulo.length ? existente.titulo : item.titulo,
          orgao: existente.orgao || item.orgao,
          cargo: existente.cargo || item.cargo,
          escolaridade: existente.escolaridade || item.escolaridade,
          vagas: existente.vagas || item.vagas,
          remuneracao: existente.remuneracao || item.remuneracao,
          uf: existente.uf || item.uf,
          municipio: existente.municipio || item.municipio,
          situacao: existente.situacao !== 'INDEFINIDO' ? existente.situacao : item.situacao,
          dataEncerramento: existente.dataEncerramento || item.dataEncerramento,
          banca: existente.banca || item.banca,
          linkFonte: existente.linkFonte || item.linkFonte,
          fontesEncontradas: Array.from(new Set([...existente.fontesEncontradas, item.fonteOrigem])),
          atualizadoEm: existente.atualizadoEm
        });
      }
    });

    return Array.from(mapa.values());
  }

  async diagnosticarTodasFontes() {
    const relatorios = await Promise.all(this.sources.map(f => f.checarDisponibilidade()));
    return relatorios;
  }
}

export const concursosService = new ConcursosService();

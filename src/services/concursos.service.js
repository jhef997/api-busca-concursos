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
            relatorioFontes.push({ id: fonteId, nome, status: 'FALHA', erro: resultado?.erro || 'Erro na fonte' });
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

    const listaDados = (registroCache && Array.isArray(registroCache.dados)) ? registroCache.dados : [];

    let filtrados = listaDados.filter(c => {
      if (!c) return false;

      if (q) {
        const termo = normalizarTexto(q);
        const emTitulo = normalizarTexto(c.titulo || '').includes(termo);
        const emOrgao = normalizarTexto(c.orgao || '').includes(termo);
        const emCargo = normalizarTexto(c.cargo || '').includes(termo);
        if (!emTitulo && !emOrgao && !emCargo) return false;
      }

      if (estado) {
        if (!c.uf || String(c.uf).toUpperCase() !== String(estado).toUpperCase()) return false;
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
        if (!c.situacao || String(c.situacao).toUpperCase() !== String(situacao).toUpperCase()) return false;
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
      cacheObsoleto: registroCache?.obsoleto || false,
      ultimaAtualizacao: registroCache?.ultimaAtualizacaoIso || new Date().toISOString(),
      fontes: registroCache?.fontes || []
    };
  }

  async buscarPorId(id) {
    const registroCache = await this.obterDadosAgregados();
    const listaDados = (registroCache && Array.isArray(registroCache.dados)) ? registroCache.dados : [];
    return listaDados.find(c => c && c.id === id) || null;
  }

  deduplicarEMesclar(concursos) {
    if (!Array.isArray(concursos)) return [];
    const mapa = new Map();

    concursos.forEach(item => {
      if (!item) return;

      const tituloStr = String(item.titulo || 'Concurso sem título');
      const orgaoStr = String(item.orgao || 'Não informado');
      const ufStr = String(item.uf || 'BR');

      const chaveDeduplicacao = item.linkFonte && String(item.linkFonte).startsWith('http')
        ? normalizarTexto(String(item.linkFonte))
        : `${normalizarTexto(tituloStr)}|${normalizarTexto(orgaoStr)}|${ufStr}`;

      if (!mapa.has(chaveDeduplicacao)) {
        mapa.set(chaveDeduplicacao, {
          ...item,
          titulo: tituloStr,
          orgao: orgaoStr,
          uf: ufStr,
          fontesEncontradas: [item.fonteOrigem || 'Base Local']
        });
      } else {
        const existente = mapa.get(chaveDeduplicacao);
        const tituloExistente = String(existente.titulo || '');

        mapa.set(chaveDeduplicacao, {
          id: existente.id || item.id,
          titulo: tituloExistente.length >= tituloStr.length ? tituloExistente : tituloStr,
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
          fontesEncontradas: Array.from(new Set([...(existente.fontesEncontradas || []), item.fonteOrigem || 'Base Local'])),
          atualizadoEm: existente.atualizadoEm || new Date().toISOString()
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

import NodeCache from 'node-cache';
import { SOURCES_CONFIG } from '../config/sources.config.js';

class CacheService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 0, checkperiod: 600 });
    this.fetchingLocks = new Map();
  }

  get(key) {
    const record = this.cache.get(key);
    if (!record) return null;

    const agora = Date.now();
    const idadeSegundos = Math.floor((agora - record.timestamp) / 1000);

    const isFrescorValido = idadeSegundos <= SOURCES_CONFIG.cacheTtlSeconds;
    const isDentroDoLimiteStale = idadeSegundos <= SOURCES_CONFIG.cacheMaxStaleSeconds;

    if (!isDentroDoLimiteStale) {
      this.cache.del(key);
      return null;
    }

    return {
      dados: record.dados,
      fontes: record.fontes,
      obsoleto: !isFrescorValido,
      timestamp: record.timestamp,
      ultimaAtualizacaoIso: new Date(record.timestamp).toISOString()
    };
  }

  set(key, dados, fontes) {
    if (!Array.isArray(dados)) return;
    this.cache.set(key, {
      dados,
      fontes,
      timestamp: Date.now()
    });
  }

  flush() {
    this.cache.flushAll();
    this.fetchingLocks.clear();
  }
}

export const cacheService = new CacheService();
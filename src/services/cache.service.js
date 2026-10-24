class CacheService {
  constructor(ttlMinutos = 30) {
    this.cache = new Map();
    this.ttlMs = ttlMinutos * 60 * 1000;
    this.fetchingLocks = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    const agora = Date.now();
    const obsoleto = (agora - item.timestamp) > this.ttlMs;
    return { ...item, obsoleto };
  }

  set(key, dados, fontes = []) {
    this.cache.set(key, {
      dados: Array.isArray(dados) ? dados : [],
      fontes: Array.isArray(fontes) ? fontes : [],
      timestamp: Date.now(),
      ultimaAtualizacaoIso: new Date().toISOString()
    });
  }
}

export const cacheService = new CacheService();

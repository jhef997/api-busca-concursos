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

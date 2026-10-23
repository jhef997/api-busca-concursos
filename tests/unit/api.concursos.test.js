import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { cacheService } from '../../src/services/cache.service.js';
import { concursosService } from '../../src/services/concursos.service.js';

describe('🧪 Integração - Endpoints REST e Resiliência de Cache', () => {
  beforeEach(() => {
    cacheService.flush();
    jest.restoreAllMocks();
  });

  test('GET /api/concursos - Busca com acento (policia) deve retornar resultados normalizados', async () => {
    jest.spyOn(concursosService, 'obterDadosAgregados').mockResolvedValue({
      dados: [
        { id: 'test-1', titulo: 'Concurso Polícia Civil', orgao: 'PC-MA', uf: 'MA', situacao: 'ABERTO' }
      ],
      obsoleto: false,
      ultimaAtualizacaoIso: new Date().toISOString(),
      fontes: []
    });

    const res = await request(app).get('/api/concursos?q=policia');
    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.dados[0].titulo).toContain('Polícia');
  });

  test('GET /api/concursos - UF inválida deve retornar HTTP 400 Validation Error', async () => {
    const res = await request(app).get('/api/concursos?estado=XX_INVALIDO');
    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.erro).toContain('Parâmetro "estado" inválido');
  });

  test('GET /api/concursos - Falha total de redes sem cache deve responder HTTP 503', async () => {
    jest.spyOn(concursosService, 'obterDadosAgregados').mockRejectedValue(
      new (await import('../../src/errors/api.errors.js')).ServiceUnavailableError()
    );

    const res = await request(app).get('/api/concursos');
    expect(res.status).toBe(503);
    expect(res.body.sucesso).toBe(false);
  });
});
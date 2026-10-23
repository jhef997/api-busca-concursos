import { normalizarTexto, sanitizarUrlCanonica } from '../../src/utils/text.util.js';
import { gerarIdEstavel } from '../../src/utils/hash.util.js';

describe('🧪 Unidade - Utilitários de Texto e Hash', () => {
  test('normalizarTexto - Deve remover acentos, espaços duplos e converter maiúsculas', () => {
    expect(normalizarTexto('  Polícia   Civil  do  MARANHÃO ')).toBe('policia civil do maranhaos');
  });

  test('sanitizarUrlCanonica - Deve remover UTMs e query params de rastreamento', () => {
    const urlSuja = 'https://www.pciconcursos.com.br/concurso/pm-ma?utm_source=rss&fbclid=12345';
    expect(sanitizarUrlCanonica(urlSuja)).toBe('https://www.pciconcursos.com.br/concurso/pm-ma');
  });

  test('gerarIdEstavel - Deve gerar hashes SHA-256 determinísticos imutáveis', () => {
    const id1 = gerarIdEstavel('denodev', 'https://site.com/edital-1');
    const id2 = gerarIdEstavel('denodev', 'https://site.com/edital-1');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^denodev-[a-f0-9]{16}$/);
  });
});
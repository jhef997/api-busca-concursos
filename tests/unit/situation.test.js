import { DenoDevSource } from '../../src/services/sources/denoDev.source.js';
import { PciRssSource } from '../../src/services/sources/pciRss.source.js';

describe('🧪 Unidade - Classificação Conservadora de Situação', () => {
  const deno = new DenoDevSource();
  const pci = new PciRssSource();

  test('Deve encerrar concursos com data limite vencida no passado', () => {
    const ontem = new Date(Date.now() - 86400000).toISOString();
    expect(deno.normalizarSituacao('Inscrições Abertas', ontem)).toBe('ENCERRADO');
  });

  test('Deve classificar "Inscrições Encerradas" como ENCERRADO e não ABERTO', () => {
    expect(deno.normalizarSituacao('Inscrições Encerradas', null)).toBe('ENCERRADO');
  });

  test('Deve classificar "Concurso Suspenso" como SUSPENSO', () => {
    expect(deno.normalizarSituacao('Edital Suspenso por decisão judicial', null)).toBe('SUSPENSO');
  });

  test('Notícias de Retificação no RSS devem resultar em INDEFINIDO no modo conservador', () => {
    expect(pci.inferirSituacaoConservadora('Retificação do Edital N. 01 - PM-MA', 'Altera local de prova')).toBe('INDEFINIDO');
  });
});
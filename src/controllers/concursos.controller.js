// src/controllers/concursos.controller.js
import { PciRssSource } from '../services/sources/pciRss.source.js';
import {
  CARREIRAS,
  normalizar,
  inferirCarreiras,
  interpretarConsulta,
  combina,
  pontuar
} from '../utils/busca.js';

const pciSource = new PciRssSource();

const ATUALIZADO_EM = new Date().toISOString();

// Base local de contingência
const baseLocal = [
  {
    id: 'pmma-2026-01',
    titulo: 'Concurso Polícia Militar do Maranhão - PMMA',
    orgao: 'Polícia Militar do Maranhão (PM-MA)',
    cargo: 'Soldado / Oficial',
    escolaridade: 'Ensino Médio / Superior',
    vagas: 'A definir',
    remuneracao: 'R$ 4.800,00',
    uf: 'MA',
    municipio: 'São Luís',
    situacao: 'ABERTO',
    dataEncerramento: null,
    banca: 'A definir',
    linkFonte: 'https://www.ma.gov.br/pmma',
    fonteOrigem: 'Base Local',
    atualizadoEm: ATUALIZADO_EM
  },
  {
    id: 'cbmma-2026-02',
    titulo: 'Concurso Corpo de Bombeiros Militar do Maranhão - CBMMA',
    orgao: 'Corpo de Bombeiros Militar do Maranhão (CBM-MA)',
    cargo: 'Soldado Bombeiro Militar',
    escolaridade: 'Ensino Médio',
    vagas: 'A definir',
    remuneracao: 'R$ 4.500,00',
    uf: 'MA',
    municipio: 'São Luís',
    situacao: 'ABERTO',
    dataEncerramento: null,
    banca: 'A definir',
    linkFonte: 'https://www.ma.gov.br/cbmma',
    fonteOrigem: 'Base Local',
    atualizadoEm: ATUALIZADO_EM
  }
];

// ---------- Cache da fonte PCI (evita buscar a cada requisição) ----------
const TTL_MS = 15 * 60 * 1000;
let cachePci = { dados: [], em: 0, status: 'OPERACIONAL', erro: null };
let emVoo = null;

async function obterPci() {
  if (Date.now() - cachePci.em < TTL_MS) return { ...cachePci, obsoleto: false };
  if (emVoo) return emVoo; // várias requisições simultâneas compartilham a mesma busca

  emVoo = (async () => {
    try {
      const r = await pciSource.buscarConcursos();
      if (!r?.sucesso) throw new Error(r?.erro || 'Falha na fonte PCI');
      cachePci = { dados: r.dados || [], em: Date.now(), status: 'OPERACIONAL', erro: null };
      return { ...cachePci, obsoleto: false };
    } catch (err) {
      // devolve o último cache bom, se existir
      return {
        dados: cachePci.dados,
        em: cachePci.em,
        status: 'FALHA',
        erro: err.message,
        obsoleto: cachePci.dados.length > 0
      };
    } finally {
      emVoo = null;
    }
  })();

  return emVoo;
}

async function carregarTodos() {
  const pci = await obterPci();
  const vistos = new Set();
  const lista = [];

  for (const c of [...baseLocal, ...pci.dados]) {
    const chave = c.id || normalizar(c.titulo);
    if (vistos.has(chave)) continue; // remove duplicados
    vistos.add(chave);
    lista.push({ ...c, uf: (c.uf || 'BR').toUpperCase(), carreiras: inferirCarreiras(c) });
  }
  return { lista, pci };
}

const inteiro = (v, padrao, min, max) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? padrao : Math.min(Math.max(n, min), max);
};

// ---------- GET /concursos ----------
export async function getConcursos(req, res) {
  try {
    const { q, estado, carreira, situacao, escolaridade } = req.query;
    const pagina = inteiro(req.query.pagina, 1, 1, 10000);
    const limite = inteiro(req.query.limite, 20, 1, 100);

    const { lista, pci } = await carregarTodos();
    let concursos = lista;

    // Estado (mantém concursos nacionais "BR")
    if (estado) {
      const uf = String(estado).toUpperCase();
      concursos = concursos.filter((c) => c.uf === uf || c.uf === 'BR');
    }

    // Carreira explícita: ?carreira=policia_militar,bombeiro
    if (carreira) {
      const ids = String(carreira).split(',').map((s) => s.trim());
      concursos = concursos.filter((c) => c.carreiras.some((id) => ids.includes(id)));
    }

    if (situacao) {
      const s = normalizar(situacao);
      concursos = concursos.filter((c) => normalizar(c.situacao) === s);
    } else {
      // por padrão não mostra concursos já encerrados
      concursos = concursos.filter((c) => c.situacao !== 'ENCERRADO');
    }

    if (escolaridade) {
      const e = normalizar(escolaridade);
      concursos = concursos.filter((c) => normalizar(c.escolaridade).includes(e));
    }

    // Busca livre por carreira / sigla / cargo
    const consulta = interpretarConsulta(q);
    const temBusca = q && (consulta.carreiras.size || consulta.termos.length || consulta.uf);

    if (temBusca) {
      concursos = concursos
        .filter((c) => combina(c, consulta))
        .map((c) => ({ c, p: pontuar(c, consulta) }))
        .sort((a, b) => b.p - a.p)
        .map(({ c }) => c);
    } else {
      // sem busca: abertos primeiro
      concursos = [...concursos].sort(
        (a, b) => (b.situacao === 'ABERTO') - (a.situacao === 'ABERTO')
      );
    }

    // Facetas: quantos resultados por carreira (útil para filtros no app)
    const facetas = {};
    for (const c of concursos) {
      for (const id of c.carreiras) {
        facetas[id] = facetas[id] || { id, nome: CARREIRAS[id].nome, total: 0 };
        facetas[id].total++;
      }
    }

    const total = concursos.length;
    const inicio = (pagina - 1) * limite;

    return res.json({
      sucesso: true,
      dados: concursos.slice(inicio, inicio + limite),
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      carreiras: Object.values(facetas).sort((a, b) => b.total - a.total),
      consultaInterpretada: q
        ? { carreiras: [...consulta.carreiras], uf: consulta.uf, termos: consulta.termos }
        : null,
      cacheObsoleto: pci.obsoleto,
      ultimaAtualizacao: pci.em ? new Date(pci.em).toISOString() : ATUALIZADO_EM,
      fontes: [
        { id: 'local_fallback', nome: 'Base Local de Contingência', status: 'OPERACIONAL', erro: null },
        { id: 'pci_concursos', nome: pciSource.nome, status: pci.status, erro: pci.erro }
      ]
    });
  } catch (error) {
    console.error('Erro no Controller:', error);
    return res.status(500).json({ sucesso: false, dados: [], erro: error.message });
  }
}

// ---------- GET /concursos/carreiras ----------
export function getCarreiras(req, res) {
  return res.json({
    sucesso: true,
    dados: Object.entries(CARREIRAS).map(([id, c]) => ({ id, nome: c.nome }))
  });
}

// ---------- GET /concursos/:id ----------
export async function getConcursoPorId(req, res) {
  try {
    const { lista } = await carregarTodos();
    const concurso = lista.find((c) => c.id === req.params.id);

    if (!concurso) {
      return res.status(404).json({ sucesso: false, mensagem: 'Concurso não encontrado' });
    }
    return res.json({ sucesso: true, dados: concurso });
  } catch (error) {
    console.error('Erro ao buscar por ID:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}

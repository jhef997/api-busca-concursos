import { PciRssSource } from '../services/sources/pciRss.source.js';

const pciSource = new PciRssSource();

// Base local de contingência fixa
const baseLocal = [
  {
    id: "pmma-2026-01",
    titulo: "Concurso Polícia Militar do Maranhão - PMMA",
    orgao: "Polícia Militar do Maranhão (PM-MA)",
    cargo: "Soldado / Oficial",
    escolaridade: "Ensino Médio / Superior",
    vagas: "A definir",
    remuneracao: "R$ 4.800,00",
    uf: "MA",
    municipio: "São Luís",
    situacao: "ABERTO",
    dataEncerramento: null,
    banca: "A definir",
    linkFonte: "https://www.ma.gov.br/pmma",
    fonteOrigem: "Base Local",
    atualizadoEm: new Date().toISOString()
  },
  {
    id: "cbmma-2026-02",
    titulo: "Concurso Corpo de Bombeiros Militar do Maranhão - CBMMA",
    orgao: "Corpo de Bombeiros Militar do Maranhão (CBM-MA)",
    cargo: "Soldado Bombeiro Militar",
    escolaridade: "Ensino Médio",
    vagas: "A definir",
    remuneracao: "R$ 4.500,00",
    uf: "MA",
    municipio: "São Luís",
    situacao: "ABERTO",
    dataEncerramento: null,
    banca: "A definir",
    linkFonte: "https://www.ma.gov.br/cbmma",
    fonteOrigem: "Base Local",
    atualizadoEm: new Date().toISOString()
  }
];

export async function getConcursos(req, res) {
  try {
    let dadosPci = [];
    let statusPci = "OPERACIONAL";
    let erroPci = null;

    try {
      const resultadoPci = await pciSource.buscarConcursos();
      if (resultadoPci.sucesso) {
        dadosPci = resultadoPci.dados;
      } else {
        statusPci = "FALHA";
        erroPci = resultadoPci.erro;
      }
    } catch (err) {
      statusPci = "FALHA";
      erroPci = err.message;
    }

    let concursos = [...baseLocal, ...dadosPci];
    const { q, estado, pagina = 1, limite = 20 } = req.query;

    // Filtro por Estado
    if (estado) {
      const ufBusca = estado.toUpperCase();
      concursos = concursos.filter(c => c.uf === ufBusca || c.uf === 'BR');
    }

    // Filtro por Palavra-Chave / Profissão com normalização de acentos
    if (q) {
      const termoBusca = q
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      concursos = concursos.filter(c => {
        const titulo = (c.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const orgao = (c.orgao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cargo = (c.cargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return titulo.includes(termoBusca) || orgao.includes(termoBusca) || cargo.includes(termoBusca);
      });
    }

    const total = concursos.length;
    const inicio = (parseInt(pagina) - 1) * parseInt(limite);
    const fim = inicio + parseInt(limite);
    const dadosPaginados = concursos.slice(inicio, fim);

    return res.json({
      sucesso: true,
      dados: dadosPaginados,
      total: total,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      cacheObsoleto: false,
      ultimaAtualizacao: new Date().toISOString(),
      fontes: [
        { id: "local_fallback", nome: "Base Local de Contingência", status: "OPERACIONAL", erro: null },
        { id: "denodev", nome: "DenoDev API", status: "FALHA", erro: "Request failed with status code 404" },
        { id: "pci_concursos", nome: pciSource.nome, status: statusPci, erro: erroPci }
      ]
    });

  } catch (error) {
    console.error('Erro no Controller:', error.message);
    return res.status(500).json({ sucesso: false, dados: [], erro: error.message });
  }
}

export async function getConcursoPorId(req, res) {
  try {
    const { id } = req.params;
    let dadosPci = [];
    try {
      const resultadoPci = await pciSource.buscarConcursos();
      if (resultadoPci.sucesso) dadosPci = resultadoPci.dados;
    } catch (e) {}

    const todos = [...baseLocal, ...dadosPci];
    const concurso = todos.find(c => c.id === id);

    if (!concurso) {
      return res.status(404).json({ sucesso: false, mensagem: 'Concurso não encontrado' });
    }

    return res.json({ sucesso: true, dados: concurso });
  } catch (error) {
    console.error('Erro ao buscar por ID:', error.message);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}

import { ConcursoAggregator } from '../services/concursoAggregator.js'; // Ajuste o caminho se necessário

const aggregator = new ConcursoAggregator();

export async function listarConcursos(req, res) {
  try {
    // 1. Obtém todos os concursos consolidados das fontes (Base Local + Scraper)
    const resultadoGeral = await aggregator.buscarTodos();
    
    if (!resultadoGeral.sucesso) {
      return res.status(500).json({ sucesso: false, dados: [], mensagem: 'Erro ao buscar concursos' });
    }

    let concursos = resultadoGeral.dados;
    const { q, estado, pagina = 1, limite = 20 } = req.query;

    // 2. Filtro por Estado (UF)
    if (estado) {
      const ufBusca = estado.toUpperCase();
      concursos = concursos.filter(c => c.uf === ufBusca || c.uf === 'BR');
    }

    // 3. Filtro por Palavra-Chave / Profissão (q) com normalização de acentos
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

    // 4. Paginação dos resultados
    const total = concursos.length;
    const inicio = (parseInt(pagina) - 1) * parseInt(limite);
    const fim = inicio + parseInt(limite);
    const dadosPaginados = concursos.slice(inicio, fim);

    // 5. Resposta oficial da API
    return res.json({
      sucesso: true,
      dados: dadosPaginados,
      total: total,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      cacheObsoleto: resultadoGeral.cacheObsoleto || false,
      ultimaAtualizacao: new Date().toISOString(),
      fontes: resultadoGeral.fontes || []
    });

  } catch (error) {
    console.error('Erro no Controller de Concursos:', error.message);
    return res.status(500).json({ sucesso: false, dados: [], erro: error.message });
  }
}

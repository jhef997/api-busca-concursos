import { ConcursoAggregator } from '../services/concursoAggregator.js';

const aggregator = new ConcursoAggregator();

export async function getConcursos(req, res) {
  try {
    const resultadoGeral = await aggregator.buscarTodos();
    
    if (!resultadoGeral.sucesso) {
      return res.status(500).json({ sucesso: false, dados: [], mensagem: 'Erro ao buscar concursos' });
    }

    let concursos = resultadoGeral.dados;
    const { q, estado, pagina = 1, limite = 20 } = req.query;

    if (estado) {
      const ufBusca = estado.toUpperCase();
      concursos = concursos.filter(c => c.uf === ufBusca || c.uf === 'BR');
    }

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
      cacheObsoleto: resultadoGeral.cacheObsoleto || false,
      ultimaAtualizacao: new Date().toISOString(),
      fontes: resultadoGeral.fontes || []
    });

  } catch (error) {
    console.error('Erro no Controller de Concursos:', error.message);
    return res.status(500).json({ sucesso: false, dados: [], erro: error.message });
  }
}

export async function getConcursoPorId(req, res) {
  try {
    const { id } = req.params;
    const resultadoGeral = await aggregator.buscarTodos();

    if (!resultadoGeral.sucesso) {
      return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar concursos' });
    }

    const concurso = resultadoGeral.dados.find(c => c.id === id);

    if (!concurso) {
      return res.status(404).json({ sucesso: false, mensagem: 'Concurso não encontrado' });
    }

    return res.json({ sucesso: true, dados: concurso });
  } catch (error) {
    console.error('Erro ao buscar concurso por ID:', error.message);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}

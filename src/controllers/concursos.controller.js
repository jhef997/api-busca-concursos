import { concursosService } from '../services/concursos.service.js';
import { SOURCES_CONFIG } from '../config/sources.config.js';
import { ValidationError, NotFoundError } from '../errors/api.errors.js';

export async function getConcursos(req, res, next) {
  try {
    const { q, estado, municipio, orgao, cargo, situacao, pagina, limite } = req.query;

    if (estado && !SOURCES_CONFIG.allowedUfs.includes(estado.toUpperCase())) {
      throw new ValidationError('Parâmetro "estado" inválido. Envie uma sigla de UF válida com 2 letras (ex: MA, SP, DF).');
    }

    if (situacao) {
      const situacoesValidas = ['ABERTO', 'PREVISTO', 'ENCERRADO', 'SUSPENSO', 'CANCELADO', 'INDEFINIDO'];
      if (!situacoesValidas.includes(situacao.toUpperCase())) {
        throw new ValidationError(`Parâmetro "situacao" inválido. Valores aceitos: ${situacoesValidas.join(', ')}.`);
      }
    }

    const resultado = await concursosService.buscarConcursosFiltrados({
      q, estado, municipio, orgao, cargo, situacao, pagina, limite
    });

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getConcursoPorId(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Identificador do concurso é obrigatório.');
    }

    const concurso = await concursosService.buscarPorId(id);

    if (!concurso) {
      throw new NotFoundError('Concurso não encontrado para o identificador fornecido.');
    }

    return res.status(200).json({
      sucesso: true,
      dado: concurso
    });
  } catch (error) {
    next(error);
  }
}

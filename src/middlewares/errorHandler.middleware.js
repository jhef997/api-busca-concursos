import { AppError } from '../errors/api.errors.js';

export function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      sucesso: false,
      erro: err.message
    });
  }

  // Erros inesperados não vazam stack traces para o usuário final em produção
  console.error('[ERRO INTERNO NÃO TRATADO]:', err);

  return res.status(500).json({
    sucesso: false,
    erro: 'Erro interno no servidor ao processar a solicitação.',
    ...(isDev && { detalheTecnico: err.message, stack: err.stack })
  });
}

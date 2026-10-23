import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // Janela de 15 minutos (900.000 ms)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Máximo de 100 requisições por IP
  standardHeaders: true, // Retorna os cabeçalhos padrão RateLimit-* no HTTP
  legacyHeaders: false, // Desabilita os cabeçalhos antigos X-RateLimit-*
  message: {
    sucesso: false,
    erro: 'Muitas requisições originadas deste IP. Tente novamente em alguns minutos.'
  }
});

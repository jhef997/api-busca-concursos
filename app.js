import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api.routes.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET']
}));
app.use(express.json({ limit: '10kb' }));

// Aplica limitação de taxa em rotas públicas
app.use('/api', apiRateLimiter);

// Rotas da API
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Tratamento de 404 para rotas não mapeadas
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Endpoint não encontrado.'
  });
});

app.use(errorHandler);

export default app;
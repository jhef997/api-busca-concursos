import { Router } from 'express';
import { getConcursos, getConcursoPorId } from '../controllers/concursos.controller.js';
import { getFontes } from '../controllers/fontes.controller.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    nome: 'API REST de Busca de Concursos Públicos',
    versao: '1.2.0',
    status: 'OPERACIONAL',
    documentacao: '/api/saude'
  });
});

router.get('/saude', (req, res) => {
  res.status(200).json({
    sucesso: true,
    status: 'ONLINE',
    uptimeSegundos: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

router.get('/concursos', getConcursos);
router.get('/concursos/:id', getConcursoPorId);
router.get('/fontes', getFontes);

export default router;
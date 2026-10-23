import app from './app.js';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Necessário para aceitar conexões no Render/Chromebook

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 API de Concursos rodando em http://${HOST}:${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => process.exit(1));
});
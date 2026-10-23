import { concursosService } from '../src/services/concursos.service.js';

async function executarDiagnostico() {
  console.log('🔎 Iniciando verificação ao vivo das fontes de dados...\n');
  const resultados = await concursosService.diagnosticarTodasFontes();

  resultados.forEach(f => {
    console.log(`--------------------------------------------------`);
    console.log(`Fonte: ${f.nome} [${f.id}]`);
    console.log(`URL: ${f.url}`);
    console.log(`Status: ${f.status === 'OPERACIONAL' ? '✅ OPERACIONAL' : '❌ INDISPONÍVEL'}`);
    console.log(`Latência: ${f.latenciaMs} ms`);
    console.log(`Detalhes: ${f.detalhes}`);
  });
  console.log(`--------------------------------------------------\n`);
}

executarDiagnostico();
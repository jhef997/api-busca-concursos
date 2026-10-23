import { concursosService } from '../services/concursos.service.js';

export async function getFontes(req, res, next) {
  try {
    const relatorioFontes = await concursosService.diagnosticarTodasFontes();
    return res.status(200).json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      fontes: relatorioFontes
    });
  } catch (error) {
    next(error);
  }
}

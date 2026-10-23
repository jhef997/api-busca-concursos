import axios from 'axios';
import { BaseSource } from './base.source.js';
import { SOURCES_CONFIG } from '../../config/sources.config.js';
import { gerarIdEstavel } from '../../utils/hash.util.js';
import { normalizarTexto, sanitizarUrlCanonica } from '../../utils/text.util.js';
import { formatarDataISO, dataEstaVencida } from '../../utils/date.util.js';

export class DenoDevSource extends BaseSource {
  constructor() {
    super('denodev', 'Concursos API (Deno.dev)', 'https://concursos-api.deno.dev/api/concursos');
  }

  async checarDisponibilidade() {
    const inicio = Date.now();
    try {
      const response = await axios.get(this.url, { timeout: SOURCES_CONFIG.httpTimeoutMs });
      return {
        id: this.id,
        nome: this.nome,
        url: this.url,
        status: response.status === 200 ? 'OPERACIONAL' : 'INSTAVEL',
        latenciaMs: Date.now() - inicio,
        detalhes: `HTTP Status ${response.status}`
      };
    } catch (error) {
      return {
        id: this.id,
        nome: this.nome,
        url: this.url,
        status: 'INDISPONIVEL',
        latenciaMs: Date.now() - inicio,
        detalhes: error.code === 'ECONNABORTED' ? 'Timeout excedido' : error.message
      };
    }
  }

  async buscarConcursos() {
    try {
      const response = await axios.get(this.url, { timeout: SOURCES_CONFIG.httpTimeoutMs });
      if (!Array.isArray(response.data)) {
        return { sucesso: false, dados: [], erro: 'Formato de resposta inesperado (não é um array).' };
      }

      const formatados = response.data.map(item => this.normalizar(item));
      return { sucesso: true, dados: formatados };
    } catch (error) {
      return {
        sucesso: false,
        dados: [],
        erro: error.code === 'ECONNABORTED' ? 'Tempo limite (timeout) atingido ao consultar a fonte.' : error.message
      };
    }
  }

  normalizar(item) {
    const titulo = item.titulo || item.nome || 'Concurso Público';
    const orgao = item.orgao || item.instituicao || null;
    const urlCanonica = sanitizarUrlCanonica(item.link || item.url);
    const uf = (item.uf || item.estado || '').toUpperCase();
    const ufValida = SOURCES_CONFIG.allowedUfs.includes(uf) ? uf : null;

    const payloadHash = urlCanonica || `${normalizarTexto(titulo)}|${normalizarTexto(orgao)}|${ufValida || 'BR'}`;
    const id = gerarIdEstavel(this.id, payloadHash);

    const dataEncerramentoIso = formatarDataISO(item.dataEncerramento || item.inscricoesAte);
    const situacao = this.normalizarSituacao(item.status || item.situacao, dataEncerramentoIso);

    return {
      id,
      titulo: titulo.trim(),
      orgao: orgao ? orgao.trim() : null,
      cargo: item.cargo || item.cargos || null,
      escolaridade: item.escolaridade || null,
      vagas: typeof item.vagas === 'number' ? item.vagas : (item.vagas ? String(item.vagas) : null),
      remuneracao: item.remuneracao || item.salario || null,
      uf: ufValida,
      municipio: item.municipio || item.cidade || null,
      situacao,
      dataEncerramento: dataEncerramentoIso,
      banca: item.banca || null,
      linkFonte: urlCanonica || this.url,
      fonteOrigem: this.id,
      atualizadoEm: new Date().toISOString()
    };
  }

  normalizarSituacao(situacaoBruta, dataEncerramentoIso) {
    if (dataEncerramentoIso && dataEstaVencida(dataEncerramentoIso)) {
      return 'ENCERRADO';
    }

    if (!situacaoBruta) return 'INDEFINIDO';
    const st = normalizarTexto(situacaoBruta);

    if (st.includes('cancelad') || st.includes('revogad')) return 'CANCELADO';
    if (st.includes('suspen') || st.includes('adiad')) return 'SUSPENSO';
    if (st.includes('encerrad') || st.includes('finaliz') || st.includes('prazo esgotado')) return 'ENCERRADO';
    if (st.includes('abert') || st.includes('inscricoes abertas') || st.includes('reabert')) return 'ABERTO';
    if (st.includes('previst') || st.includes('autoriz') || st.includes('comissao')) return 'PREVISTO';

    return 'INDEFINIDO';
  }
}
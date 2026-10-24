// src/services/sources/pciRss.source.js
import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';
import { parseListaConcursos } from '../../utils/pciParser.js';

// Lista geral: traz todos os estados (inclusive PI) com cargo, UF, vagas, salário e prazo.
const URL_LISTA = 'https://www.pciconcursos.com.br/concursos/';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9'
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (lista geral)';
  }

  async baixar(tentativas = 3) {
    let ultimoErro;
    for (let i = 1; i <= tentativas; i++) {
      try {
        const res = await axios.get(URL_LISTA, {
          timeout: 20000,
          headers: HEADERS,
          responseType: 'text'
        });
        return String(res.data || '');
      } catch (err) {
        ultimoErro = err;
        console.error(`PCI: tentativa ${i}/${tentativas} falhou: ${err.message}`);
        if (i < tentativas) await esperar(1000 * i);
      }
    }
    throw ultimoErro;
  }

  async buscarConcursos() {
    try {
      const html = await this.baixar();
      const itens = parseListaConcursos(html);

      if (!itens.length) {
        // layout mudou ou página vazia: o controller mantém o último cache bom
        return { sucesso: false, dados: [], erro: 'Nenhum concurso encontrado na página do PCI' };
      }

      const agora = new Date().toISOString();
      const dados = itens.map((i) => ({
        id: gerarHashEstavel(i.titulo, i.linkFonte),
        ...i,
        banca: 'Não informada',
        fonteOrigem: 'PCI Concursos (Ao Vivo)',
        atualizadoEm: agora
      }));

      return { sucesso: true, dados };
    } catch (error) {
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    try {
      await axios.head(URL_LISTA, { timeout: 8000, headers: HEADERS });
      return { id: this.id, nome: this.nome, disponivel: true };
    } catch (err) {
      return { id: this.id, nome: this.nome, disponivel: false, erro: err.message };
    }
  }
}

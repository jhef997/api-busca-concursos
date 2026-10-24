import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Scraper por Estado Preciso)';
  }

  async buscarConcursos() {
    try {
      // Mapeamento direto e seguro: cada URL state-page assume a sua UF exata
      const paginas = [
        { url: 'https://www.pciconcursos.com.br/concursos/sp/', uf: 'SP' },
        { url: 'https://www.pciconcursos.com.br/concursos/mg/', uf: 'MG' },
        { url: 'https://www.pciconcursos.com.br/concursos/rj/', uf: 'RJ' },
        { url: 'https://www.pciconcursos.com.br/concursos/ma/', uf: 'MA' },
        { url: 'https://www.pciconcursos.com.br/concursos/ba/', uf: 'BA' },
        { url: 'https://www.pciconcursos.com.br/concursos/pr/', uf: 'PR' },
        { url: 'https://www.pciconcursos.com.br/concursos/rs/', uf: 'RS' },
        { url: 'https://www.pciconcursos.com.br/concursos/sc/', uf: 'SC' },
        { url: 'https://www.pciconcursos.com.br/concursos/nacional/', uf: 'BR' }
      ];

      let todosConcursos = [];
      const urlsAdicionadas = new Set();

      for (const pagina of paginas) {
        try {
          const response = await axios.get(pagina.url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          const html = String(response.data || '');
          const regexTagA = /<a\b[^>]*?href=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/gi;
          let match;

          while ((match = regexTagA.exec(html)) !== null) {
            let href = match[1].trim();
            let tituloRaw = match[2];

            let tituloLimpo = tituloRaw.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

            if (!tituloLimpo || tituloLimpo.length < 10) continue;
            if (!href.includes('/noticias/')) continue;

            if (/^(apostilas|provas|simulados|aulas|artigos|home|contato|privacidade)/i.test(tituloLimpo)) continue;

            let linkFonte = href.startsWith('http') ? href : `https://www.pciconcursos.com.br${href}`;

            if (urlsAdicionadas.has(linkFonte)) continue;
            urlsAdicionadas.add(linkFonte);

            // Extração de metadados do título
            let vagas = 'Consulte o edital';
            const matchVagas = tituloLimpo.match(/(\d+\s+vagas?|cadastro\s+de\s+reserva)/i);
            if (matchVagas) vagas = matchVagas[0];

            let remuneracao = 'Consulte o edital';
            const matchSalario = tituloLimpo.match(/(R\$\s*[\d.,]+(?:\s*a\s*R\$\s*[\d.,]+)?)/i);
            if (matchSalario) remuneracao = matchSalario[1];

            let escolaridade = 'Consulte o edital';
            if (/superior/i.test(tituloLimpo)) escolaridade = 'Ensino Superior';
            else if (/médio|medio/i.test(tituloLimpo)) escolaridade = 'Ensino Médio';
            else if (/fundamental/i.test(tituloLimpo)) escolaridade = 'Ensino Fundamental';

            const orgao = tituloLimpo.split('-')[0].trim();

            todosConcursos.push({
              id: gerarHashEstavel(tituloLimpo, linkFonte),
              titulo: tituloLimpo,
              orgao: orgao || 'Não informado',
              cargo: 'Consulte o edital',
              escolaridade: escolaridade,
              vagas: vagas,
              remuneracao: remuneracao,
              uf: pagina.uf, // Atribui diretamente a UF correta e segura da página raspada
              municipio: null,
              situacao: 'ABERTO',
              dataEncerramento: null,
              banca: 'Não informada',
              linkFonte: linkFonte,
              fonteOrigem: 'PCI Concursos (Ao Vivo)',
              atualizadoEm: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error(`Erro ao raspar ${pagina.url}:`, err.message);
        }
      }

      return { sucesso: true, dados: todosConcursos };
    } catch (error) {
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

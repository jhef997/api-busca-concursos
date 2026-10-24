import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Web Scraper Universal)';
  }

  async buscarConcursos() {
    try {
      // Páginas principais do PCI Concursos que concentram os editais ativos do Brasil
      const paginas = [
        { url: 'https://www.pciconcursos.com.br/concursos/' },
        { url: 'https://www.pciconcursos.com.br/concursos/sudeste/' },
        { url: 'https://www.pciconcursos.com.br/concursos/nordeste/' },
        { url: 'https://www.pciconcursos.com.br/concursos/sul/' },
        { url: 'https://www.pciconcursos.com.br/concursos/norte/' },
        { url: 'https://www.pciconcursos.com.br/concursos/centrooeste/' },
        { url: 'https://www.pciconcursos.com.br/concursos/nacional/' }
      ];

      let todosConcursos = [];
      const urlsAdicionadas = new Set();
      const ufsValidas = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

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

            if (!tituloLimpo || tituloLimpo.length < 8) continue;
            if (!href.includes('/concursos/')) continue;

            // Ignorar links de navegação e menus
            if (href.endsWith('/concursos/') || href.endsWith('/nordeste/') || href.endsWith('/sudeste/') || href.endsWith('/sul/') || href.endsWith('/norte/') || href.endsWith('/centrooeste/') || href.endsWith('/nacional/')) continue;

            // Tenta detetar a UF através da URL ou do título (ex: -sp, /sp/, ou nome do estado)
            let ufDetectada = 'BR';
            const urlLower = href.toLowerCase();
            const tituloLower = tituloLimpo.toLowerCase();

            for (const uf of ufsValidas) {
              const ufLower = uf.toLowerCase();
              if (urlLower.includes(`/${ufLower}/`) || urlLower.endsWith(`-${ufLower}`) || tituloLower.includes(`-${ufLower}`) || tituloLower.endsWith(` ${uf}`)) {
                ufDetectada = uf;
                break;
              }
            }

            // Filtro de lixo / menus
            const blacklist = /vagas|apostilas|provas|simulados|aulas|notícias|artigos|anterior|próxima|lista geral|índice|veja mais|cidades|professores|previstos|cargos/i;
            if (blacklist.test(tituloLimpo)) continue;

            let linkFonte = href.startsWith('http') ? href : `https://www.pciconcursos.com.br${href}`;

            if (urlsAdicionadas.has(linkFonte)) continue;
            urlsAdicionadas.add(linkFonte);

            const orgao = tituloLimpo.split('-')[0].trim();

            todosConcursos.push({
              id: gerarHashEstavel(tituloLimpo, linkFonte),
              titulo: tituloLimpo,
              orgao: orgao || 'Não informado',
              cargo: 'Consulte o edital no site',
              escolaridade: 'Consulte no edital',
              vagas: 'Consulte no edital',
              remuneracao: 'Consulte no edital',
              uf: ufDetectada,
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

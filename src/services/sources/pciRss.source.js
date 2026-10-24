import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Web Scraper Nacional)';
  }

  async buscarConcursos() {
    try {
      // Cobertura completa de todas as regiões do Brasil
      const paginas = [
        { url: 'https://www.pciconcursos.com.br/concursos/nacional/' },
        { url: 'https://www.pciconcursos.com.br/concursos/sudeste/' },
        { url: 'https://www.pciconcursos.com.br/concursos/sul/' },
        { url: 'https://www.pciconcursos.com.br/concursos/nordeste/' },
        { url: 'https://www.pciconcursos.com.br/concursos/norte/' },
        { url: 'https://www.pciconcursos.com.br/concursos/centrooeste/' }
      ];

      let todosConcursos = [];
      const urlsAdicionadas = new Set();
      const ufsValidas = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

      for (const pagina of paginas) {
        try {
          const response = await axios.get(pagina.url, {
            timeout: 12000,
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
            if (!href.includes('/concursos/') && !href.includes('/noticias/')) continue;

            // Normaliza a URL para análise de estrutura e UF
            let urlLimpa = href.replace('https://www.pciconcursos.com.br', '').split('?')[0].split('#')[0];
            const partes = urlLimpa.split('/').filter(Boolean);

            if (partes.length < 2 || partes[0] !== 'concursos') continue;

            let ufDetectada = 'BR'; // Padrão nacional caso não identifique o estado
            let slug = '';

            // Formato 1: /concursos/slug (ex: /concursos/prefeitura-de-sao-paulo-sp)
            if (partes.length === 2) {
              slug = partes[1];
              const matchUfSlug = slug.match(/-([a-z]{2})$/i);
              if (matchUfSlug && ufsValidas.includes(matchUfSlug[1].toUpperCase())) {
                ufDetectada = matchUfSlug[1].toUpperCase();
              }
            } 
            // Formato 2: /concursos/uf/slug (ex: /concursos/sp/prefeitura-de-sao-paulo)
            else if (partes.length === 3) {
              const possivelUf = partes[1].toUpperCase();
              if (ufsValidas.includes(possivelUf)) {
                ufDetectada = possivelUf;
                slug = partes[2];
              } else {
                continue;
              }
            } else {
              continue;
            }

            // Ignorar menus e páginas genéricas de navegação
            const ignorados = ['nacional', 'sudeste', 'sul', 'nordeste', 'norte', 'centrooeste', 'cidades', 'professores', 'previstos', 'cargos', 'vagas', 'ma', 'sp', 'rj', 'mg', 'es', 'pr', 'sc', 'rs', 'ba', 'pe', 'ce', 'go', 'df'];
            if (ignorados.includes(slug)) continue;

            const blacklist = /vagas|apostilas|provas|simulados|aulas|notícias|artigos|anterior|próxima|lista geral|índice|veja mais/i;
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

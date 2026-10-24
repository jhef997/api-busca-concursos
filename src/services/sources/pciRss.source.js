import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Web Scraper Real)';
  }

  async buscarConcursos() {
    try {
      const paginas = [
        { url: 'https://www.pciconcursos.com.br/concursos/ma/', ufPadrao: 'MA' },
        { url: 'https://www.pciconcursos.com.br/concursos/nordeste/', ufPadrao: 'NE' },
        { url: 'https://www.pciconcursos.com.br/concursos/nacional/', ufPadrao: 'BR' }
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

            // 1. OBRIGATÓRIO: Apenas domínios de concursos/notícias
            if (!href.includes('/concursos/') && !href.includes('/noticias/')) continue;

            // 2. FILTRO MATEMÁTICO: Conta as partes da URL
            // Transforma '/concursos/ma/acailandia' em ['concursos', 'ma', 'acailandia'] (3 partes = BLOQUEADO)
            // Transforma '/concursos/prefeitura-de-xyz' em ['concursos', 'prefeitura-de-xyz'] (2 partes = APROVADO)
            const urlLimpa = href.replace('https://www.pciconcursos.com.br', '').split('?')[0].split('#')[0];
            const partesUrl = urlLimpa.split('/').filter(Boolean); 
            
            if (partesUrl.length !== 2) continue; // Elimina instantaneamente cidades e menus base

            // 3. RECUSAR lixo e menus laterais
            const slug = partesUrl[1];
            if (slug.length < 6 || slug === 'nacional' || slug === 'nordeste' || slug === 'cidades' || slug === 'sudeste') continue;

            const blacklist = /vagas|apostilas|provas|simulados|aulas|notícias|artigos|anterior|próxima|lista geral|índice|veja mais/i;
            if (blacklist.test(tituloLimpo)) continue;

            // 4. Salvar Edital Real
            let linkFonte = href.startsWith('http') ? href : `https://www.pciconcursos.com.br${href}`;

            if (urlsAdicionadas.has(linkFonte)) continue;
            urlsAdicionadas.add(linkFonte);

            const orgao = tituloLimpo.split('-')[0].trim();

            todosConcursos.push({
              id: gerarHashEstavel(tituloLimpo, linkFonte),
              titulo: tituloLimpo,
              orgao: orgao || 'Não informado',
              cargo: 'Consulte o edital no site',
              escolaridade: 'Consulte o edital',
              vagas: 'Consulte o edital',
              remuneracao: 'Consulte o edital',
              uf: pagina.ufPadrao,
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

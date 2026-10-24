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

      for (const pagina of paginas) {
        try {
          const response = await axios.get(pagina.url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
          });

          const html = String(response.data || '');

          // Captura EXCLUSIVAMENTE links no singular (/concurso/), ignorando menus (/concursos/, /provas/, /apostilas/)
          const regexConcursoEspecifico = /<a\s+[^>]*href="([^"]*?\/concurso\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

          let match;
          while ((match = regexConcursoEspecifico.exec(html)) !== null) {
            let href = match[1];
            let tituloRaw = match[2];

            let tituloLimpo = tituloRaw
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (!tituloLimpo || tituloLimpo.length < 5) continue;
            
            // Ignora termos genéricos de rodapé/topo
            if (/veja mais|notícias|artigos|anterior|próxima|home|contato|privacidade|termos/i.test(tituloLimpo)) continue;

            // Formata URL relativa para absoluta
            let linkFonte = href;
            if (href.startsWith('/')) {
              linkFonte = `https://www.pciconcursos.com.br${href}`;
            } else if (!href.startsWith('http')) {
              linkFonte = `https://www.pciconcursos.com.br/${href}`;
            }

            const partes = tituloLimpo.split('-');
            const orgao = partes[0].trim();

            todosConcursos.push({
              id: gerarHashEstavel(tituloLimpo, linkFonte),
              titulo: tituloLimpo,
              orgao: orgao || 'Não informado',
              cargo: 'Consulte o edital no PCI',
              escolaridade: 'Consulte no edital',
              vagas: 'Consulte no edital',
              remuneracao: 'Consulte no edital',
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
      console.error('Erro geral no Scraper do PCI Concursos:', error.message);
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

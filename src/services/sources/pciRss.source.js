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
      const urlsAdicionadas = new Set(); // Evitar duplicados na mesma raspagem

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

          // Captura qualquer link da página
          const regexTagA = /<a\b[^>]*?href=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/gi;

          let match;
          while ((match = regexTagA.exec(html)) !== null) {
            let href = match[1].trim();
            let tituloRaw = match[2];

            let tituloLimpo = tituloRaw
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            // Ignora títulos vazios ou muito curtos
            if (!tituloLimpo || tituloLimpo.length < 5) continue;

            // 1. OBRIGATÓRIO: Tem de ser um link de concurso ou notícia
            if (!href.includes('/concursos/') && !href.includes('/noticias/')) continue;

            // 2. EXCLUSÃO: Ignora diretórios de estados/regiões (ex: /concursos/ma/, /concursos/nordeste/)
            if (/\/(concursos|noticias)\/(nacional|sudeste|sul|nordeste|norte|centrooeste|cidades|[a-z]{2})\/?$/i.test(href)) continue;

            // 3. EXCLUSÃO: Ignora menus e lixo
            const blacklist = /veja mais|notícias|artigos|anterior|próxima|home|contato|privacidade|termos|apostilas|provas|simulados|aulas|lista geral|clique aqui/i;
            if (blacklist.test(tituloLimpo)) continue;

            // Formata URL
            let linkFonte = href;
            if (href.startsWith('/')) {
              linkFonte = `https://www.pciconcursos.com.br${href}`;
            } else if (!href.startsWith('http')) {
              linkFonte = `https://www.pciconcursos.com.br/${href}`;
            }

            // Evita adicionar o mesmo edital duas vezes
            if (urlsAdicionadas.has(linkFonte)) continue;
            urlsAdicionadas.add(linkFonte);

            const partes = tituloLimpo.split('-');
            const orgao = partes[0].trim();

            todosConcursos.push({
              id: gerarHashEstavel(tituloLimpo, linkFonte),
              titulo: tituloLimpo,
              orgao: orgao || 'Não informado',
              cargo: 'Consulte o edital no site',
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
      console.error('Erro geral no Scraper:', error.message);
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

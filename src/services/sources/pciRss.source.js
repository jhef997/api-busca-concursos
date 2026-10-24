import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Web Scraper Definitivo)';
  }

  async buscarConcursos() {
    try {
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

      const termosInstitucionais = [
        'prefeitura', 'camara', 'secretaria', 'tribunal', 'conselho', 'instituto', 
        'universidade', 'faculdade', 'fundacao', 'servico', 'hospital', 'autarquia', 
        'agencia', 'ministerio', 'policia', 'bombeiros', 'guarda', 'comando', 
        'departamento', 'empresa', 'concurso', 'processo seletivo', 'selecao', 
        'edital', 'detran', 'sefaz', 'coren', 'crea', 'crm', 'oab', 'tj', 'mp', 
        'trt', 'tre', 'inss', 'ibge', 'previ', 'ssp', 'mgs', 'inb', 'saneamento'
      ];

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

            // Deve conter obrigatoriamente /concursos/
            if (!href.includes('/concursos/')) continue;

            const cleanHref = href.split('?')[0].split('#')[0];
            const partes = cleanHref.split('/').filter(Boolean);

            if (partes.length < 2) continue;

            // Ignorar páginas de índice estadual ou regional
            const ignorados = ['sp', 'mg', 'rj', 'ma', 'ba', 'pr', 'rs', 'sc', 'nacional', 'nordeste', 'sul', 'norte', 'sudeste', 'centrooeste', 'cidades', 'professores', 'previstos', 'cargos', 'vagas'];
            const slugFinal = partes[partes.length - 1].toLowerCase();

            if (ignorados.includes(slugFinal)) continue;

            // O edital real tem de conter hífens no nome do link (ex: prefeitura-de-...)
            if (!slugFinal.includes('-')) continue;

            // Filtro rigoroso: O título ou o link deve conter um termo institucional válido
            const textoCompleto = (tituloLimpo + ' ' + href).toLowerCase();
            const ehOrgaoReal = termosInstitucionais.some(termo => textoCompleto.includes(termo));
            if (!ehOrgaoReal) continue;

            // Lista negra de termos indesejados
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
              uf: pagina.uf,
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

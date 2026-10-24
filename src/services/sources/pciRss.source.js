import axios from 'axios';
import { gerarHashEstavel } from '../../utils/hash.util.js';

export class PciRssSource {
  constructor() {
    this.id = 'pci_concursos';
    this.nome = 'PCI Concursos (Web Scraper Real)';
  }

  async buscarConcursos() {
    try {
      // Páginas reais do PCI Concursos para raspagem de dados em tempo real
      const paginas = [
        { url: 'https://www.pciconcursos.com.br/concursos/ma/', ufPadrao: 'MA' },
        { url: 'https://www.pciconcursos.com.br/concursos/nordeste/', ufPadrao: 'NE' }
      ];

      let todosConcursos = [];

      for (const pagina of paginas) {
        const response = await axios.get(pagina.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });

        const html = response.data;
        if (!html) continue;

        // Expressão regular para capturar os blocos de concursos no HTML do PCI
        const regexBloco = /<div class="(?:ca|cd)"[^>]*>([\s\S]*?)<\/div>/g;
        let match;

        while ((match = regexBloco.exec(html)) !== null) {
          const blocoHtml = match[1];

          // Extrai o link e o título do concurso
          const linkMatch = blocoHtml.match(/href="(https:\/\/www\.pciconcursos\.com\.br\/concurso\/[^"]+)"[^>]*>([^<]+)<\/a>/i);
          if (!linkMatch) continue;

          const linkFonte = linkMatch[1];
          const tituloLimpo = linkMatch[2].replace(/&nbsp;/g, ' ').trim();

          // Limpa as tags HTML para analisar o texto interno
          const textoLimpo = blocoHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

          // Extrai Vagas
          let vagas = 'Consulte o edital';
          const vagasMatch = textoLimpo.match(/(\d+\s+vagas?|\d+\s+vaga)/i);
          if (vagasMatch) vagas = vagasMatch[1];

          // Extrai Salário / Remuneração
          let remuneracao = 'Consulte o edital';
          const remMatch = textoLimpo.match(/R\$\s*[\d.,]+/i);
          if (remMatch) remuneracao = remMatch[0];

          // Extrai Nível de Escolaridade
          let escolaridade = 'Consulte o edital';
          if (/superior/i.test(textoLimpo)) escolaridade = 'Ensino Superior';
          else if (/médio|medio/i.test(textoLimpo)) escolaridade = 'Ensino Médio';
          else if (/fundamental/i.test(textoLimpo)) escolaridade = 'Ensino Fundamental';

          // Define o órgão a partir do título
          const orgao = tituloLimpo.split('-')[0].trim();

          todosConcursos.push({
            id: gerarHashEstavel(tituloLimpo, linkFonte),
            titulo: tituloLimpo,
            orgao: orgao,
            cargo: 'Consulte o edital',
            escolaridade: escolaridade,
            vagas: vagas,
            remuneracao: remuneracao,
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
      }

      return { sucesso: true, dados: todosConcursos };
    } catch (error) {
      console.error('Erro no Scraper do PCI Concursos:', error.message);
      return { sucesso: false, dados: [], erro: error.message };
    }
  }

  async checarDisponibilidade() {
    return { id: this.id, nome: this.nome, disponivel: true };
  }
}

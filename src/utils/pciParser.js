// src/utils/pciParser.js
// Lê a página https://www.pciconcursos.com.br/concursos/ (lista geral).
// Cada concurso vem com: órgão, UF, vagas, salário, cargos, escolaridade e prazo.

const BASE = 'https://www.pciconcursos.com.br';

const UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MS','MT','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]);

const REGIOES = new Set(['nacional', 'sudeste', 'sul', 'norte', 'nordeste', 'centrooeste']);

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const NOMES_ESTADOS = [
  'acre','alagoas','amapa','amazonas','bahia','ceara','distrito federal','espirito santo','goias',
  'maranhao','mato grosso','mato grosso do sul','minas gerais','para','paraiba','parana','pernambuco',
  'piaui','rio de janeiro','rio grande do norte','rio grande do sul','rondonia','roraima',
  'santa catarina','sao paulo','sergipe','tocantins'
].join('|');

// linhas de cabeçalho/rodapé que não fazem parte do concurso
const RX_IGNORAR = new RegExp(`^(apostila|inscricao ate|regiao .+|nacional|${NOMES_ESTADOS})$`);

const RX_ESCOLARIDADE =
  /^(ensino\s+)?(fundamental|m[eé]dio|t[eé]cnico|superior)(\s*\/\s*(ensino\s+)?(fundamental|m[eé]dio|t[eé]cnico|superior))*$/i;
const RX_VAGAS = /\bvagas?\b|cadastro\s+(de\s+)?reserva|\bCR\b/i;
const RX_DATA = /\d{1,2}\/\d{1,2}|^\d{1,2}\s+a$|^(prorrogado|reabertura|suspenso|encerrado)/i;

const decodificar = (s = '') =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const semTags = (s) => decodificar(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function paraLinhas(html) {
  return decodificar(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(div|p|li|tr|td|th|h\d|section|ul|ol|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// "28/10 a 10/12/2026" | "03 a 06/11/2026" | "01/12/2026 a 07/01/2027" | "Prorrogado até 13/10/2026"
export function parseDatas(txt) {
  const r = txt.match(/(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{4}))?\s+a\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (r) {
    const [, d1, m1, a1, d2, m2, a2] = r;
    let ano = a1 || a2;
    if (!a1 && m1 && Number(m1) > Number(m2)) ano = String(Number(a2) - 1);
    return { inicio: iso(ano, m1 || m2, d1), fim: iso(a2, m2, d2) };
  }
  const u = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return u ? { inicio: null, fim: iso(u[3], u[2], u[1]) } : { inicio: null, fim: null };
}

function parseBloco(linhas) {
  const r = { uf: null, vagas: null, remuneracao: null, escolaridade: null, cargo: null, datas: [] };

  for (const l of linhas) {
    if (RX_IGNORAR.test(norm(l))) continue;

    if (/^[A-Z]{2}$/.test(l) && UFS.has(l)) { r.uf = r.uf || l; continue; }
    if (RX_ESCOLARIDADE.test(l)) { r.escolaridade = r.escolaridade || l; continue; }

    if (RX_DATA.test(l) && !RX_VAGAS.test(l) && !/R\$/.test(l)) { r.datas.push(l); continue; }

    if (RX_VAGAS.test(l) && l.length < 90 && !r.vagas) {
      const sal = l.match(/R\$\s*[\d.,]+(?:\s*por\s+hora)?/i);
      r.remuneracao = sal ? sal[0].replace(/\s+/g, ' ') : null;
      r.vagas = l.replace(/\s*(at[eé]\s*)?R\$[\s\S]*$/i, '').trim() || null;
      continue;
    }

    if (!r.cargo) r.cargo = l;
  }
  return r;
}

const ufDoTitulo = (titulo) => {
  const achados = new Set((titulo.match(/\b[A-Z]{2}\b/g) || []).filter((u) => UFS.has(u)));
  return achados.size === 1 ? [...achados][0] : null;
};

const municipioDoOrgao = (orgao) => {
  const m = orgao.match(/(?:prefeitura|c[aâ]mara|munic[ií]pio)(?:\s+municipal)?\s+d[aeo]\s+(.+)$/i);
  return m ? m[1].replace(/^Est[aâ]ncia\s+\S+\s+d[aeo]\s+/i, '').trim() : null;
};

export function parseListaConcursos(html, agora = new Date()) {
  const hoje = agora.toISOString().slice(0, 10);

  // 1) acha os links de notícia (cada concurso é um link /noticias/<slug>)
  const ancoras = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1];
    const href = (attrs.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const slug = href.match(/\/noticias\/([^/?#]+)\/?(?:[?#].*)?$/i);
    if (!slug || REGIOES.has(slug[1])) continue;

    const orgao = semTags(m[2]);
    if (orgao.length < 2) continue;

    const title = (attrs.match(/title\s*=\s*["']([^"']*)["']/i) || [])[1];
    ancoras.push({
      href: new URL(href, BASE).href,
      orgao,
      titulo: title ? decodificar(title).trim() : orgao,
      ini: m.index,
      fim: m.index + m[0].length
    });
  }

  // 2) para cada link, lê o bloco de texto até o próximo link
  const vistos = new Set();
  const itens = [];

  ancoras.forEach((a, i) => {
    if (vistos.has(a.href)) return;
    vistos.add(a.href);

    const limite = Math.min(ancoras[i + 1]?.ini ?? Infinity, a.fim + 2500);
    const b = parseBloco(paraLinhas(html.slice(a.fim, limite)));

    // descarta links soltos (menu, rodapé) que não trazem dados de concurso
    if (!b.vagas && !b.remuneracao && !b.escolaridade && !b.uf) return;

    const { inicio, fim } = parseDatas(b.datas.join(' '));
    const texto = b.datas.join(' ');

    let situacao = 'ABERTO';
    if (/suspens/i.test(texto)) situacao = 'SUSPENSO';
    else if (fim && fim < hoje) situacao = 'ENCERRADO';
    else if (inicio && inicio > hoje) situacao = 'EM_BREVE';

    itens.push({
      titulo: a.titulo,
      orgao: a.orgao,
      cargo: b.cargo || 'Consulte o edital',
      escolaridade: b.escolaridade || 'Consulte o edital',
      vagas: b.vagas || 'Consulte o edital',
      remuneracao: b.remuneracao || 'Consulte o edital',
      uf: b.uf || ufDoTitulo(a.titulo) || 'BR',
      municipio: municipioDoOrgao(a.orgao),
      situacao,
      dataInscricaoInicio: inicio,
      dataEncerramento: fim,
      prorrogado: /prorrogad/i.test(texto),
      linkFonte: a.href
    });
  });

  return itens;
}

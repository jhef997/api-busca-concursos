// src/utils/busca.js
// Busca por carreira: normalização, sinônimos, siglas com UF (ex.: "pmpi" = PM + PI) e ranking.

export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MS','MT','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export const normalizar = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ufsRx = UFS.map((u) => u.toLowerCase()).join('|');
// sigla + UF colada: pmpi, pcma, cbmpi, gcmsp...
const sg = (p) => `\\b${p}(?:${ufsRx})\\b`;

// texto    = padrões (regex) para descobrir a carreira a partir do título/órgão/cargo
// consulta = palavras digitadas que levam a essa carreira (prefixo; <=3 letras = exato)
export const CARREIRAS = {
  policia_militar: {
    nome: 'Polícia Militar',
    texto: ['\\bpolicia militar', '\\bpm\\b', sg('pm'), '\\bsoldado pm', '\\bcfo\\b'],
    consulta: ['polic', 'pm', 'militar']
  },
  policia_civil: {
    nome: 'Polícia Civil',
    texto: ['\\bpolicia civil', '\\bpc\\b', sg('pc'), '\\bdelegado', '\\bescrivao', '\\binvestigador', '\\bperito'],
    consulta: ['polic', 'pc', 'delegad', 'escriv', 'investigador', 'perit']
  },
  policia_federal: {
    nome: 'Polícia Federal',
    texto: ['\\bpolicia federal', '\\bpf\\b', '\\bagente de policia federal'],
    consulta: ['polic', 'pf', 'federal']
  },
  prf: {
    nome: 'Polícia Rodoviária Federal',
    texto: ['\\bprf\\b', '\\bpolicia rodoviaria'],
    consulta: ['polic', 'prf', 'rodoviari']
  },
  policia_penal: {
    nome: 'Polícia Penal',
    texto: ['\\bpolicia penal', '\\bagente penitenciario', '\\bagente de seguranca penitenciaria', '\\bdepen\\b'],
    consulta: ['polic', 'penal', 'penitenciari', 'depen']
  },
  bombeiro: {
    nome: 'Bombeiro Militar',
    texto: ['\\bbombeiro', '\\bcbm\\b', sg('cbm'), '\\bcorpo de bombeiros'],
    consulta: ['bombeir', 'cbm', 'militar']
  },
  guarda_municipal: {
    nome: 'Guarda Municipal',
    texto: ['\\bguarda municipal', '\\bguarda civil', '\\bgcm\\b', sg('gcm'), '\\bguardas?\\b'],
    consulta: ['guard', 'gcm', 'gm']
  },
  enfermagem: {
    nome: 'Enfermagem',
    texto: ['\\benfermeir', '\\benfermagem', '\\btecnico de enfermagem', '\\bauxiliar de enfermagem'],
    consulta: ['enferm']
  },
  medicina: {
    nome: 'Médico',
    texto: ['\\bmedic[oa]\\b', '\\bmedicina'],
    consulta: ['medic']
  },
  saude_outros: {
    nome: 'Saúde (outros)',
    texto: ['\\bodontolog', '\\bdentista', '\\bfarmaceutic', '\\bpsicolog', '\\bfisioterap', '\\bnutricion', '\\bfonoaudiolog', '\\bagente comunitario de saude', '\\bsaude'],
    consulta: ['odont', 'dentist', 'farmac', 'psicolog', 'fisioterap', 'nutri', 'fonoaud', 'saude']
  },
  professor: {
    nome: 'Professor / Educação',
    texto: ['\\bprofessor', '\\bmagisterio', '\\bpedagog', '\\beducacao', '\\bdocente'],
    consulta: ['professor', 'magisterio', 'pedagog', 'educ', 'docente']
  },
  administrativo: {
    nome: 'Administrativo',
    texto: ['\\bagente administrativo', '\\bassistente administrativo', '\\bauxiliar administrativo', '\\btecnico administrativo', '\\bescriturario', '\\banalista administrativo'],
    consulta: ['administrativ', 'escriturari', 'assistente', 'auxiliar']
  },
  juridico: {
    nome: 'Jurídico',
    texto: ['\\badvogado', '\\bprocurador', '\\bjuiz', '\\bpromotor', '\\bdefensor', '\\banalista judiciario', '\\btecnico judiciario', '\\btribunal'],
    consulta: ['advog', 'procurador', 'juiz', 'promotor', 'defensor', 'judiciari', 'tribunal', 'juridic']
  },
  ti: {
    nome: 'Tecnologia da Informação',
    texto: ['\\btecnologia da informacao', '\\banalista de sistemas', '\\bdesenvolvedor', '\\bprogramador', '\\bsuporte tecnico', '\\binformatica', '\\bti\\b'],
    consulta: ['ti', 'informatic', 'sistemas', 'desenvolvedor', 'programador', 'tecnologia']
  },
  contabil_fiscal: {
    nome: 'Contábil / Fiscal',
    texto: ['\\bcontador', '\\bcontabil', '\\bauditor', '\\bfiscal', '\\btributari'],
    consulta: ['contad', 'contabil', 'auditor', 'fiscal', 'tributari']
  },
  engenharia: {
    nome: 'Engenharia / Arquitetura',
    texto: ['\\bengenheir', '\\bengenharia', '\\barquiteto', '\\barquitetura'],
    consulta: ['engenh', 'arquitet']
  }
};

const REGEX = Object.fromEntries(
  Object.entries(CARREIRAS).map(([id, c]) => [id, new RegExp(c.texto.join('|'))])
);

// prefixo de sigla -> carreira (para pmpi, pcma, cbmpi, gcmsp...)
const SIGLA_PREFIXO = {
  pm: 'policia_militar',
  pc: 'policia_civil',
  cbm: 'bombeiro',
  gcm: 'guarda_municipal'
};
const SIGLA_UF = new RegExp(`^(${Object.keys(SIGLA_PREFIXO).join('|')})(${ufsRx})$`);

const STOPWORDS = new Set([
  'de','da','do','das','dos','para','em','e','a','o','as','os','no','na',
  'concurso','concursos','edital','vaga','vagas'
]);

const casa = (tok, c) => (c.length <= 3 ? tok === c : tok.startsWith(c));

export function textoDoConcurso(c) {
  return normalizar([c.titulo, c.orgao, c.cargo, c.descricao].filter(Boolean).join(' '));
}

export function inferirCarreiras(c) {
  const texto = textoDoConcurso(c);
  return Object.keys(REGEX).filter((id) => REGEX[id].test(texto));
}

// "pmpi" -> { carreiras:{policia_militar}, uf:'PI', termos:[] }
// "guarda" -> { carreiras:{guarda_municipal}, termos:[] }
// "enfermeiro maranhao" -> { carreiras:{enfermagem}, termos:['maranhao'] }
const NOMES_UF = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', goias: 'GO',
  maranhao: 'MA', minas: 'MG', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  rondonia: 'RO', roraima: 'RR', sergipe: 'SE', tocantins: 'TO', paulo: 'SP', espirito: 'ES'
};

export function interpretarConsulta(q = '') {
  const tokens = normalizar(q)
    .replace('minas gerais', 'minas')
    .replace('sao paulo', 'paulo')
    .replace('espirito santo', 'espirito')
    .split(' ').filter((t) => t && !STOPWORDS.has(t));
  // carreiras = união (usada em ranking/exibição); grupos = uma lista por palavra (filtro)
  const consulta = { carreiras: new Set(), grupos: [], uf: null, termos: [] };

  for (const tok of tokens) {
    const m = tok.match(SIGLA_UF);
    if (m) {
      const id = SIGLA_PREFIXO[m[1]];
      consulta.carreiras.add(id);
      consulta.grupos.push([id]);
      consulta.uf = m[2].toUpperCase();
      continue;
    }
    if (NOMES_UF[tok]) { consulta.uf = NOMES_UF[tok]; continue; }

    const ids = Object.entries(CARREIRAS)
      .filter(([, c]) => c.consulta.some((k) => casa(tok, k)))
      .map(([id]) => id);

    if (ids.length) {
      ids.forEach((id) => consulta.carreiras.add(id));
      consulta.grupos.push(ids);
    } else {
      consulta.termos.push(tok);
    }
  }
  return consulta;
}

export function combina(c, consulta) {
  if (consulta.uf && c.uf !== consulta.uf) return false;
  // "policia militar" = (polícia) E (militar): precisa casar com todos os grupos
  if (!consulta.grupos.every((g) => c.carreiras.some((id) => g.includes(id)))) return false;
  if (consulta.termos.length) {
    const texto = textoDoConcurso(c);
    return consulta.termos.every((t) => new RegExp(`\\b${t}`).test(texto));
  }
  return true;
}

export function pontuar(c, consulta) {
  let p = c.situacao === 'ABERTO' ? 1 : 0;
  if (c.carreiras.some((id) => consulta.carreiras.has(id))) p += 10;
  const titulo = normalizar(c.titulo);
  const cargo = normalizar(c.cargo);
  const orgao = normalizar(c.orgao);
  for (const t of consulta.termos) {
    if (titulo.includes(t)) p += 3;
    if (cargo.includes(t)) p += 3;
    if (orgao.includes(t)) p += 2;
  }
  return p;
}

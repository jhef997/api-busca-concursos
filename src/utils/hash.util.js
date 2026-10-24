import crypto from 'crypto';

export function gerarHashEstavel(texto, uf = '') {
  const conteudo = `${texto.toLowerCase().trim()}_${uf.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(conteudo).digest('hex').substring(0, 16);
}
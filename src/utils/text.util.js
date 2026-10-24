export function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function limparEspacos(texto) {
  if (!texto) return '';
  return texto.replace(/\s+/g, ' ').trim();
}
/**
 * Tenta realizar o parse de uma string de data retornando ISO string ou null, sem estourar exceções.
 */
export function formatarDataISO(dataRaw) {
  if (!dataRaw) return null;
  try {
    const data = new Date(dataRaw);
    if (isNaN(data.getTime())) return null;
    return data.toISOString();
  } catch (_err) {
    return null;
  }
}

/**
 * Compara se a data informada já expirou em relação ao instante atual.
 */
export function dataEstaVencida(dataEncerramentoRaw) {
  const dataIso = formatarDataISO(dataEncerramentoRaw);
  if (!dataIso) return false;
  return new Date(dataIso).getTime() < Date.now();
}

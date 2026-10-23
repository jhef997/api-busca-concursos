export const SOURCES_CONFIG = {
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '1800', 10),
  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10),
  allowedUfs: [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'BR'
  ]
};

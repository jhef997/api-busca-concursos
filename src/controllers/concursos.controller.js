// Exemplo de como o filtro deve ser tratado no seu Controller
let resultados = todosOsConcursos;

// Filtro por Estado (Garante que maiúsculas/minúsculas não quebram a busca)
if (estado) {
  const ufFiltro = estado.toUpperCase().trim();
  resultados = resultados.filter(c => c.uf && c.uf.toUpperCase() === ufFiltro);
}

// Filtro por Profissão / Palavra-chave (Remove acentos para evitar falhas)
if (q) {
  const termoBusca = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  resultados = resultados.filter(c => {
    const tituloNorm = (c.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const orgaoNorm = (c.orgao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return tituloNorm.includes(termoBusca) || orgaoNorm.includes(termoBusca);
  });
}

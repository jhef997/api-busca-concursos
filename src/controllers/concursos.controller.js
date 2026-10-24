// Exemplo de como o filtro de busca por texto (q) deve ser feito no seu Controller/Serviço
if (q) {
  const termoBusca = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos (ex: "polícia" vira "policia")

  concursosFiltrados = concursosFiltrados.filter(c => {
    const tituloNorm = (c.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const orgaoNorm = (c.orgao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cargoNorm = (c.cargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return tituloNorm.includes(termoBusca) || orgaoNorm.includes(termoBusca) || cargoNorm.includes(termoBusca);
  });
}

export class BaseSource {
  constructor(id, nome, url) {
    this.id = id;
    this.nome = nome;
    this.url = url;
  }

  async buscarConcursos() {
    throw new Error('O método buscarConcursos() precisa ser implementado na classe filha.');
  }

  async checarDisponibilidade() {
    throw new Error('O método checarDisponibilidade() precisa ser implementado na classe filha.');
  }
}
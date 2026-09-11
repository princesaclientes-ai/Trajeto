// Configuração única para o painel, consolidado e seus editores de percurso.
// O fundo vetorial fica no tilePane; cliques e arrastes continuam no Leaflet.
window.TrajetoMap = Object.freeze({
  createStreetLayer() {
    return L.maplibreGL({
      style: "https://tiles.openfreemap.org/styles/liberty",
      interactive: false,
      attributionControl: {
        customAttribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    });
  },
});

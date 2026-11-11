// Portada de un juego generada solo con CSS (clases `cover-*` de globals.css).
// Debe colocarse dentro de un contenedor con `position: relative`.
export default function GameCover({ cover }: { cover: string }) {
  return <div className={"cover-bg " + cover} aria-hidden="true"></div>;
}

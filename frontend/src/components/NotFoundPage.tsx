type NotFoundPageProps = {
  onBack: () => void
}

export function NotFoundPage({ onBack }: NotFoundPageProps) {
  return (
    <main className="app-shell not-found-page">
      <section className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>Página no encontrada</h1>
        <p>La ruta que intentas visitar no existe.</p>
        <button type="button" onClick={onBack}>Volver</button>
      </section>
    </main>
  )
}

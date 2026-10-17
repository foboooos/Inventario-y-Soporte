type NotFoundPageProps = {
  onBack: () => void
}

export function NotFoundPage({ onBack }: NotFoundPageProps) {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <span className="eyebrow">Error 404</span>
        <h1>Página no encontrada</h1>
        <p>La ruta que intentas visitar no existe o no tienes acceso a ella.</p>
        <button className="primary-action" type="button" onClick={onBack}>Volver</button>
      </section>
    </main>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Cacau</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Brownies que fazem pausa virar momento.
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          A Cacau nasceu para servir brownies artesanais com sabor de feito em
          casa. No v1, você monta o pedido, escolhe retirada ou entrega e a
          equipe confirma os detalhes para deixar tudo fresquinho.
        </p>
      </section>
    </main>
  )
}

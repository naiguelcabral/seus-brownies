import {
  ArrowDown,
  ArrowRight,
  Heart,
  Leaf,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { catalogProducts, formatPrice } from '#/features/catalog/catalog'
import { OrderBuilder } from '#/features/orders/order-builder'

const features: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Heart,
    title: 'Feito com calma',
    description: 'Produção em pequenos lotes para chegar fresquinho até você.',
  },
  {
    icon: Leaf,
    title: 'Ingredientes honestos',
    description: 'Cacau intenso, manteiga e receitas sem atalhos.',
  },
  {
    icon: Sparkles,
    title: 'Do seu jeito',
    description: 'Retire ou peça entrega e nos conte qualquer detalhe no pedido.',
  },
]

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main>
      <section className="page-wrap px-4 pb-10 pt-12 sm:pb-16 sm:pt-20">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-[#35170e] px-6 py-10 text-[#fff8f1] shadow-2xl shadow-[#4b1e0e]/20 sm:px-12 sm:py-16">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#e79c56]/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f4bc80]">
              <Sparkles size={15} />
              Brownies artesanais
            </p>
            <h1 className="font-serif text-5xl font-semibold leading-[0.94] tracking-tight sm:text-7xl">
              Um intervalo melhor começa com cacau.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#e8cabb] sm:text-lg">
              Brownies feitos em pequenos lotes, com casquinha crocante e um
              centro que pede mais uma mordida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-[#f2a75d] px-5 py-3 text-sm font-extrabold text-[#35170e] no-underline transition hover:-translate-y-0.5 hover:bg-[#ffc47f]"
                href="#encomendar"
              >
                Montar pedido <ArrowRight size={17} />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-[#fff8f1] no-underline transition hover:bg-white/10"
                href="#cardapio"
              >
                Ver cardápio <ArrowDown size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="cardapio" className="scroll-mt-24 px-4 py-10 sm:py-16">
        <div className="page-wrap">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b5c30]">
                Cardápio inicial
              </p>
              <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-[#35170e] sm:text-5xl">
                Escolha seu favorito.
              </h2>
            </div>
            <a className="text-sm font-bold text-[#8f4926]" href="#encomendar">
              Fazer encomenda <ArrowRight className="inline" size={16} />
            </a>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {catalogProducts.map((product) => (
              <article
                key={product.slug}
                className="group overflow-hidden rounded-[1.75rem] border border-[#eadbce] bg-[#fffaf4] shadow-lg shadow-[#4b1e0e]/5"
              >
                <div className={`relative h-44 bg-gradient-to-br ${product.accent}`}>
                  <span className="absolute left-5 top-5 rounded-full bg-[#fff7ee]/90 px-3 py-1 text-xs font-bold text-[#5a2b18]">
                    {product.tag}
                  </span>
                  <div className="absolute -bottom-9 left-8 h-24 w-24 rounded-full border-[10px] border-[#fffaf4] bg-[#5c2918]/70 shadow-inner" />
                </div>
                <div className="p-6 pt-12">
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="font-serif text-3xl font-semibold text-[#35170e]">
                      {product.name}
                    </h3>
                    <strong className="text-sm text-[#9b5c30]">
                      {formatPrice(product.priceCents)}
                    </strong>
                  </div>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-[#805f50]">
                    {product.description}
                  </p>
                  <a
                    className="mt-5 inline-flex text-sm font-extrabold text-[#8f4926] no-underline"
                    href="#encomendar"
                  >
                    Adicionar ao pedido
                    <ArrowRight
                      className="ml-1 transition group-hover:translate-x-1"
                      size={16}
                    />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:py-14">
        <div className="page-wrap grid gap-4 rounded-[1.75rem] border border-[#eadbce] bg-[#f7ede2] p-6 sm:grid-cols-3 sm:p-8">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <article key={feature.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#35170e] text-[#f6bf79]">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-[#4d2518]">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#805f50]">
                    {feature.description}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <OrderBuilder />
    </main>
  )
}

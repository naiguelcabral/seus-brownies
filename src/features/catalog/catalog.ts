export const catalogProducts = [
  {
    slug: 'tradicional',
    name: 'Tradicional',
    description: 'Casquinha fina, centro intenso e muito chocolate de verdade.',
    priceCents: 750,
    tag: 'Mais pedido',
    accent: 'from-[#6e351d] to-[#2c120c]',
  },
  {
    slug: 'doce-de-leite',
    name: 'Doce de leite',
    description: 'Brownie de cacau com coração cremoso de doce de leite.',
    priceCents: 850,
    tag: 'Recheado',
    accent: 'from-[#b56d2d] to-[#5d2b14]',
  },
  {
    slug: 'nozes',
    name: 'Nozes',
    description: 'Cacau marcante com nozes tostadas em cada pedaço.',
    priceCents: 900,
    tag: 'Crocante',
    accent: 'from-[#8b5b38] to-[#3b2014]',
  },
] as const

export type CatalogProduct = (typeof catalogProducts)[number]
export type CatalogProductSlug = CatalogProduct['slug']

export function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100)
}

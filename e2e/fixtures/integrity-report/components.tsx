import type { ReactNode } from 'react'

export function ManagementLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </main>
  )
}

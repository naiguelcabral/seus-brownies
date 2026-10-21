import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Mount only while editing, so native dialog focus returns to its trigger. */
export function EditorDialog({
  title,
  description,
  closeLabel,
  submitLabel,
  dirty,
  onCancel,
  onSave,
  children,
  wide = false,
}: {
  title: string
  description: string
  closeLabel: string
  submitLabel: string
  dirty: boolean
  onCancel: () => void
  onSave: () => Promise<void>
  children: ReactNode
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    dialog?.querySelector('input')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function requestClose() {
    if (pendingRef.current) return
    if (dirty && !window.confirm('Descartar as alterações deste cadastro?'))
      return
    onCancel()
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    pendingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await onSave()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar. Tente novamente.',
      )
      dialogRef.current?.scrollTo({ top: 0 })
    } finally {
      pendingRef.current = false
      setSubmitting(false)
    }
  }
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-[#ecdfd4] bg-white p-0 text-[#4a2114] shadow-2xl backdrop:bg-[#25150d]/60 ${wide ? 'max-w-2xl' : 'max-w-xl'}`}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ecdfd4] bg-white px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-[#846859]">
            {description}
          </p>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          disabled={submitting}
          onClick={requestClose}
          className="rounded-lg p-2 text-[#795747] hover:bg-[#fff8f2] disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </header>
      <form onSubmit={submit} noValidate aria-busy={submitting}>
        {error ? (
          <p
            role="alert"
            className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
        <fieldset
          disabled={submitting}
          className={wide ? 'grid gap-4 p-5 sm:grid-cols-2' : 'space-y-4 p-5'}
        >
          {children}
        </fieldset>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#ecdfd4] bg-white px-5 py-4">
          <button
            disabled={submitting}
            className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Salvando...' : submitLabel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={requestClose}
            className="rounded-lg border border-[#e6d4c5] px-4 py-2.5 text-sm font-bold text-[#795747] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}

import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

/** Parent owns draft values; closing never submits or discards them. */
export function OperationDialog({
  title,
  pending,
  onClose,
  children,
}: {
  title: string
  pending: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[#ecdfd4] bg-white p-0 text-[#4a2114] shadow-2xl backdrop:bg-[#25150d]/60"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#ecdfd4] bg-white p-4">
        <h2 id={id} className="font-bold">
          {title}
        </h2>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Fechar
        </button>
      </header>
      <fieldset disabled={pending}>{children}</fieldset>
    </dialog>
  )
}

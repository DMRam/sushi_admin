import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, Gift, XCircle } from 'lucide-react'

type PublicGiftCard = {
  code: string
  balance: number
  initialAmount: number
  status: string
  updatedAt: string | null
}

function money(value: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value || 0))
}

function normalizeCode(value?: string) {
  return String(value || '').trim().toUpperCase()
}

export default function GiftCardBalancePage() {
  const params = useParams()
  const code = useMemo(() => normalizeCode(params.code), [params.code])
  const [card, setCard] = useState<PublicGiftCard | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadBalance() {
      if (!code) {
        setStatus('error')
        setMessage('Gift card code is missing.')
        return
      }

      setStatus('loading')
      setMessage('')

      try {
        const response = await fetch(
          `https://us-central1-sushi-admin.cloudfunctions.net/publicGiftCardBalance?code=${encodeURIComponent(code)}`,
        )
        const data = await response.json().catch(() => ({}))

        if (!mounted) return

        if (!response.ok) {
          throw new Error(data?.error || 'Gift card was not found.')
        }

        setCard(data.giftCard)
        setStatus('success')
      } catch (err) {
        if (!mounted) return
        setStatus('error')
        setCard(null)
        setMessage(err instanceof Error ? err.message : 'Gift card was not found.')
      }
    }

    loadBalance()

    return () => {
      mounted = false
    }
  }, [code])

  const isActive = card?.status?.toLowerCase() === 'active' && Number(card.balance) > 0

  return (
    <div className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center">
        <img src="/maisushi_logo.svg" alt="MaiSushi" className="mx-auto mb-8 h-20 w-auto" />

        <section className="border border-white/12 bg-white/[0.04] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-[#F45D4F]">
            <Gift size={22} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Gift card</p>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Balance check</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Show this screen or the card code to staff when paying at the restaurant.
          </p>

          <div className="mt-6 border border-[#F45D4F]/50 bg-black p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F45D4F]">
              Code
            </p>
            <p className="mt-1 break-all text-2xl font-semibold tracking-[0.1em]">{code}</p>
          </div>

          {status === 'loading' && (
            <div className="mt-5 border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
              Checking balance...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-5 flex gap-3 border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              <XCircle className="mt-0.5 shrink-0" size={18} />
              <span>{message}</span>
            </div>
          )}

          {status === 'success' && card && (
            <div className="mt-5 space-y-3">
              <div className="border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  Current balance
                </p>
                <p className="mt-1 text-4xl font-semibold">{money(card.balance)}</p>
              </div>

              <div
                className={[
                  'flex gap-3 border p-4 text-sm',
                  isActive
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-amber-400/30 bg-amber-500/10 text-amber-100',
                ].join(' ')}
              >
                <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                <span>
                  Status: <strong className="uppercase">{card.status}</strong>
                </span>
              </div>
            </div>
          )}

          <Link
            to="/order"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#F45D4F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#de4f43]"
          >
            <CreditCard size={18} />
            Order online
          </Link>
        </section>
      </main>
    </div>
  )
}

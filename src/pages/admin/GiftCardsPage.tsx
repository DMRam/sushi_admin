import { useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  QrCode,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { useUserProfile, UserRole } from '../../context/UserProfileContext'

type GiftCard = {
  code: string
  balance: number
  initialAmount: number
  customerEmail: string
  customerName: string
  source: string
  status: string
  imageUrl?: string
  imagePath?: string
  createdAt: string | null
  updatedAt: string | null
  lastRedeemedAt: string | null
}

type LookupResult = {
  ok: boolean
  giftCard: GiftCard
}

type CreateResult = LookupResult

type RedeemResult = {
  ok: boolean
  giftCard: GiftCard
  redemption: {
    redemptionId: string
    beforeBalance: number
    afterBalance: number
  }
}

const functions = getFunctions(undefined, 'us-central1')

function money(value: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value || 0))
}

function formatDate(value: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()

  if (normalized === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (normalized === 'used') return 'bg-slate-100 text-slate-700 ring-slate-200'
  return 'bg-red-50 text-red-700 ring-red-200'
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message || 'Request failed')
  }

  return 'Request failed'
}

export default function GiftCardsPage() {
  const { userProfile } = useUserProfile()
  const [lookupCode, setLookupCode] = useState('')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemNote, setRedeemNote] = useState('')
  const [createAmount, setCreateAmount] = useState('25')
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createNote, setCreateNote] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [giftCard, setGiftCard] = useState<GiftCard | null>(null)
  const [createdCard, setCreatedCard] = useState<GiftCard | null>(null)
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canCreate = userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.MANAGER
  const qrValue = useMemo(() => {
    const code = createdCard?.code || giftCard?.code || ''
    return code ? `https://maisushi.ca/gift-card/${encodeURIComponent(code)}` : ''
  }, [createdCard?.code, giftCard?.code])

  async function lookupCard(codeOverride?: string) {
    const code = cleanCode(codeOverride || lookupCode)
    setError('')
    setMessage('')

    if (!code) {
      setError('Enter a gift card code.')
      return
    }

    setLoading('lookup')

    try {
      const lookupGiftCard = httpsCallable<{ code: string }, LookupResult>(
        functions,
        'lookupGiftCard',
      )
      const result = await lookupGiftCard({ code })
      setGiftCard(result.data.giftCard)
      setLookupCode(result.data.giftCard.code)
      setMessage('Gift card loaded.')
    } catch (err) {
      setGiftCard(null)
      setError(errorMessage(err))
    } finally {
      setLoading('')
    }
  }

  async function redeemCard() {
    if (!giftCard) {
      setError('Load a gift card before redeeming.')
      return
    }

    const amount = Number(redeemAmount)
    setError('')
    setMessage('')

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid redemption amount.')
      return
    }

    setLoading('redeem')

    try {
      const redeemGiftCard = httpsCallable<
        { code: string; amount: number; note: string },
        RedeemResult
      >(functions, 'redeemGiftCardInStore')
      const result = await redeemGiftCard({
        code: giftCard.code,
        amount,
        note: redeemNote,
      })
      setGiftCard(result.data.giftCard)
      setRedeemAmount('')
      setRedeemNote('')
      setMessage(
        `Redeemed ${money(amount)}. Remaining balance: ${money(result.data.giftCard.balance)}.`,
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading('')
    }
  }

  async function createCard() {
    setError('')
    setMessage('')

    const amount = Number(createAmount)

    if (!canCreate) {
      setError('Manager access is required to create gift cards.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid gift card amount.')
      return
    }

    setLoading('create')

    try {
      const createGiftCard = httpsCallable<
        {
          amount: number
          customerName: string
          customerEmail: string
          note: string
          code?: string
        },
        CreateResult
      >(functions, 'createManualGiftCard')
      const result = await createGiftCard({
        amount,
        customerName: createName,
        customerEmail: createEmail,
        note: createNote,
        code: customCode ? cleanCode(customCode) : undefined,
      })
      setCreatedCard(result.data.giftCard)
      setGiftCard(result.data.giftCard)
      setLookupCode(result.data.giftCard.code)
      setCustomCode('')
      setMessage(`Created gift card ${result.data.giftCard.code}.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading('')
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setMessage(`Copied ${code}.`)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <section className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Gift card desk
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Validate and create gift cards
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Check balances, redeem cards for in-store guests, and create virtual cards for
                manual sales.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
              <Metric icon={ShieldCheck} label="Validation" value="Live" />
              <Metric icon={BadgeDollarSign} label="Currency" value="CAD" />
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-4 border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-4">
            <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Gift card code
                  </span>
                  <input
                    value={lookupCode}
                    onChange={(event) => setLookupCode(event.target.value)}
                    placeholder="MSH-K8P4QZ"
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-3 text-base font-semibold uppercase tracking-[0.08em] outline-none transition focus:border-slate-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => lookupCard()}
                  disabled={loading === 'lookup'}
                  className="inline-flex items-center justify-center gap-2 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-7"
                >
                  <Search size={18} />
                  {loading === 'lookup' ? 'Checking...' : 'Check card'}
                </button>
              </div>
            </section>

            {giftCard && (
              <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight">{giftCard.code}</h2>
                      <span
                        className={[
                          'inline-flex px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] ring-1',
                          statusClass(giftCard.status),
                        ].join(' ')}
                      >
                        {giftCard.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Created {formatDate(giftCard.createdAt)} from {giftCard.source || 'unknown'}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(giftCard.code)}
                    className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy size={16} />
                    Copy code
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <BalanceTile label="Balance" value={money(giftCard.balance)} emphasis />
                  <BalanceTile label="Original value" value={money(giftCard.initialAmount)} />
                  <BalanceTile label="Last redeemed" value={formatDate(giftCard.lastRedeemedAt)} />
                </div>

                <div className="mt-5 border-t border-slate-200 pt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    In-store redemption
                  </h3>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                    <input
                      value={redeemAmount}
                      onChange={(event) => setRedeemAmount(event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      className="border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                    />
                    <input
                      value={redeemNote}
                      onChange={(event) => setRedeemNote(event.target.value)}
                      placeholder="Optional note, invoice, or table"
                      className="border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                    />
                    <button
                      type="button"
                      onClick={redeemCard}
                      disabled={loading === 'redeem'}
                      className="inline-flex items-center justify-center gap-2 bg-[#F45D4F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#de4f43] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 size={18} />
                      {loading === 'redeem' ? 'Redeeming...' : 'Redeem'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Gift className="text-[#F45D4F]" size={20} />
                <h2 className="text-xl font-semibold tracking-tight">Create a manual card</h2>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Amount
                  </span>
                  <input
                    value={createAmount}
                    onChange={(event) => setCreateAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Custom code
                  </span>
                  <input
                    value={customCode}
                    onChange={(event) => setCustomCode(event.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="mt-2 w-full border border-slate-300 px-3 py-3 text-sm uppercase outline-none transition focus:border-slate-950"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recipient name
                  </span>
                  <input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    className="mt-2 w-full border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recipient email
                  </span>
                  <input
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    type="email"
                    className="mt-2 w-full border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                </label>
                <label className="lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Internal note
                  </span>
                  <textarea
                    value={createNote}
                    onChange={(event) => setCreateNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={createCard}
                disabled={loading === 'create' || !canCreate}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <CreditCard size={18} />
                {loading === 'create' ? 'Creating...' : 'Create virtual card'}
              </button>

              {!canCreate && (
                <p className="mt-3 text-sm text-slate-500">
                  Manager or admin access is required for manual card creation.
                </p>
              )}
            </section>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <VirtualGiftCard
              card={createdCard || giftCard}
              qrValue={qrValue}
              onCopy={copyCode}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <Icon size={18} className="text-[#F45D4F]" />
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
    </div>
  )
}

function BalanceTile({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className={['border p-3', emphasis ? 'border-[#F45D4F] bg-red-50' : 'border-slate-200 bg-slate-50'].join(' ')}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function VirtualGiftCard({
  card,
  qrValue,
  onCopy,
}: {
  card: GiftCard | null
  qrValue: string
  onCopy: (code: string) => void
}) {
  const amount = card ? money(card.initialAmount || card.balance) : '$25.00'
  const code = card?.code || 'MSH-XXXXXX'
  const imageUrl = card?.imageUrl || ''
  const qrUrl = qrValue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=12&data=${encodeURIComponent(qrValue)}`
    : ''

  if (imageUrl) {
    return (
      <section className="overflow-hidden border border-slate-900 bg-[#080706] text-white shadow-sm">
        <div className="border-b border-[#F28A6B]/40 bg-[#111] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F28A6B]">
            Virtual gift card
          </p>
        </div>
        <div className="p-4">
          <img
            src={imageUrl}
            alt={`Mai Sushi gift card ${code}`}
            className="w-full border border-[#F28A6B]/30 object-contain"
          />
          <div className="mt-4 flex items-center justify-between gap-3 border border-white/10 bg-black/40 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F28A6B]">
                Code
              </p>
              <p className="mt-1 text-xl font-semibold tracking-[0.12em] text-white">
                {code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => card && onCopy(card.code)}
              disabled={!card}
              className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-40"
              aria-label="Copy gift card code"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden border border-slate-900 bg-[#080706] text-white shadow-sm">
      <div className="border-b border-[#F28A6B]/40 bg-[#111] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F28A6B]">
          Virtual gift card
        </p>
      </div>

      <div className="relative p-5">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="relative">
          <img
            src="/maisushi_logo.svg"
            alt="MaiSushi"
            className="h-16 w-auto object-contain"
          />

          <div className="mt-8 border-l border-[#F28A6B] pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
              Gift card
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{amount}</p>
            <p className="mt-1 text-sm font-medium text-white/60">CAD</p>
          </div>

          <div className="mt-8 rounded-none border border-[#F28A6B]/70 bg-black/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F28A6B]">
                  Code
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-[0.12em] text-white">
                  {code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => card && onCopy(card.code)}
                disabled={!card}
                className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-40"
                aria-label="Copy gift card code"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[112px_1fr] gap-4">
            <div className="flex h-28 w-28 items-center justify-center bg-white p-2">
              {qrUrl ? (
                <img src={qrUrl} alt="Gift card QR" className="h-full w-full" />
              ) : (
                <QrCode className="text-slate-900" size={72} />
              )}
            </div>
            <div className="self-center text-sm leading-6 text-white/70">
              Valid in restaurant and online. Scan or enter the code to check balance and redeem.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

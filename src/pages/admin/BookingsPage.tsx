import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Phone, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { supabase, supabaseAdmin } from '../../lib/supabase'

type BookingStatus = 'requested' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'

interface BookingRow {
  id: string
  customer_name: string
  phone: string
  email: string | null
  starts_at: string
  party_size: number
  notes: string
  status: BookingStatus
  source: string
  created_at: string
}

const statusOptions: BookingStatus[] = [
  'requested',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
]

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusClass(status: BookingStatus) {
  switch (status) {
    case 'confirmed':
    case 'seated':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'completed':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'cancelled':
    case 'no_show':
      return 'bg-red-50 text-red-700 ring-red-200'
    case 'requested':
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200'
  }
}

export default function BookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')

  useEffect(() => {
    let mounted = true

    async function loadBookings() {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .order('starts_at', { ascending: true })

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setRows([])
      } else {
        setRows((data || []) as BookingRow[])
      }

      setLoading(false)
    }

    loadBookings()

    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => loadBookings(),
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((row) => row.status === filter)
  }, [filter, rows])

  const todayRows = useMemo(() => {
    const today = new Date()
    return rows.filter((row) => {
      const date = new Date(row.starts_at)
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      )
    })
  }, [rows])

  async function updateStatus(row: BookingRow, status: BookingStatus) {
    const timestampField =
      status === 'confirmed'
        ? 'confirmed_at'
        : status === 'seated'
          ? 'seated_at'
          : status === 'completed'
            ? 'completed_at'
            : status === 'cancelled'
              ? 'cancelled_at'
              : null

    const payload: Record<string, string> = { status }
    if (timestampField) payload[timestampField] = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(payload)
      .eq('id', row.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, status } : item)),
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <div className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Guest reservations
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Bookings
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review reservation requests from the website and fidelity app before service.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
              <Metric icon={CalendarDays} label="Total" value={rows.length} />
              <Metric icon={Clock} label="Today" value={todayRows.length} />
              <Metric
                icon={CheckCircle2}
                label="Requested"
                value={rows.filter((row) => row.status === 'requested').length}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto border border-slate-200 bg-white p-2 shadow-sm">
          {(['all', ...statusOptions] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={[
                'whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition',
                filter === status
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading bookings...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No bookings found.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredRows.map((row) => (
                <article key={row.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{row.customer_name}</h2>
                      <span
                        className={[
                          'inline-flex px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] ring-1',
                          statusClass(row.status),
                        ].join(' ')}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <Info icon={CalendarDays} text={formatDateTime(row.starts_at)} />
                      <Info icon={Users} text={`${row.party_size} guests`} />
                      <Info icon={Phone} text={row.phone} />
                      <Info icon={Clock} text={row.source.replace('_', ' ')} />
                    </div>

                    {row.email && <p className="mt-2 text-sm text-slate-500">{row.email}</p>}
                    {row.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{row.notes}</p>}
                  </div>

                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={row.status === status}
                        onClick={() => updateStatus(row, status)}
                        className="bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-3 py-3">
      <Icon className="mb-2 h-4 w-4 text-[#E62B2B]" />
      <div className="text-xl font-semibold text-slate-950">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
    </div>
  )
}

function Info({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{text}</span>
    </span>
  )
}

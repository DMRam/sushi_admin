import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock3,
  Gift,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UserRoundX,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { supabase, supabaseAdmin } from '../../lib/supabase'

type ClientRow = {
  id: string
  firebase_uid: string | null
  email: string | null
  full_name: string | null
  phone: string | null
  points: number | null
  total_points: number | null
  current_tier: string | null
  is_blocked?: boolean | null
  blocked_at?: string | null
  blocked_reason?: string | null
  admin_notes?: string | null
  deleted_at?: string | null
  created_at: string | null
  updated_at: string | null
}

type PointsRow = {
  user_id: string
  points: number | null
}

type PointsHistoryRow = {
  user_id: string
  points: number | null
  description: string | null
  transaction_type?: string | null
  type?: string | null
  created_at: string | null
}

type OrderRow = {
  id: string
  user_id: string | null
  final_total?: number | string | null
  status?: string | null
  created_at?: string | null
  order_date?: string | null
}

type BookingRow = {
  id: string
  email: string | null
  phone: string | null
  status: string | null
  starts_at: string | null
  created_at: string | null
}

type ClaimRow = {
  id: string
  user_id: string
  is_used: boolean | null
  claimed_at: string | null
  used_at: string | null
  redemption_code: string | null
  reward?: {
    name?: string | null
  } | null
}

type EnrichedClient = ClientRow & {
  balance: number
  orderCount: number
  totalSpent: number
  bookingCount: number
  activeClaims: number
  usedClaims: number
  lastActivity: string | null
  latestPointActivity?: PointsHistoryRow
}

function money(value: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clientName(client: ClientRow) {
  return client.full_name || client.email || 'Unnamed client'
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [points, setPoints] = useState<PointsRow[]>([])
  const [history, setHistory] = useState<PointsHistoryRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [schemaWarning, setSchemaWarning] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function loadClients() {
    setLoading(true)
    setError('')
    setSchemaWarning('')

    const baseClientSelect =
      'id,firebase_uid,email,full_name,phone,points,total_points,current_tier,created_at,updated_at'
    const adminClientSelect = `${baseClientSelect},is_blocked,blocked_at,blocked_reason,admin_notes,deleted_at`

    let clientResult: {
      data: unknown[] | null
      error: { message: string } | null
    } = await supabaseAdmin
      .from('client_profiles')
      .select(adminClientSelect)
      .order('created_at', { ascending: false })

    if (clientResult.error?.message?.includes('does not exist')) {
      setSchemaWarning(
        'Client block/delete controls need the Supabase migration 202605290002_add_client_admin_controls.sql.',
      )
      clientResult = await supabaseAdmin
        .from('client_profiles')
        .select(baseClientSelect)
        .order('created_at', { ascending: false })
    }

    if (clientResult.error) {
      setError(clientResult.error.message)
      setClients([])
      setLoading(false)
      return
    }

    const nextClients = (clientResult.data || []) as ClientRow[]
    const ids = nextClients.map((client) => client.id)
    const emails = nextClients.map((client) => normalize(client.email)).filter(Boolean)
    const phones = nextClients.map((client) => normalize(client.phone)).filter(Boolean)

    const empty = { data: [], error: null }
    const [pointsResult, historyResult, ordersResult, claimsResult, bookingsResult] =
      await Promise.all([
        ids.length
          ? supabaseAdmin.from('user_points').select('user_id,points').in('user_id', ids)
          : empty,
        ids.length
          ? supabaseAdmin
              .from('points_history')
              .select('user_id,points,description,transaction_type,type,created_at')
              .in('user_id', ids)
              .order('created_at', { ascending: false })
              .limit(300)
          : empty,
        ids.length
          ? supabaseAdmin
              .from('orders')
              .select('id,user_id,final_total,status,created_at,order_date')
              .in('user_id', ids)
              .order('created_at', { ascending: false })
              .limit(500)
          : empty,
        ids.length
          ? supabaseAdmin
              .from('user_claimed_rewards')
              .select('id,user_id,is_used,claimed_at,used_at,redemption_code,reward:rewards(name)')
              .in('user_id', ids)
              .order('claimed_at', { ascending: false })
              .limit(300)
          : empty,
        emails.length || phones.length
          ? supabaseAdmin
              .from('bookings')
              .select('id,email,phone,status,starts_at,created_at')
              .or(
                [
                  emails.length ? `email.in.(${emails.map((email) => `"${email}"`).join(',')})` : '',
                  phones.length ? `phone.in.(${phones.map((phone) => `"${phone}"`).join(',')})` : '',
                ]
                  .filter(Boolean)
                  .join(','),
              )
              .order('starts_at', { ascending: false })
              .limit(300)
          : empty,
      ])

    const loadError =
      pointsResult.error ||
      historyResult.error ||
      ordersResult.error ||
      claimsResult.error ||
      bookingsResult.error

    if (loadError) {
      setError(loadError.message)
    }

    setClients(nextClients)
    setPoints((pointsResult.data || []) as PointsRow[])
    setHistory((historyResult.data || []) as PointsHistoryRow[])
    setOrders((ordersResult.data || []) as OrderRow[])
    setClaims((claimsResult.data || []) as ClaimRow[])
    setBookings((bookingsResult.data || []) as BookingRow[])
    setLoading(false)
  }

  async function updateClientStatus(client: EnrichedClient, blocked: boolean) {
    const reason = blocked
      ? window.prompt('Reason for blocking this client? This is internal only.', client.blocked_reason || '')
      : null

    if (blocked && reason === null) return

    setActionLoading(client.id)
    setError('')
    setMessage('')

    const { error: updateError } = await supabaseAdmin
      .from('client_profiles')
      .update({
        is_blocked: blocked,
        blocked_at: blocked ? new Date().toISOString() : null,
        blocked_reason: blocked ? reason || 'Blocked by admin' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)

    setActionLoading('')

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage(blocked ? 'Client blocked.' : 'Client unblocked.')
    await loadClients()
  }

  async function softDeleteClient(client: EnrichedClient) {
    const confirmed = window.confirm(
      `Archive and anonymize ${clientName(client)}? This keeps historical orders/rewards linked for reporting, but removes direct contact details from the client profile.`,
    )

    if (!confirmed) return

    setActionLoading(client.id)
    setError('')
    setMessage('')

    const deletedEmail = `deleted-${client.id}@maisushi.local`
    const { error: updateError } = await supabaseAdmin
      .from('client_profiles')
      .update({
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_reason: 'Archived by admin',
        deleted_at: new Date().toISOString(),
        full_name: 'Deleted client',
        email: deletedEmail,
        phone: null,
        admin_notes: `Archived profile. Previous email: ${client.email || 'none'}. Previous phone: ${
          client.phone || 'none'
        }.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)

    setActionLoading('')

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSelectedId(null)
    setMessage('Client archived and anonymized.')
    await loadClients()
  }

  useEffect(() => {
    loadClients()

    const channel = supabase
      .channel('admin-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_profiles' }, () =>
        loadClients(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points' }, () =>
        loadClients(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_claimed_rewards' }, () =>
        loadClients(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const enrichedClients = useMemo<EnrichedClient[]>(() => {
    const pointMap = new Map(points.map((row) => [row.user_id, numberValue(row.points)]))
    const historyMap = new Map<string, PointsHistoryRow>()
    const orderMap = new Map<string, { count: number; total: number; last: string | null }>()
    const claimMap = new Map<string, { active: number; used: number; last: string | null }>()
    const bookingMap = new Map<string, number>()

    history.forEach((item) => {
      if (!historyMap.has(item.user_id)) historyMap.set(item.user_id, item)
    })

    orders.forEach((order) => {
      if (!order.user_id) return
      const existing = orderMap.get(order.user_id) || { count: 0, total: 0, last: null }
      const total = numberValue(order.final_total)
      const date = order.created_at || order.order_date || null
      orderMap.set(order.user_id, {
        count: existing.count + 1,
        total: existing.total + total,
        last: date && (!existing.last || new Date(date) > new Date(existing.last)) ? date : existing.last,
      })
    })

    claims.forEach((claim) => {
      const existing = claimMap.get(claim.user_id) || { active: 0, used: 0, last: null }
      const date = claim.used_at || claim.claimed_at || null
      claimMap.set(claim.user_id, {
        active: existing.active + (claim.is_used ? 0 : 1),
        used: existing.used + (claim.is_used ? 1 : 0),
        last: date && (!existing.last || new Date(date) > new Date(existing.last)) ? date : existing.last,
      })
    })

    bookings.forEach((booking) => {
      const email = normalize(booking.email)
      const phone = normalize(booking.phone)
      const matchingClient = clients.find(
        (client) => normalize(client.email) === email || normalize(client.phone) === phone,
      )
      if (!matchingClient) return
      bookingMap.set(matchingClient.id, (bookingMap.get(matchingClient.id) || 0) + 1)
    })

    return clients.map((client) => {
      const orderStats = orderMap.get(client.id) || { count: 0, total: 0, last: null }
      const claimStats = claimMap.get(client.id) || { active: 0, used: 0, last: null }
      const latestPointActivity = historyMap.get(client.id)
      const dates = [
        client.updated_at,
        latestPointActivity?.created_at,
        orderStats.last,
        claimStats.last,
      ].filter(Boolean) as string[]
      const lastActivity = dates.sort((a, b) => Number(new Date(b)) - Number(new Date(a)))[0] || null

      return {
        ...client,
        balance: pointMap.get(client.id) ?? numberValue(client.total_points) ?? numberValue(client.points),
        orderCount: orderStats.count,
        totalSpent: orderStats.total,
        bookingCount: bookingMap.get(client.id) || 0,
        activeClaims: claimStats.active,
        usedClaims: claimStats.used,
        latestPointActivity,
        lastActivity,
      }
    })
  }, [bookings, claims, clients, history, orders, points])

  const filteredClients = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return enrichedClients

    return enrichedClients.filter((client) =>
      [clientName(client), client.email, client.phone, client.current_tier]
        .map(normalize)
        .some((value) => value.includes(needle)),
    )
  }, [enrichedClients, query])

  const stats = useMemo(() => {
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)

    return {
      totalClients: enrichedClients.filter((client) => !client.deleted_at).length,
      activeClients: enrichedClients.filter(
        (client) =>
          !client.deleted_at && client.lastActivity && new Date(client.lastActivity) >= monthAgo,
      ).length,
      totalPoints: enrichedClients.reduce((sum, client) => sum + client.balance, 0),
      activeClaims: enrichedClients.reduce((sum, client) => sum + client.activeClaims, 0),
    }
  }, [enrichedClients])

  const selectedClient = filteredClients.find((client) => client.id === selectedId) || null

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <section className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Client registry
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Registered clients
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Review loyalty members from the website and fidelity app. Use this to identify
                clients, check balances, inspect reward claims, and prepare future Clover matching.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[640px]">
              <Metric icon={Users} label="Clients" value={String(stats.totalClients)} />
              <Metric icon={Clock3} label="Active 30d" value={String(stats.activeClients)} />
              <Metric icon={Star} label="Points" value={String(stats.totalPoints)} />
              <Metric icon={Gift} label="Open claims" value={String(stats.activeClaims)} />
            </div>
          </div>
        </section>

        <section className="mb-4 border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, email, phone, or tier"
                className="h-11 w-full border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-slate-950 focus:bg-white"
              />
            </label>

            <button
              type="button"
              onClick={loadClients}
              className="inline-flex h-11 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-4 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {schemaWarning && (
          <div className="mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {schemaWarning}
          </div>
        )}

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No clients found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Points</th>
                      <th className="px-4 py-3 font-semibold">Orders</th>
                      <th className="px-4 py-3 font-semibold">Bookings</th>
                      <th className="px-4 py-3 font-semibold">Rewards</th>
                      <th className="px-4 py-3 font-semibold">Last activity</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedId(client.id)}
                        className={[
                          'cursor-pointer transition hover:bg-slate-50',
                          selectedId === client.id ? 'bg-red-50/60' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-slate-950 text-sm font-semibold text-white">
                              {clientName(client).slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">{clientName(client)}</p>
                              <p className="truncate text-xs text-slate-500">{client.email || 'No email'}</p>
                              {client.phone && <p className="text-xs text-slate-500">{client.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-lg font-semibold text-slate-950">{client.balance}</p>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            {client.current_tier || 'Bronze'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{client.orderCount}</p>
                          <p className="text-xs text-slate-500">{money(client.totalSpent)}</p>
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-950">{client.bookingCount}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{client.activeClaims} active</p>
                          <p className="text-xs text-slate-500">{client.usedClaims} used</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {formatDate(client.lastActivity || client.updated_at || client.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] ring-1',
                              client.deleted_at
                                ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                : client.is_blocked
                                  ? 'bg-red-50 text-red-700 ring-red-200'
                                  : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                            ].join(' ')}
                          >
                            {client.deleted_at ? 'Archived' : client.is_blocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="border border-slate-200 bg-white p-4 shadow-sm">
            {selectedClient ? (
              <ClientDetails
                client={selectedClient}
                actionLoading={actionLoading === selectedClient.id}
                controlsReady={!schemaWarning}
                onToggleBlock={() => updateClientStatus(selectedClient, !selectedClient.is_blocked)}
                onSoftDelete={() => softDeleteClient(selectedClient)}
              />
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <UserRoundCheck className="h-10 w-10 text-slate-300" />
                <h2 className="mt-4 text-lg font-semibold text-slate-950">Select a client</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Click a row to inspect loyalty balance, contact details, rewards, and customer
                  activity.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function ClientDetails({
  client,
  actionLoading,
  controlsReady,
  onToggleBlock,
  onSoftDelete,
}: {
  client: EnrichedClient
  actionLoading: boolean
  controlsReady: boolean
  onToggleBlock: () => void
  onSoftDelete: () => void
}) {
  return (
    <div>
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-slate-950 text-lg font-semibold text-white">
          {clientName(client).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-950">{clientName(client)}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#E62B2B]">
            {client.deleted_at
              ? 'Archived client'
              : client.is_blocked
                ? 'Blocked client'
                : client.current_tier || 'Bronze member'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="Points" value={String(client.balance)} />
        <MiniMetric label="Spent" value={money(client.totalSpent)} />
        <MiniMetric label="Orders" value={String(client.orderCount)} />
        <MiniMetric label="Bookings" value={String(client.bookingCount)} />
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <Detail icon={Mail} label="Email" value={client.email || 'No email'} />
        <Detail icon={Phone} label="Phone" value={client.phone || 'No phone'} />
        <Detail icon={CalendarDays} label="Joined" value={formatDate(client.created_at)} />
        <Detail icon={Clock3} label="Last activity" value={formatDate(client.lastActivity)} />
        {client.blocked_at && (
          <Detail icon={UserRoundX} label="Blocked" value={formatDate(client.blocked_at)} />
        )}
      </div>

      {client.blocked_reason && (
        <div className="mt-4 border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
            Block reason
          </p>
          <p className="mt-2 text-sm leading-6 text-red-800">{client.blocked_reason}</p>
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          disabled={!controlsReady || actionLoading || Boolean(client.deleted_at)}
          onClick={onToggleBlock}
          className={[
            'admin-action-button h-11 w-full disabled:cursor-not-allowed disabled:opacity-50',
            client.is_blocked ? 'admin-action-button--success' : 'admin-action-button--danger',
          ].join(' ')}
        >
          {client.is_blocked ? <UserRoundCheck className="h-4 w-4" /> : <UserRoundX className="h-4 w-4" />}
          {actionLoading ? 'Saving...' : client.is_blocked ? 'Unblock account' : 'Block account'}
        </button>
        <p className="text-xs leading-5 text-slate-500">
          Blocks stop the client account from being used while keeping orders, rewards, and reporting history intact.
        </p>

        <button
          type="button"
          disabled={!controlsReady || actionLoading || Boolean(client.deleted_at)}
          onClick={onSoftDelete}
          className="admin-action-button h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Archive / anonymize
        </button>
        <p className="text-xs leading-5 text-slate-500">
          Archive/anonymize is for privacy cleanup. It removes direct contact details and keeps historical totals for business reports.
        </p>
      </div>

      <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Latest points activity
        </p>
        {client.latestPointActivity ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {Number(client.latestPointActivity.points || 0) > 0 ? '+' : ''}
              {client.latestPointActivity.points || 0} points
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {client.latestPointActivity.description || 'Points update'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {formatDate(client.latestPointActivity.created_at)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No points activity yet.</p>
        )}
      </div>

      <div className="mt-4 border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Clover matching
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Ready for the next step: match Clover customers and in-store transactions by email or
          phone once the Clover customer endpoint is connected.
        </p>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <Icon className="mb-2 h-4 w-4 text-[#E62B2B]" />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="break-words font-medium text-slate-950">{value}</p>
      </div>
    </div>
  )
}

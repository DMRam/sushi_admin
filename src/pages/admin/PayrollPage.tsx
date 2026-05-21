import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { db } from '../../firebase/firebase'

type ShiftSource = 'manual' | 'n8n' | 'clover'

type EmployeeShift = {
  id: string
  date: string
  employeeId: string
  employeeName: string
  clockIn: string
  clockOut: string
  breakMinutes: number
  hourlyRate: number
  source: ShiftSource
  notes: string
  approved: boolean
}

type ManualTipDay = {
  id: string
  date: string
  amount: number
  notes: string
}

type CloverTipPayment = {
  id: string
  date: string
  createdAt: Date
  amount: number
  tipAmount: number
  employeeName: string
  orderId: string
}

type ComputedShift = EmployeeShift & {
  workedHours: number
  eligibleTipHours: number
  regularHours: number
  overtimeHours: number
  wagePay: number
}

type DailyTipPool = {
  date: string
  eligibleTips: number
  manualTips: number
  cloverTips: number
  eligibleHours: number
  allocations: Array<{
    employeeName: string
    eligibleHours: number
    tipAmount: number
  }>
}

type EmployeePayrollSummary = {
  employeeName: string
  workedHours: number
  eligibleTipHours: number
  regularHours: number
  overtimeHours: number
  wagePay: number
  tips: number
  estimatedGross: number
}

const CLOVER_CASH_EVENTS_PROXY_URL =
  import.meta.env.VITE_CLOVER_CASH_EVENTS_PROXY_URL ||
  import.meta.env.VITE_CLOVER_DASHBOARD_URL ||
  ''

const emptyShift: Omit<EmployeeShift, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  employeeId: '',
  employeeName: '',
  clockIn: '16:00',
  clockOut: '22:00',
  breakMinutes: 30,
  hourlyRate: 16,
  source: 'manual',
  notes: '',
  approved: false,
}

function money(value: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number.isFinite(value) ? value : 0)
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function parseTimeToMinutes(time: string) {
  if (!time || !time.includes(':')) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function normalizeDate(value: any): Date {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value > 9999999999 ? value : value * 1000)
  return new Date(value)
}

function isSaturday(date: string) {
  const localDate = new Date(`${date}T12:00:00`)
  return localDate.getDay() === 6
}

function isWithinPeriod(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate
}

function calculateWorkedHours(shift: EmployeeShift) {
  const start = parseTimeToMinutes(shift.clockIn)
  let end = parseTimeToMinutes(shift.clockOut)
  if (end <= start) end += 24 * 60

  const minutes = Math.max(0, end - start - Number(shift.breakMinutes || 0))
  return round2(minutes / 60)
}

function calculateEligibleTipHours(shift: EmployeeShift) {
  const start = parseTimeToMinutes(shift.clockIn)
  let end = parseTimeToMinutes(shift.clockOut)
  if (end <= start) end += 24 * 60

  const grossShiftMinutes = Math.max(0, end - start)
  if (!grossShiftMinutes) return 0

  const poolStart = isSaturday(shift.date) ? 0 : 16 * 60
  const poolEnd = 24 * 60
  const eligibleGrossMinutes = Math.max(0, Math.min(end, poolEnd) - Math.max(start, poolStart))
  if (!eligibleGrossMinutes) return 0

  const breakShare = Number(shift.breakMinutes || 0) * (eligibleGrossMinutes / grossShiftMinutes)
  return round2(Math.max(0, eligibleGrossMinutes - breakShare) / 60)
}

function computeShift(shift: EmployeeShift): ComputedShift {
  const workedHours = calculateWorkedHours(shift)
  const overtimeHours = round2(Math.max(0, workedHours - 8))
  const regularHours = round2(workedHours - overtimeHours)
  const wagePay = round2((regularHours * shift.hourlyRate) + (overtimeHours * shift.hourlyRate * 1.5))

  return {
    ...shift,
    workedHours,
    eligibleTipHours: calculateEligibleTipHours(shift),
    regularHours,
    overtimeHours,
    wagePay,
  }
}

function amountFromMaybeCents(value: unknown) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return 0
  return Math.abs(numeric) >= 100 ? numeric / 100 : numeric
}

function normalizeCloverTipPayment(raw: any, index: number): CloverTipPayment {
  const order = raw.order || {}
  const employee = raw.employee || order.employee || {}
  const createdAt = normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt)

  return {
    id: raw.id || `clover-tip-${index}`,
    date: dateKey(createdAt),
    createdAt,
    amount: amountFromMaybeCents(raw.amount || raw.total),
    tipAmount: amountFromMaybeCents(raw.tipAmount || raw.tip || raw.gratuityAmount),
    employeeName: employee.name || employee.displayName || employee.id || 'Unassigned',
    orderId: order.id || raw.orderId || '',
  }
}

function buildCsv(summary: EmployeePayrollSummary[], shifts: ComputedShift[], pools: DailyTipPool[]) {
  const employeeLines = [
    ['Employee', 'Worked Hours', 'Eligible Tip Hours', 'Regular Hours', 'Overtime Hours', 'Wages', 'Tips', 'Estimated Gross'],
    ...summary.map((row) => [
      row.employeeName,
      row.workedHours.toFixed(2),
      row.eligibleTipHours.toFixed(2),
      row.regularHours.toFixed(2),
      row.overtimeHours.toFixed(2),
      row.wagePay.toFixed(2),
      row.tips.toFixed(2),
      row.estimatedGross.toFixed(2),
    ]),
  ]

  const shiftLines = [
    [],
    ['Shifts'],
    ['Date', 'Employee', 'Clock In', 'Clock Out', 'Break Minutes', 'Source', 'Worked Hours', 'Eligible Tip Hours', 'Wage Pay'],
    ...shifts.map((shift) => [
      shift.date,
      shift.employeeName,
      shift.clockIn,
      shift.clockOut,
      String(shift.breakMinutes),
      shift.source,
      shift.workedHours.toFixed(2),
      shift.eligibleTipHours.toFixed(2),
      shift.wagePay.toFixed(2),
    ]),
  ]

  const poolLines = [
    [],
    ['Daily Tip Pools'],
    ['Date', 'Eligible Tips', 'Manual Tips', 'Clover Tips', 'Eligible Hours'],
    ...pools.map((pool) => [
      pool.date,
      pool.eligibleTips.toFixed(2),
      pool.manualTips.toFixed(2),
      pool.cloverTips.toFixed(2),
      pool.eligibleHours.toFixed(2),
    ]),
  ]

  return [...employeeLines, ...shiftLines, ...poolLines]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export default function PayrollPage() {
  const [shifts, setShifts] = useState<EmployeeShift[]>([])
  const [manualTips, setManualTips] = useState<ManualTipDay[]>([])
  const [cloverTips, setCloverTips] = useState<CloverTipPayment[]>([])
  const [newShift, setNewShift] = useState<Omit<EmployeeShift, 'id'>>(emptyShift)
  const [tipDraft, setTipDraft] = useState({ date: emptyShift.date, amount: 0, notes: '' })
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    return date.toISOString().slice(0, 10)
  })
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [cloverLoading, setCloverLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribers: Unsubscribe[] = []

    unsubscribers.push(onSnapshot(
      query(collection(db, 'employeeShifts'), orderBy('date', 'desc')),
      (snapshot) => {
        setShifts(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<EmployeeShift, 'id'>),
        })))
        setLoading(false)
      },
      (snapshotError) => {
        console.error('Failed to load employee shifts', snapshotError)
        setError('Unable to load employee shifts.')
        setLoading(false)
      }
    ))

    unsubscribers.push(onSnapshot(
      query(collection(db, 'payrollDailyTips'), orderBy('date', 'desc')),
      (snapshot) => {
        setManualTips(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ManualTipDay, 'id'>),
        })))
      },
      (snapshotError) => {
        console.error('Failed to load manual tips', snapshotError)
      }
    ))

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const loadCloverTips = async () => {
    if (!CLOVER_CASH_EVENTS_PROXY_URL) {
      setCloverTips([])
      return
    }

    setCloverLoading(true)

    try {
      const url = new URL(CLOVER_CASH_EVENTS_PROXY_URL)
      url.searchParams.set('limit', '20')
      url.searchParams.set('orderLimit', '50')
      url.searchParams.set('detailLimit', '4')

      const response = await fetch(url.toString(), {
        headers: { accept: 'application/json' },
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || `Clover proxy returned ${response.status}`)
      }

      const payments = Array.isArray(payload?.recentPayments) ? payload.recentPayments : []
      setCloverTips(
        payments
          .map((payment: any, index: number) => normalizeCloverTipPayment(payment, index))
          .filter((payment: CloverTipPayment) => payment.tipAmount > 0)
      )
    } catch (loadError: any) {
      console.error('Failed to load Clover tips', loadError)
      setError(loadError?.message || 'Unable to load Clover tips.')
    } finally {
      setCloverLoading(false)
    }
  }

  useEffect(() => {
    loadCloverTips()
  }, [])

  const periodShifts = useMemo(() => {
    return shifts
      .filter((shift) => isWithinPeriod(shift.date, periodStart, periodEnd))
      .map(computeShift)
      .sort((a, b) => `${b.date}${b.clockIn}`.localeCompare(`${a.date}${a.clockIn}`))
  }, [shifts, periodStart, periodEnd])

  const periodManualTips = useMemo(() => {
    return manualTips.filter((tip) => isWithinPeriod(tip.date, periodStart, periodEnd))
  }, [manualTips, periodStart, periodEnd])

  const periodCloverTips = useMemo(() => {
    return cloverTips.filter((tip) => isWithinPeriod(tip.date, periodStart, periodEnd))
  }, [cloverTips, periodStart, periodEnd])

  const dailyTipPools = useMemo<DailyTipPool[]>(() => {
    const dates = new Set<string>()
    periodShifts.forEach((shift) => dates.add(shift.date))
    periodManualTips.forEach((tip) => dates.add(tip.date))
    periodCloverTips.forEach((tip) => dates.add(tip.date))

    return Array.from(dates)
      .sort()
      .map((date) => {
        const dayShifts = periodShifts.filter((shift) => shift.date === date)
        const manualTipTotal = round2(periodManualTips
          .filter((tip) => tip.date === date)
          .reduce((sum, tip) => sum + Number(tip.amount || 0), 0))
        const cloverTipTotal = round2(periodCloverTips
          .filter((tip) => tip.date === date)
          .reduce((sum, tip) => sum + tip.tipAmount, 0))
        const eligibleTips = round2(manualTipTotal + cloverTipTotal)
        const eligibleHours = round2(dayShifts.reduce((sum, shift) => sum + shift.eligibleTipHours, 0))

        return {
          date,
          eligibleTips,
          manualTips: manualTipTotal,
          cloverTips: cloverTipTotal,
          eligibleHours,
          allocations: dayShifts
            .filter((shift) => shift.eligibleTipHours > 0)
            .map((shift) => ({
              employeeName: shift.employeeName,
              eligibleHours: shift.eligibleTipHours,
              tipAmount: eligibleHours > 0
                ? round2((shift.eligibleTipHours / eligibleHours) * eligibleTips)
                : 0,
            })),
        }
      })
  }, [periodShifts, periodManualTips, periodCloverTips])

  const employeeSummary = useMemo<EmployeePayrollSummary[]>(() => {
    const grouped = new Map<string, EmployeePayrollSummary>()

    periodShifts.forEach((shift) => {
      const current = grouped.get(shift.employeeName) || {
        employeeName: shift.employeeName,
        workedHours: 0,
        eligibleTipHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        wagePay: 0,
        tips: 0,
        estimatedGross: 0,
      }

      current.workedHours = round2(current.workedHours + shift.workedHours)
      current.eligibleTipHours = round2(current.eligibleTipHours + shift.eligibleTipHours)
      current.regularHours = round2(current.regularHours + shift.regularHours)
      current.overtimeHours = round2(current.overtimeHours + shift.overtimeHours)
      current.wagePay = round2(current.wagePay + shift.wagePay)

      grouped.set(shift.employeeName, current)
    })

    dailyTipPools.forEach((pool) => {
      pool.allocations.forEach((allocation) => {
        const current = grouped.get(allocation.employeeName)
        if (!current) return
        current.tips = round2(current.tips + allocation.tipAmount)
      })
    })

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        estimatedGross: round2(row.wagePay + row.tips),
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [periodShifts, dailyTipPools])

  const totals = useMemo(() => {
    return {
      workedHours: round2(employeeSummary.reduce((sum, row) => sum + row.workedHours, 0)),
      eligibleTipHours: round2(employeeSummary.reduce((sum, row) => sum + row.eligibleTipHours, 0)),
      wages: round2(employeeSummary.reduce((sum, row) => sum + row.wagePay, 0)),
      tips: round2(employeeSummary.reduce((sum, row) => sum + row.tips, 0)),
      gross: round2(employeeSummary.reduce((sum, row) => sum + row.estimatedGross, 0)),
    }
  }, [employeeSummary])

  const addShift = async () => {
    if (!newShift.date || !newShift.employeeName || !newShift.clockIn || !newShift.clockOut) return

    await addDoc(collection(db, 'employeeShifts'), {
      ...newShift,
      employeeId: newShift.employeeId || newShift.employeeName.trim().toLowerCase().replace(/\s+/g, '_'),
      breakMinutes: Number(newShift.breakMinutes || 0),
      hourlyRate: Number(newShift.hourlyRate || 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setNewShift(emptyShift)
  }

  const removeShift = async (id: string) => {
    await deleteDoc(doc(db, 'employeeShifts', id))
  }

  const saveManualTip = async () => {
    if (!tipDraft.date || Number(tipDraft.amount || 0) <= 0) return

    await setDoc(doc(db, 'payrollDailyTips', tipDraft.date), {
      date: tipDraft.date,
      amount: Number(tipDraft.amount || 0),
      notes: tipDraft.notes,
      source: 'manual',
      updatedAt: serverTimestamp(),
    })

    setTipDraft({ date: tipDraft.date, amount: 0, notes: '' })
  }

  const removeManualTip = async (date: string) => {
    await deleteDoc(doc(db, 'payrollDailyTips', date))
  }

  const exportCsv = () => {
    const csv = buildCsv(employeeSummary, periodShifts, dailyTipPools)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `maisushi-payroll-${periodStart}-to-${periodEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-[1760px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-gray-200 bg-[radial-gradient(circle_at_8%_10%,rgba(242,99,80,0.2),transparent_27rem),linear-gradient(135deg,#111827,#030712)] p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <WalletCards className="h-3.5 w-3.5 text-[#f26350]" />
                Payroll and tips
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Employee hours and tip pool
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-white/65 sm:text-base">
                Tips are pooled by eligible hours worked. Saturdays count all day; other days count only work after 16:00 until close.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadCloverTips}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCw className={`h-4 w-4 ${cloverLoading ? 'animate-spin' : ''}`} />
                Sync Clover tips
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-black/20 transition hover:bg-gray-100"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Worked hours" value={`${totals.workedHours.toFixed(2)} h`} detail={`${periodShifts.length} shifts`} />
          <MetricCard label="Eligible tip hours" value={`${totals.eligibleTipHours.toFixed(2)} h`} detail="After 16:00, except Saturdays" />
          <MetricCard label="Tip pool" value={money(totals.tips)} detail={`${money(periodCloverTips.reduce((sum, tip) => sum + tip.tipAmount, 0))} Clover tips`} />
          <MetricCard label="Wages" value={money(totals.wages)} detail="Before deductions" />
          <MetricCard label="Gross estimate" value={money(totals.gross)} detail="Wages plus tips" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Period</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">Payroll window</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start">
                  <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="input" />
                </Field>
                <Field label="End">
                  <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="input" />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Sources</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Shifts support manual, n8n, and Clover source labels. n8n can post into `employeeShifts` using the same fields.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={Clock} label="Time tracking" title="Add shift" />
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Date">
                <input type="date" value={newShift.date} onChange={(event) => setNewShift((prev) => ({ ...prev, date: event.target.value }))} className="input" />
              </Field>
              <Field label="Employee">
                <input value={newShift.employeeName} onChange={(event) => setNewShift((prev) => ({ ...prev, employeeName: event.target.value }))} className="input" placeholder="Employee name" />
              </Field>
              <Field label="Clock in">
                <input type="time" value={newShift.clockIn} onChange={(event) => setNewShift((prev) => ({ ...prev, clockIn: event.target.value }))} className="input" />
              </Field>
              <Field label="Clock out">
                <input type="time" value={newShift.clockOut} onChange={(event) => setNewShift((prev) => ({ ...prev, clockOut: event.target.value }))} className="input" />
              </Field>
              <Field label="Break minutes">
                <input type="number" min="0" value={newShift.breakMinutes} onChange={(event) => setNewShift((prev) => ({ ...prev, breakMinutes: Number(event.target.value || 0) }))} className="input" />
              </Field>
              <Field label="Hourly rate">
                <input type="number" min="0" step="0.01" value={newShift.hourlyRate} onChange={(event) => setNewShift((prev) => ({ ...prev, hourlyRate: Number(event.target.value || 0) }))} className="input" />
              </Field>
              <Field label="Source">
                <select value={newShift.source} onChange={(event) => setNewShift((prev) => ({ ...prev, source: event.target.value as ShiftSource }))} className="input">
                  <option value="manual">Manual</option>
                  <option value="n8n">n8n</option>
                  <option value="clover">Clover</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={addShift} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                  <Plus className="h-4 w-4" />
                  Add shift
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={WalletCards} label="Tips" title="Manual daily tips" />
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Date">
                <input type="date" value={tipDraft.date} onChange={(event) => setTipDraft((prev) => ({ ...prev, date: event.target.value }))} className="input" />
              </Field>
              <Field label="Tip amount">
                <input type="number" min="0" step="0.01" value={tipDraft.amount} onChange={(event) => setTipDraft((prev) => ({ ...prev, amount: Number(event.target.value || 0) }))} className="input" />
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={saveManualTip} className="rounded-2xl bg-[#f26350] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#df4f3d]">
                  Save
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Use this when cash tips or adjusted tips are not available from Clover.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={CalendarDays} label="Allocations" title="Daily tip pools" />
            <div className="mt-5 space-y-3">
              {dailyTipPools.length ? dailyTipPools.map((pool) => (
                <div key={pool.date} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-950">{pool.date}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {isSaturday(pool.date) ? 'Saturday all day' : 'After 16:00'} · {pool.eligibleHours.toFixed(2)} eligible hours
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-950">{money(pool.eligibleTips)}</p>
                      <p className="text-xs text-gray-500">Clover {money(pool.cloverTips)} · Manual {money(pool.manualTips)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pool.allocations.length ? pool.allocations.map((allocation) => (
                      <div key={`${pool.date}-${allocation.employeeName}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                        <span className="font-medium text-gray-800">{allocation.employeeName}</span>
                        <span className="text-gray-500">{allocation.eligibleHours.toFixed(2)} h · <strong className="text-gray-950">{money(allocation.tipAmount)}</strong></span>
                      </div>
                    )) : (
                      <p className="rounded-xl bg-white px-3 py-2 text-sm text-gray-500">No eligible hours for this tip pool.</p>
                    )}
                  </div>
                </div>
              )) : (
                <EmptyState title="No tip pools yet" description="Add shifts and tips to calculate the allocation." />
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={WalletCards} label="Employee summary" title="Payroll estimate" />
            <div className="mt-5 space-y-3">
              {employeeSummary.length ? employeeSummary.map((row) => (
                <div key={row.employeeName} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-950">{row.employeeName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {row.workedHours.toFixed(2)} h worked · {row.eligibleTipHours.toFixed(2)} h tip eligible
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-gray-950">{money(row.estimatedGross)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <MiniStat label="Wages" value={money(row.wagePay)} />
                    <MiniStat label="Tips" value={money(row.tips)} />
                    <MiniStat label="OT" value={`${row.overtimeHours.toFixed(2)} h`} />
                  </div>
                </div>
              )) : (
                <EmptyState title="No payroll summary" description={loading ? 'Loading shifts...' : 'Add shifts for the selected period.'} />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Clock} label="Review" title="Shift log" />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Hours</th>
                  <th className="px-3 py-3">Tip eligible</th>
                  <th className="px-3 py-3">Rate</th>
                  <th className="px-3 py-3">Source</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {periodShifts.map((shift) => (
                  <tr key={shift.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium text-gray-950">{shift.date}</td>
                    <td className="px-3 py-3">{shift.employeeName}</td>
                    <td className="px-3 py-3">{shift.clockIn} - {shift.clockOut} · {shift.breakMinutes} min break</td>
                    <td className="px-3 py-3">{shift.workedHours.toFixed(2)}</td>
                    <td className="px-3 py-3">{shift.eligibleTipHours.toFixed(2)}</td>
                    <td className="px-3 py-3">{money(shift.hourlyRate)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{shift.source}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => removeShift(shift.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={WalletCards} label="Clover" title="Tips detected from POS" />
            <div className="mt-5 space-y-2">
              {periodCloverTips.length ? periodCloverTips.map((tip) => (
                <div key={tip.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-950">{tip.date}</p>
                    <p className="text-gray-500">{tip.employeeName} · order {tip.orderId || 'unknown'}</p>
                  </div>
                  <p className="font-semibold text-gray-950">{money(tip.tipAmount)}</p>
                </div>
              )) : (
                <EmptyState title="No Clover tips loaded" description="Sync Clover tips or add manual daily tips." />
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={AlertTriangle} label="Manual" title="Manual tip adjustments" />
            <div className="mt-5 space-y-2">
              {periodManualTips.length ? periodManualTips.map((tip) => (
                <div key={tip.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-950">{tip.date}</p>
                    <p className="text-gray-500">{tip.notes || 'Manual tip pool amount'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-950">{money(tip.amount)}</p>
                    <button type="button" onClick={() => removeManualTip(tip.date)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <EmptyState title="No manual tips" description="Manual tips are optional when Clover has complete tip data." />
              )}
            </div>
          </div>
        </section>
      </div>
      <style>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .input:focus {
          border-color: #f26350;
          box-shadow: 0 0 0 3px rgba(242, 99, 80, 0.12);
        }
      `}</style>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  title,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  title: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
      </div>
      <Icon className="h-5 w-5 text-[#f26350]" />
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

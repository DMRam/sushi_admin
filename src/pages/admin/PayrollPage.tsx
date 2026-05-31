import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react'
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
  writeBatch,
} from 'firebase/firestore'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { db } from '../../firebase/firebase'

type ShiftSource = 'manual' | 'spreadsheet' | 'n8n' | 'clover'

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

type PayrollEmployee = {
  id: string
  name: string
  hourlyRate: number
  tipped: boolean
  role: string
  active: boolean
  notes: string
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
  windowLabel: string
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
  employeeId: string
  employeeName: string
  workedHours: number
  eligibleTipHours: number
  regularHours: number
  overtimeHours: number
  wagePay: number
  tips: number
  estimatedGross: number
  deductions: PayrollDeductionEstimate
  employerContributions: PayrollEmployerContributionEstimate
  estimatedNetPay: number
}

type PayrollDeductionEstimate = {
  federalTax: number
  quebecTax: number
  qpp: number
  qpip: number
  ei: number
  total: number
}

type PayrollEmployerContributionEstimate = {
  qpp: number
  qpip: number
  ei: number
  total: number
}

type PayrollImportResult = {
  fileName: string
  imported: number
  skipped: number
  employeesCreated: number
  messages: string[]
}

type PayrollImportRow = Record<string, unknown> & {
  __rowNumber?: number
  __sheetName?: string
}

type PayrollImportPreview = PayrollImportResult & {
  shifts: Array<Omit<EmployeeShift, 'id'>>
  employeesToCreate: Array<Omit<PayrollEmployee, 'id'> & { id: string }>
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

const emptyEmployee = {
  name: '',
  hourlyRate: 16.6,
  tipped: true,
  role: 'Service',
  active: true,
  notes: '',
}

const QUEBEC_GENERAL_MIN_WAGE_2026 = 16.6
const QUEBEC_TIPPED_MIN_WAGE_2026 = 13.3
const PAYROLL_2026 = {
  federalBasicPersonalAmount: 16129,
  quebecBasicPersonalAmount: 18571,
  quebecFederalAbatement: 0.165,
  qpp: {
    employeeRate: 0.064,
    employerRate: 0.064,
    basicExemption: 3500,
    firstMaxPensionableEarnings: 71300,
    secondMaxPensionableEarnings: 81200,
    secondRate: 0.04,
  },
  qpip: {
    employeeRate: 0.00494,
    employerRate: 0.00692,
    maxInsurableEarnings: 98000,
  },
  ei: {
    employeeRateQuebec: 0.013,
    employerMultiplier: 1.4,
    maxInsurableEarnings: 68400,
  },
  federalBrackets: [
    { upTo: 58523, rate: 0.14 },
    { upTo: 117047, rate: 0.205 },
    { upTo: 182408, rate: 0.26 },
    { upTo: 258482, rate: 0.29 },
    { upTo: Infinity, rate: 0.33 },
  ],
  quebecBrackets: [
    { upTo: 53255, rate: 0.14 },
    { upTo: 106495, rate: 0.19 },
    { upTo: 129590, rate: 0.24 },
    { upTo: Infinity, rate: 0.2575 },
  ],
}
const COMPANY_INFO = {
  legalName: 'MaiSushi by Pacifique',
  tradeName: 'MaiSushi',
  address: 'Sherbrooke, QC',
  website: 'maisushi.ca',
  phone: '',
  employerIds: {
    rq: 'Revenu Quebec employer no. pending',
    cra: 'CRA payroll account pending',
    cnesst: 'CNESST no. pending',
  },
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeEmployeeId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, '')
}

function firstMatchingValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader)
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeHeader(key)))
  return entry?.[1]
}

const payrollRequiredHeaders = [
  ['Fecha', 'Date', 'Dia'],
  ['Nombre', 'Employee', 'Employe', 'Empleado', 'Name'],
  ['Hora Entrada', 'Entrada', 'Clock In', 'Start', 'In'],
  ['Hora Salida', 'Salida', 'Clock Out', 'End', 'Out'],
]

function headerMatchesAliases(header: unknown, aliases: string[]) {
  const normalizedHeader = normalizeHeader(String(header || ''))
  return aliases.some((alias) => normalizeHeader(alias) === normalizedHeader)
}

function isPayrollHeaderRow(row: unknown[]) {
  return payrollRequiredHeaders.every((aliases) =>
    row.some((cell) => headerMatchesAliases(cell, aliases))
  )
}

function buildRowsFromHeaderMatrix(matrix: unknown[][], sheetName: string, headerIndex: number): PayrollImportRow[] {
  const headers = matrix[headerIndex].map((cell) => String(cell || '').trim())

  return matrix.slice(headerIndex + 1).map((row, rowOffset) => {
    const record: PayrollImportRow = {
      __rowNumber: headerIndex + rowOffset + 2,
      __sheetName: sheetName,
    }

    headers.forEach((header, columnIndex) => {
      if (!header) return
      record[header] = row[columnIndex] ?? ''
    })

    return record
  })
}

function getPayrollImportRows(workbook: XLSX.WorkBook): PayrollImportRow[] {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
      blankrows: false,
    })

    const headerIndex = matrix.findIndex(isPayrollHeaderRow)
    if (headerIndex >= 0) {
      return buildRowsFromHeaderMatrix(matrix, sheetName, headerIndex)
    }
  }

  throw new Error('No payroll sheet found. Expected headers: Fecha, Nombre, Hora Entrada, and Hora Salida.')
}

function excelSerialToDate(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value)
  if (!parsed) return ''
  return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
}

function normalizeImportedDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateKey(value)
  if (typeof value === 'number') return excelSerialToDate(value)

  const text = String(value || '').trim()
  if (!text) return ''
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  const localMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (localMatch) {
    const year = localMatch[3].length === 2 ? `20${localMatch[3]}` : localMatch[3]
    return `${year}-${localMatch[2].padStart(2, '0')}-${localMatch[1].padStart(2, '0')}`
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : dateKey(date)
}

function normalizeImportedTime(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const totalMinutes = Math.round((value % 1) * 24 * 60)
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
  }

  const text = String(value || '').trim()
  if (!text) return ''

  const match = text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i)
  if (!match) return ''

  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return ''

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseImportedNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value || '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function shiftDuplicateKey(shift: Pick<EmployeeShift, 'date' | 'employeeName' | 'clockIn' | 'clockOut'>) {
  return `${shift.date}:${normalizeEmployeeId(shift.employeeName)}:${shift.clockIn}:${shift.clockOut}`
}

function getWeekKey(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

function normalizeDate(value: any): Date {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value > 9999999999 ? value : value * 1000)
  return new Date(value)
}

type TipPoolWindow = {
  start: number
  end: number
  label: string
}

function getLocalDay(date: string) {
  const localDate = new Date(`${date}T12:00:00`)
  return localDate.getDay()
}

function getTipPoolWindow(date: string): TipPoolWindow | null {
  const day = getLocalDay(date)

  if (day === 4) {
    return { start: 16 * 60, end: 22 * 60, label: 'Thu 16:00-22:00' }
  }

  if (day === 5) {
    return { start: 16 * 60, end: 22 * 60, label: 'Fri 16:00-22:00' }
  }

  if (day === 6) {
    return { start: 12 * 60, end: 22 * 60, label: 'Sat 12:00-22:00' }
  }

  return null
}

function minutesSinceLocalMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function isCloverTipEligibleForPool(tip: CloverTipPayment) {
  const window = getTipPoolWindow(tip.date)
  if (!window) return false

  const minutes = minutesSinceLocalMidnight(tip.createdAt)
  return minutes >= window.start && minutes <= window.end
}

function isWithinPeriod(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate
}

function daysInPeriod(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return Math.max(1, days)
}

function annualizeAmount(amount: number, startDate: string, endDate: string) {
  return amount * (365 / daysInPeriod(startDate, endDate))
}

function periodizeAnnualAmount(amount: number, startDate: string, endDate: string) {
  return amount * (daysInPeriod(startDate, endDate) / 365)
}

function calculateProgressiveTax(amount: number, brackets: Array<{ upTo: number; rate: number }>) {
  let remaining = Math.max(0, amount)
  let previousLimit = 0
  let tax = 0

  for (const bracket of brackets) {
    const bandSize = bracket.upTo === Infinity ? remaining : Math.max(0, bracket.upTo - previousLimit)
    const taxableBand = Math.min(remaining, bandSize)
    tax += taxableBand * bracket.rate
    remaining -= taxableBand
    previousLimit = bracket.upTo
    if (remaining <= 0) break
  }

  return round2(tax)
}

function calculateQppAnnual(gross: number) {
  const firstTierIncome = Math.max(
    0,
    Math.min(gross, PAYROLL_2026.qpp.firstMaxPensionableEarnings) - PAYROLL_2026.qpp.basicExemption
  )
  const secondTierIncome = Math.max(
    0,
    Math.min(gross, PAYROLL_2026.qpp.secondMaxPensionableEarnings) - PAYROLL_2026.qpp.firstMaxPensionableEarnings
  )

  return round2((firstTierIncome * PAYROLL_2026.qpp.employeeRate) + (secondTierIncome * PAYROLL_2026.qpp.secondRate))
}

function calculatePayrollDeductions(gross: number, periodStart: string, periodEnd: string): PayrollDeductionEstimate {
  const annualGross = annualizeAmount(gross, periodStart, periodEnd)
  const federalTaxBeforeCredits = calculateProgressiveTax(annualGross, PAYROLL_2026.federalBrackets)
  const federalCredit = PAYROLL_2026.federalBasicPersonalAmount * PAYROLL_2026.federalBrackets[0].rate
  const federalAfterCredit = Math.max(0, federalTaxBeforeCredits - federalCredit)
  const federalTaxAnnual = federalAfterCredit * (1 - PAYROLL_2026.quebecFederalAbatement)

  const quebecTaxBeforeCredits = calculateProgressiveTax(annualGross, PAYROLL_2026.quebecBrackets)
  const quebecCredit = PAYROLL_2026.quebecBasicPersonalAmount * PAYROLL_2026.quebecBrackets[0].rate
  const quebecTaxAnnual = Math.max(0, quebecTaxBeforeCredits - quebecCredit)

  const qpp = periodizeAnnualAmount(calculateQppAnnual(annualGross), periodStart, periodEnd)
  const qpip = Math.min(annualGross, PAYROLL_2026.qpip.maxInsurableEarnings) * PAYROLL_2026.qpip.employeeRate
  const ei = Math.min(annualGross, PAYROLL_2026.ei.maxInsurableEarnings) * PAYROLL_2026.ei.employeeRateQuebec

  const deductions = {
    federalTax: round2(periodizeAnnualAmount(federalTaxAnnual, periodStart, periodEnd)),
    quebecTax: round2(periodizeAnnualAmount(quebecTaxAnnual, periodStart, periodEnd)),
    qpp: round2(qpp),
    qpip: round2(periodizeAnnualAmount(qpip, periodStart, periodEnd)),
    ei: round2(periodizeAnnualAmount(ei, periodStart, periodEnd)),
    total: 0,
  }

  deductions.total = round2(deductions.federalTax + deductions.quebecTax + deductions.qpp + deductions.qpip + deductions.ei)
  return deductions
}

function calculateEmployerContributions(gross: number, deductions: PayrollDeductionEstimate, periodStart: string, periodEnd: string): PayrollEmployerContributionEstimate {
  const annualGross = annualizeAmount(gross, periodStart, periodEnd)
  const qpipAnnual = Math.min(annualGross, PAYROLL_2026.qpip.maxInsurableEarnings) * PAYROLL_2026.qpip.employerRate
  const qpip = round2(periodizeAnnualAmount(qpipAnnual, periodStart, periodEnd))
  const ei = round2(deductions.ei * PAYROLL_2026.ei.employerMultiplier)
  const qpp = deductions.qpp

  return {
    qpp,
    qpip,
    ei,
    total: round2(qpp + qpip + ei),
  }
}

function calculateWorkedHours(shift: EmployeeShift) {
  const start = parseTimeToMinutes(shift.clockIn)
  let end = parseTimeToMinutes(shift.clockOut)
  if (end <= start) end += 24 * 60

  const minutes = Math.max(0, end - start - Number(shift.breakMinutes || 0))
  return round2(minutes / 60)
}

function calculateEligibleTipHours(shift: EmployeeShift) {
  const window = getTipPoolWindow(shift.date)
  if (!window) return 0

  const start = parseTimeToMinutes(shift.clockIn)
  let end = parseTimeToMinutes(shift.clockOut)
  if (end <= start) end += 24 * 60

  const grossShiftMinutes = Math.max(0, end - start)
  if (!grossShiftMinutes) return 0

  const eligibleGrossMinutes = Math.max(0, Math.min(end, window.end) - Math.max(start, window.start))
  if (!eligibleGrossMinutes) return 0

  const breakShare = Number(shift.breakMinutes || 0) * (eligibleGrossMinutes / grossShiftMinutes)
  return round2(Math.max(0, eligibleGrossMinutes - breakShare) / 60)
}

function computeShift(shift: EmployeeShift): ComputedShift {
  const workedHours = calculateWorkedHours(shift)

  return {
    ...shift,
    workedHours,
    eligibleTipHours: calculateEligibleTipHours(shift),
    regularHours: workedHours,
    overtimeHours: 0,
    wagePay: round2(workedHours * shift.hourlyRate),
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
    ['Employee', 'Worked Hours', 'Eligible Tip Hours', 'Regular Hours', 'Overtime Hours', 'Wages', 'Tips', 'Gross', 'Federal Tax Est.', 'Quebec Tax Est.', 'QPP Est.', 'QPIP Est.', 'EI Est.', 'Total Deductions Est.', 'Net Pay Est.', 'Employer Contributions Est.'],
    ...summary.map((row) => [
      row.employeeName,
      row.workedHours.toFixed(2),
      row.eligibleTipHours.toFixed(2),
      row.regularHours.toFixed(2),
      row.overtimeHours.toFixed(2),
      row.wagePay.toFixed(2),
      row.tips.toFixed(2),
      row.estimatedGross.toFixed(2),
      row.deductions.federalTax.toFixed(2),
      row.deductions.quebecTax.toFixed(2),
      row.deductions.qpp.toFixed(2),
      row.deductions.qpip.toFixed(2),
      row.deductions.ei.toFixed(2),
      row.deductions.total.toFixed(2),
      row.estimatedNetPay.toFixed(2),
      row.employerContributions.total.toFixed(2),
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
    ['Date', 'Pool Window', 'Eligible Tips', 'Manual Tips', 'Clover Tips', 'Eligible Hours'],
    ...pools.map((pool) => [
      pool.date,
      pool.windowLabel,
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
  const shiftFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [employees, setEmployees] = useState<PayrollEmployee[]>([])
  const [shifts, setShifts] = useState<EmployeeShift[]>([])
  const [manualTips, setManualTips] = useState<ManualTipDay[]>([])
  const [cloverTips, setCloverTips] = useState<CloverTipPayment[]>([])
  const [newShift, setNewShift] = useState<Omit<EmployeeShift, 'id'>>(emptyShift)
  const [employeeDraft, setEmployeeDraft] = useState<Omit<PayrollEmployee, 'id'>>(emptyEmployee)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
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
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<PayrollImportResult | null>(null)
  const [importPreview, setImportPreview] = useState<PayrollImportPreview | null>(null)

  useEffect(() => {
    const unsubscribers: Unsubscribe[] = []

    unsubscribers.push(onSnapshot(
      query(collection(db, 'payrollEmployees'), orderBy('name', 'asc')),
      (snapshot) => {
        setEmployees(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PayrollEmployee, 'id'>),
        })))
      },
      (snapshotError) => {
        console.error('Failed to load payroll employees', snapshotError)
      }
    ))

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
    return manualTips.filter((tip) => isWithinPeriod(tip.date, periodStart, periodEnd) && Boolean(getTipPoolWindow(tip.date)))
  }, [manualTips, periodStart, periodEnd])

  const periodCloverTips = useMemo(() => {
    return cloverTips.filter((tip) => isWithinPeriod(tip.date, periodStart, periodEnd) && isCloverTipEligibleForPool(tip))
  }, [cloverTips, periodStart, periodEnd])

  const employeeOptions = useMemo(() => {
    const byId = new Map<string, PayrollEmployee>()
    employees
      .filter((employee) => employee.active !== false)
      .forEach((employee) => byId.set(employee.id, employee))

    shifts.forEach((shift) => {
      const id = shift.employeeId || normalizeEmployeeId(shift.employeeName)
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: shift.employeeName,
          hourlyRate: shift.hourlyRate,
          tipped: true,
          role: 'Existing',
          active: true,
          notes: '',
        })
      }
    })

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [employees, shifts])

  const dailyTipPools = useMemo<DailyTipPool[]>(() => {
    const dates = new Set<string>()
    periodShifts.forEach((shift) => {
      if (getTipPoolWindow(shift.date)) dates.add(shift.date)
    })
    periodManualTips.forEach((tip) => dates.add(tip.date))
    periodCloverTips.forEach((tip) => dates.add(tip.date))

    return Array.from(dates)
      .sort()
      .map((date) => {
        const window = getTipPoolWindow(date)
        const dayShifts = window ? periodShifts.filter((shift) => shift.date === date) : []
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
          windowLabel: window?.label || 'No tip pool',
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
    const weeklyBuckets = new Map<string, ComputedShift[]>()

    periodShifts.forEach((shift) => {
      const employeeId = shift.employeeId || normalizeEmployeeId(shift.employeeName)
      const current = grouped.get(employeeId) || {
        employeeId,
        employeeName: shift.employeeName,
        workedHours: 0,
        eligibleTipHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        wagePay: 0,
        tips: 0,
        estimatedGross: 0,
        deductions: {
          federalTax: 0,
          quebecTax: 0,
          qpp: 0,
          qpip: 0,
          ei: 0,
          total: 0,
        },
        employerContributions: {
          qpp: 0,
          qpip: 0,
          ei: 0,
          total: 0,
        },
        estimatedNetPay: 0,
      }

      current.workedHours = round2(current.workedHours + shift.workedHours)
      current.eligibleTipHours = round2(current.eligibleTipHours + shift.eligibleTipHours)

      grouped.set(employeeId, current)

      const weekKey = `${employeeId}:${getWeekKey(shift.date)}`
      weeklyBuckets.set(weekKey, [...(weeklyBuckets.get(weekKey) || []), shift])
    })

    weeklyBuckets.forEach((weekShifts) => {
      const sorted = [...weekShifts].sort((a, b) => `${a.date}${a.clockIn}`.localeCompare(`${b.date}${b.clockIn}`))
      let regularRemaining = 40

      sorted.forEach((shift) => {
        const employeeId = shift.employeeId || normalizeEmployeeId(shift.employeeName)
        const current = grouped.get(employeeId)
        if (!current) return

        const regularHours = round2(Math.min(regularRemaining, shift.workedHours))
        const overtimeHours = round2(Math.max(0, shift.workedHours - regularHours))
        regularRemaining = round2(Math.max(0, regularRemaining - regularHours))

        current.regularHours = round2(current.regularHours + regularHours)
        current.overtimeHours = round2(current.overtimeHours + overtimeHours)
        current.wagePay = round2(current.wagePay + (regularHours * shift.hourlyRate) + (overtimeHours * shift.hourlyRate * 1.5))
      })
    })

    dailyTipPools.forEach((pool) => {
      pool.allocations.forEach((allocation) => {
        const employeeId = normalizeEmployeeId(allocation.employeeName)
        const current = grouped.get(employeeId) || Array.from(grouped.values()).find((row) => row.employeeName === allocation.employeeName)
        if (!current) return
        current.tips = round2(current.tips + allocation.tipAmount)
      })
    })

    return Array.from(grouped.values())
      .map((row) => {
        const estimatedGross = round2(row.wagePay + row.tips)
        const deductions = calculatePayrollDeductions(estimatedGross, periodStart, periodEnd)
        const employerContributions = calculateEmployerContributions(estimatedGross, deductions, periodStart, periodEnd)

        return {
          ...row,
          estimatedGross,
          deductions,
          employerContributions,
          estimatedNetPay: round2(estimatedGross - deductions.total),
        }
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [periodShifts, dailyTipPools, periodStart, periodEnd])

  const totals = useMemo(() => {
    return {
      workedHours: round2(employeeSummary.reduce((sum, row) => sum + row.workedHours, 0)),
      eligibleTipHours: round2(employeeSummary.reduce((sum, row) => sum + row.eligibleTipHours, 0)),
      wages: round2(employeeSummary.reduce((sum, row) => sum + row.wagePay, 0)),
      tips: round2(employeeSummary.reduce((sum, row) => sum + row.tips, 0)),
      gross: round2(employeeSummary.reduce((sum, row) => sum + row.estimatedGross, 0)),
      deductions: round2(employeeSummary.reduce((sum, row) => sum + row.deductions.total, 0)),
      netPay: round2(employeeSummary.reduce((sum, row) => sum + row.estimatedNetPay, 0)),
      employerContributions: round2(employeeSummary.reduce((sum, row) => sum + row.employerContributions.total, 0)),
    }
  }, [employeeSummary])

  const employeeById = useMemo(() => {
    return new Map(employeeOptions.map((employee) => [employee.id, employee]))
  }, [employeeOptions])

  const parsePayrollSpreadsheet = async (file: File): Promise<PayrollImportPreview> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const rows = getPayrollImportRows(workbook)
    const existingShiftKeys = new Set(shifts.map(shiftDuplicateKey))
    const importedShiftKeys = new Set<string>()
    const existingEmployeeIds = new Set(employeeOptions.map((employee) => employee.id))
    const createdEmployeeIds = new Set<string>()
    const messages: string[] = []
    const parsedShifts: Array<Omit<EmployeeShift, 'id'>> = []
    const employeesToCreate: Array<Omit<PayrollEmployee, 'id'> & { id: string }> = []
    let skipped = 0

    rows.forEach((row, index) => {
      const date = normalizeImportedDate(firstMatchingValue(row, ['Fecha', 'Date', 'Dia']))
      const employeeName = String(firstMatchingValue(row, ['Nombre', 'Employee', 'Employe', 'Empleado', 'Name']) || '').trim()
      const clockIn = normalizeImportedTime(firstMatchingValue(row, ['Hora Entrada', 'Entrada', 'Clock In', 'Start', 'In']))
      const clockOut = normalizeImportedTime(firstMatchingValue(row, ['Hora Salida', 'Salida', 'Clock Out', 'End', 'Out']))
      const breakMinutes = parseImportedNumber(firstMatchingValue(row, ['Min Colacion', 'Min Colación', 'Break', 'Pause', 'Break Minutes']), 0)
      const weekNumber = String(firstMatchingValue(row, ['Semana #', 'Semana', 'Week', 'Week #']) || '').trim()
      const paymentStatus = String(firstMatchingValue(row, ['Estado de pago', 'Estado Pago', 'Payment Status', 'Paid Status']) || '').trim()
      const observations = String(firstMatchingValue(row, ['Observaciones', 'Notes', 'Notas', 'Comments']) || '').trim()

      if (!date && !employeeName && !clockIn && !clockOut) return

      if (!date || !employeeName || !clockIn || !clockOut) {
        skipped += 1
        if (messages.length < 8) {
          messages.push(`Row ${row.__rowNumber || index + 2}: skipped because date, employee, clock in, or clock out is missing.`)
        }
        return
      }

      const employeeId = normalizeEmployeeId(employeeName)
      const hourlyRate = employeeById.get(employeeId)?.hourlyRate || QUEBEC_GENERAL_MIN_WAGE_2026
      const notes = [
        observations,
        paymentStatus ? `Payment status: ${paymentStatus}` : '',
        weekNumber ? `Week: ${weekNumber}` : '',
        `Imported from ${file.name}`,
      ].filter(Boolean).join(' | ')
      const importedShift: Omit<EmployeeShift, 'id'> = {
        date,
        employeeId,
        employeeName,
        clockIn,
        clockOut,
        breakMinutes,
        hourlyRate,
        source: 'spreadsheet',
        notes,
        approved: paymentStatus.toLowerCase().includes('pagado') || paymentStatus.toLowerCase().includes('paid'),
      }
      const duplicateKey = shiftDuplicateKey(importedShift)

      if (existingShiftKeys.has(duplicateKey) || importedShiftKeys.has(duplicateKey)) {
        skipped += 1
        return
      }

      if (!existingEmployeeIds.has(employeeId) && !createdEmployeeIds.has(employeeId)) {
        employeesToCreate.push({
          id: employeeId,
          name: employeeName,
          hourlyRate,
          tipped: true,
          role: 'Imported',
          active: true,
          notes: `Created from payroll import: ${file.name}`,
        })
        createdEmployeeIds.add(employeeId)
      }

      parsedShifts.push(importedShift)
      importedShiftKeys.add(duplicateKey)
    })

    return {
      fileName: file.name,
      imported: parsedShifts.length,
      skipped,
      employeesCreated: employeesToCreate.length,
      messages,
      shifts: parsedShifts,
      employeesToCreate,
    }
  }

  const importPayrollSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setImportResult(null)
    setImportPreview(null)
    setError(null)

    try {
      const preview = await parsePayrollSpreadsheet(file)
      setImportPreview(preview)
      if (preview.imported === 0 && preview.employeesCreated === 0) {
        setImportResult(preview)
      }
    } catch (importError: any) {
      console.error('Failed to parse payroll spreadsheet', importError)
      setImportResult({
        fileName: file.name,
        imported: 0,
        skipped: 0,
        employeesCreated: 0,
        messages: [importError?.message || 'Unable to read spreadsheet.'],
      })
    } finally {
      setImportLoading(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const confirmPayrollImport = async () => {
    if (!importPreview) return

    setImportLoading(true)
    setError(null)

    try {
      const batch = writeBatch(db)

      importPreview.employeesToCreate.forEach((employee) => {
        const { id, ...employeePayload } = employee
        batch.set(doc(db, 'payrollEmployees', id), {
          ...employeePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
      })

      importPreview.shifts.forEach((shift) => {
        batch.set(doc(collection(db, 'employeeShifts')), {
          ...shift,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })

      if (importPreview.imported > 0 || importPreview.employeesCreated > 0) {
        await batch.commit()
      }

      setImportResult({
        fileName: importPreview.fileName,
        imported: importPreview.imported,
        skipped: importPreview.skipped,
        employeesCreated: importPreview.employeesCreated,
        messages: importPreview.messages,
      })
      setImportPreview(null)
    } catch (saveError: any) {
      console.error('Failed to save payroll import', saveError)
      setImportResult({
        fileName: importPreview.fileName,
        imported: 0,
        skipped: importPreview.skipped,
        employeesCreated: 0,
        messages: [saveError?.message || 'Unable to save imported shifts.'],
      })
    } finally {
      setImportLoading(false)
    }
  }

  const cancelPayrollImport = () => {
    setImportPreview(null)
    setImportResult(null)
  }

  const selectEmployeeForShift = (employeeId: string) => {
    const employee = employeeOptions.find((item) => item.id === employeeId)
    if (!employee) return

    setNewShift((prev) => ({
      ...prev,
      employeeId: employee.id,
      employeeName: employee.name,
      hourlyRate: Number(employee.hourlyRate || prev.hourlyRate || 0),
    }))
  }

  const saveEmployee = async () => {
    setEmployeeError(null)
    const name = employeeDraft.name.trim()
    if (!name) {
      setEmployeeError('Enter an employee name.')
      return
    }

    const id = normalizeEmployeeId(name)
    const duplicate = employeeOptions.find((employee) => employee.id === id || employee.name.trim().toLowerCase() === name.toLowerCase())
    if (duplicate) {
      setEmployeeError(`${duplicate.name} is already in the employee list.`)
      return
    }

    await setDoc(doc(db, 'payrollEmployees', id), {
      ...employeeDraft,
      name,
      hourlyRate: Number(employeeDraft.hourlyRate || 0),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setEmployeeDraft(emptyEmployee)
  }

  const addShift = async () => {
    setShiftError(null)
    if (!newShift.date || !newShift.employeeName || !newShift.clockIn || !newShift.clockOut) return
    const employeeId = newShift.employeeId || normalizeEmployeeId(newShift.employeeName)
    const duplicate = shifts.find((shift) => {
      if (editingShiftId && shift.id === editingShiftId) return false
      return shift.date === newShift.date &&
        (shift.employeeId || normalizeEmployeeId(shift.employeeName)) === employeeId &&
        shift.clockIn === newShift.clockIn &&
        shift.clockOut === newShift.clockOut
    })

    if (duplicate) {
      setShiftError('This employee already has the same shift entered for this date and time.')
      return
    }

    const payload = {
      ...newShift,
      employeeId,
      employeeName: newShift.employeeName.trim(),
      breakMinutes: Number(newShift.breakMinutes || 0),
      hourlyRate: Number(newShift.hourlyRate || 0),
      updatedAt: serverTimestamp(),
    }

    if (editingShiftId) {
      await setDoc(doc(db, 'employeeShifts', editingShiftId), payload, { merge: true })
    } else {
      await addDoc(collection(db, 'employeeShifts'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
    }

    setNewShift(emptyShift)
    setEditingShiftId(null)
  }

  const startEditShift = (shift: EmployeeShift) => {
    setEditingShiftId(shift.id)
    setShiftError(null)
    setNewShift({
      date: shift.date,
      employeeId: shift.employeeId || normalizeEmployeeId(shift.employeeName),
      employeeName: shift.employeeName,
      clockIn: shift.clockIn,
      clockOut: shift.clockOut,
      breakMinutes: Number(shift.breakMinutes || 0),
      hourlyRate: Number(shift.hourlyRate || 0),
      source: shift.source,
      notes: shift.notes || '',
      approved: Boolean(shift.approved),
    })
    window.setTimeout(() => {
      shiftFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const cancelEditShift = () => {
    setEditingShiftId(null)
    setShiftError(null)
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

  const printPaystubs = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-[1760px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Payroll control
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                Hours, wages, and tip sharing
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-500">
                Select Date A and Date B, then generate payroll estimates with Quebec and federal deduction lines for review.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadCloverTips}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${cloverLoading ? 'animate-spin' : ''}`} />
                Sync Clover tips
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                Generate CSV
              </button>
              <button
                type="button"
                onClick={printPaystubs}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f26350] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#df4f3d]"
              >
                <Printer className="h-4 w-4" />
                Print paystubs
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Hours to pay" value={`${totals.workedHours.toFixed(2)} h`} detail={`${periodShifts.length} shifts in period`} />
          <MetricCard label="Gross payroll" value={money(totals.gross)} detail={`${money(totals.wages)} wages + ${money(totals.tips)} tips`} />
          <MetricCard label="Employee deductions" value={money(totals.deductions)} detail="Federal, Quebec, QPP, QPIP, EI estimate" />
          <MetricCard label="Estimated net pay" value={money(totals.netPay)} detail={`${money(totals.employerContributions)} employer contributions`} />
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <PayrollStep number="1" title="Pick dates" detail="Choose the pay period you want to review." />
          <PayrollStep number="2" title="Select employee" detail="Use the employee list before adding a shift." />
          <PayrollStep number="3" title="Confirm tips" detail="Tips are shown separately from wages." />
          <PayrollStep number="4" title="Generate payroll" detail="Export CSV or print paystubs for the selected dates." />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={CheckCircle2} label="Company" title="Paystub header" />
            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="text-lg font-semibold text-gray-950">{COMPANY_INFO.legalName}</p>
              <p className="mt-1">{COMPANY_INFO.address}</p>
              <p>{COMPANY_INFO.website}</p>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                <span className="rounded-xl bg-white px-3 py-2">{COMPANY_INFO.employerIds.rq}</span>
                <span className="rounded-xl bg-white px-3 py-2">{COMPANY_INFO.employerIds.cra}</span>
                <span className="rounded-xl bg-white px-3 py-2">{COMPANY_INFO.employerIds.cnesst}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={AlertTriangle} label="Quebec / Canada" title="Payroll compliance checklist" />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ComplianceItem title="Quebec deductions" detail="Estimate includes Quebec tax, QPP/RRQ and QPIP/RQAP employee deductions, plus employer QPP/QPIP estimates." />
              <ComplianceItem title="Federal deductions" detail="Estimate includes federal tax with Quebec abatement and Quebec EI employee/employer estimates." />
              <ComplianceItem title="Vacation / indemnity" detail="Vacation pay is not calculated here. Add it in your payroll workflow according to the employee file." />
              <ComplianceItem title="Verify before remitting" detail="Use CRA/Revenu Quebec payroll tables or payroll software before paying/remitting. Employee TD1/TP-1015 forms can change deductions." />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Sources</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Quebec prep: estimated overtime is calculated after 40 hours per employee per work week. Tips are kept separate from wages, and tip sharing uses only eligible service windows.
                </p>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                  <span className="rounded-xl bg-gray-50 px-3 py-2">General minimum: {money(QUEBEC_GENERAL_MIN_WAGE_2026)}/h</span>
                  <span className="rounded-xl bg-gray-50 px-3 py-2">Tipped minimum: {money(QUEBEC_TIPPED_MIN_WAGE_2026)}/h</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={WalletCards} label="Generated payroll" title={`Payroll estimate: ${periodStart} to ${periodEnd}`} />
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MiniStat label="Gross" value={money(totals.gross)} />
            <MiniStat label="Federal tax" value={money(employeeSummary.reduce((sum, row) => sum + row.deductions.federalTax, 0))} />
            <MiniStat label="Quebec tax" value={money(employeeSummary.reduce((sum, row) => sum + row.deductions.quebecTax, 0))} />
            <MiniStat label="QPP / QPIP / EI" value={money(employeeSummary.reduce((sum, row) => sum + row.deductions.qpp + row.deductions.qpip + row.deductions.ei, 0))} />
            <MiniStat label="Net pay" value={money(totals.netPay)} />
            <MiniStat label="Employer contrib." value={money(totals.employerContributions)} />
          </div>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            These are payroll-prep estimates for the selected period. Confirm final Canada/Quebec source deductions with official payroll tables or payroll software before paying employees or remitting taxes.
          </p>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeader icon={FileSpreadsheet} label="Spreadsheet import" title="Import hours from Excel" />
              <div className="flex flex-wrap gap-3">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={importPayrollSpreadsheet}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={importLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {importLoading ? 'Importing...' : 'Upload spreadsheet'}
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-950">Accepted columns</p>
                <p className="mt-2 leading-6">Fecha, Nombre, Hora Entrada, Hora Salida, Min Colacion, Semana #, Estado de pago, Observaciones.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-950">Duplicate guard</p>
                <p className="mt-2 leading-6">Same employee, date, clock-in, and clock-out is skipped so re-importing is safer.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-950">Next automation</p>
                <p className="mt-2 leading-6">This matches the future n8n/POS/QR form shape: date, employee, in, out, break, status, notes.</p>
              </div>
            </div>
            {importPreview && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold">
                      Review before saving: {importPreview.fileName}
                    </p>
                    <p className="mt-1 text-blue-800">
                      {importPreview.imported} shifts ready for <code className="rounded bg-white/70 px-1">employeeShifts</code>,
                      {' '}{importPreview.employeesCreated} employees ready for <code className="rounded bg-white/70 px-1">payrollEmployees</code>,
                      {' '}{importPreview.skipped} skipped.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={cancelPayrollImport}
                      disabled={importLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 font-semibold text-blue-900 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmPayrollImport}
                      disabled={importLoading || importPreview.imported === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-3 py-2 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {importLoading ? 'Saving...' : 'Confirm import'}
                    </button>
                  </div>
                </div>

                {importPreview.messages.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-blue-800">
                    {importPreview.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}

                {importPreview.shifts.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-blue-100 bg-white">
                    <div className="max-h-72 overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="sticky top-0 bg-blue-950 text-white">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Date</th>
                            <th className="px-3 py-2 font-semibold">Employee</th>
                            <th className="px-3 py-2 font-semibold">Time</th>
                            <th className="px-3 py-2 font-semibold">Break</th>
                            <th className="px-3 py-2 font-semibold">Rate</th>
                            <th className="px-3 py-2 font-semibold">Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.shifts.slice(0, 12).map((shift) => (
                            <tr key={shiftDuplicateKey(shift)} className="border-t border-blue-100">
                              <td className="px-3 py-2">{shift.date}</td>
                              <td className="px-3 py-2 font-semibold">{shift.employeeName}</td>
                              <td className="px-3 py-2">{shift.clockIn} - {shift.clockOut}</td>
                              <td className="px-3 py-2">{shift.breakMinutes} min</td>
                              <td className="px-3 py-2">{money(shift.hourlyRate)}</td>
                              <td className="px-3 py-2">{shift.approved ? 'Yes' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreview.shifts.length > 12 && (
                      <p className="border-t border-blue-100 px-3 py-2 text-xs text-blue-700">
                        Showing first 12 of {importPreview.shifts.length} shifts.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {importResult && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${importResult.imported > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                <p className="font-semibold">
                  {importResult.fileName}: {importResult.imported} shifts imported, {importResult.skipped} skipped, {importResult.employeesCreated} employees created.
                </p>
                {importResult.messages.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {importResult.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-5 shadow-sm">
            <SectionHeader icon={Download} label="Webhook placeholder" title="Future n8n time clock" />
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Keep using Excel for now. Later, a QR form or POS automation can post the same fields directly into `employeeShifts`: employee, date, clockIn, clockOut, breakMinutes, source, notes, and approved status.
            </p>
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs leading-6 text-gray-600">
              <p className="font-semibold text-gray-950">Suggested webhook payload</p>
              <p>{'{"date":"2026-05-28","employeeName":"Alejandra","clockIn":"14:04","clockOut":"20:12","breakMinutes":30,"source":"n8n","notes":"QR time clock"}'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={Users} label="Employees" title="Employee list" />
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <Field label="Name">
                <input value={employeeDraft.name} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, name: event.target.value }))} className="input" placeholder="Employee name" />
              </Field>
              <Field label="Role">
                <input value={employeeDraft.role} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, role: event.target.value }))} className="input" placeholder="Server, kitchen, cashier..." />
              </Field>
              <Field label="Hourly rate">
                <input type="number" min="0" step="0.01" value={employeeDraft.hourlyRate} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, hourlyRate: Number(event.target.value || 0) }))} className="input" />
              </Field>
              <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={employeeDraft.tipped} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, tipped: event.target.checked }))} />
                Receives tips
              </label>
              {employeeError && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{employeeError}</p>}
              <button type="button" onClick={saveEmployee} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                <Plus className="h-4 w-4" />
                Add employee
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={Users} label="Employees" title="Active employees" />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {employeeOptions.length ? employeeOptions.map((employee, index) => (
                <div key={employee.id} className={`payroll-soft-row rounded-2xl border p-4 ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-950">{employee.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{employee.role || 'Employee'} · {employee.tipped ? 'Tip eligible' : 'No tips'}</p>
                      {employee.hourlyRate < (employee.tipped ? QUEBEC_TIPPED_MIN_WAGE_2026 : QUEBEC_GENERAL_MIN_WAGE_2026) && (
                        <p className="mt-2 rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          Below current Quebec minimum for this type.
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-950">{money(employee.hourlyRate)}/h</p>
                  </div>
                </div>
              )) : (
                <EmptyState title="No employees yet" description="Add employees once, then select them from the shift dropdown." />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div ref={shiftFormRef} className={`rounded-[28px] border bg-white p-5 shadow-sm transition ${editingShiftId ? 'border-[#f26350] ring-4 ring-[#f26350]/10' : 'border-gray-200'}`}>
            <SectionHeader icon={Clock} label="Time tracking" title={editingShiftId ? 'Edit shift' : 'Add shift'} />
            {editingShiftId && (
              <div className="mt-4 rounded-2xl border border-[#f26350]/20 bg-[#f26350]/10 px-4 py-3 text-sm font-semibold text-[#b63828]">
                Editing {newShift.employeeName} on {newShift.date}. Update the fields, then click Save shift.
              </div>
            )}
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Date">
                <input type="date" value={newShift.date} onChange={(event) => setNewShift((prev) => ({ ...prev, date: event.target.value }))} className="input" />
              </Field>
              <Field label="Employee">
                <select value={newShift.employeeId} onChange={(event) => selectEmployeeForShift(event.target.value)} className="input">
                  <option value="">Select employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </select>
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
                  <option value="spreadsheet">Spreadsheet</option>
                  <option value="n8n">n8n</option>
                  <option value="clover">Clover</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={addShift} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                  {editingShiftId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingShiftId ? 'Save shift' : 'Add shift'}
                </button>
              </div>
            </div>
            {editingShiftId && (
              <button type="button" onClick={cancelEditShift} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
                <X className="h-4 w-4" />
                Cancel editing
              </button>
            )}
            {shiftError && <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{shiftError}</p>}
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
              {dailyTipPools.length ? dailyTipPools.map((pool, index) => (
                <div key={pool.date} className={`payroll-soft-row rounded-2xl border p-4 ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-950">{pool.date}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {pool.windowLabel} · {pool.eligibleHours.toFixed(2)} eligible hours
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-950">{money(pool.eligibleTips)}</p>
                      <p className="text-xs text-gray-500">Clover {money(pool.cloverTips)} · Manual {money(pool.manualTips)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pool.allocations.length ? pool.allocations.map((allocation, allocationIndex) => (
                      <div key={`${pool.date}-${allocation.employeeName}`} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 ring-gray-100 ${allocationIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}`}>
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
              {employeeSummary.length ? employeeSummary.map((row, index) => (
                <div key={row.employeeName} className={`payroll-soft-row rounded-2xl border p-4 ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-950">{row.employeeName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {row.workedHours.toFixed(2)} h worked · {row.eligibleTipHours.toFixed(2)} h tip eligible
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-950">{money(row.estimatedNetPay)}</p>
                      <p className="text-xs text-gray-500">estimated net</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <MiniStat label="Gross" value={money(row.estimatedGross)} />
                    <MiniStat label="Deductions" value={money(row.deductions.total)} />
                    <MiniStat label="Employer" value={money(row.employerContributions.total)} />
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
          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
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
                {periodShifts.map((shift, index) => (
                  <tr
                    key={shift.id}
                    className={`border-b transition last:border-0 hover:bg-[#f26350]/5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'} ${editingShiftId === shift.id ? 'bg-[#f26350]/10 ring-1 ring-inset ring-[#f26350]/20' : ''}`}
                  >
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
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditShift(shift)} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      <button type="button" onClick={() => removeShift(shift.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={WalletCards} label="Clover" title="Tips detected from POS" />
            <div className="mt-5 space-y-2">
              {periodCloverTips.length ? periodCloverTips.map((tip, index) => (
                <div key={tip.id} className={`payroll-soft-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
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
              {periodManualTips.length ? periodManualTips.map((tip, index) => (
                <div key={tip.id} className={`payroll-soft-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div>
                    <p className="font-semibold text-gray-950">{tip.date}</p>
                    <p className="text-gray-500">{tip.notes || 'Manual tip pool amount'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-950">{money(tip.amount)}</p>
                    <button type="button" onClick={() => setTipDraft({ date: tip.date, amount: tip.amount, notes: tip.notes || '' })} className="text-gray-500 hover:text-gray-900">
                      <Edit3 className="h-4 w-4" />
                    </button>
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

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Printer} label="Paystubs" title="Printable paystub preview" />
          <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-500">
            Use Print paystubs, then choose Save as PDF in the browser print dialog. These are payroll-prep summaries, not official tax remittance calculations.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 printable-paystubs">
            {employeeSummary.length ? employeeSummary.map((row) => (
              <PaystubCard
                key={row.employeeName}
                row={row}
                employee={employeeById.get(row.employeeId)}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            )) : (
              <EmptyState title="No paystubs yet" description="Add shifts for the selected pay period." />
            )}
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

        .payroll-soft-row {
          border-color: #e5e7eb;
          box-shadow: inset 3px 0 0 rgba(242, 99, 80, 0.08);
          transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .payroll-soft-row:hover {
          border-color: rgba(242, 99, 80, 0.28);
          background-color: #fffaf8;
          box-shadow: inset 3px 0 0 rgba(242, 99, 80, 0.28), 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .printable-paystubs,
          .printable-paystubs * {
            visibility: visible !important;
          }

          .printable-paystubs {
            position: absolute;
            inset: 0;
            display: block !important;
            background: white;
            padding: 24px;
          }

          .paystub-card {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 20px;
            border: 1px solid #111827 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          @page {
            size: letter;
            margin: 0.45in;
          }
        }
      `}</style>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

function PaystubCard({
  row,
  employee,
  periodStart,
  periodEnd,
}: {
  row: EmployeePayrollSummary
  employee?: PayrollEmployee
  periodStart: string
  periodEnd: string
}) {
  const payDate = new Date().toISOString().slice(0, 10)

  return (
    <article className="paystub-card rounded-2xl border border-gray-200 bg-white p-0 shadow-sm">
      <div className="border-b border-gray-950 bg-gray-950 px-5 py-4 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Earnings statement</p>
            <h3 className="mt-2 text-2xl font-semibold">{COMPANY_INFO.tradeName}</h3>
            <p className="mt-1 text-sm text-white/70">{COMPANY_INFO.legalName} · {COMPANY_INFO.address}</p>
          </div>
          <div className="text-sm text-white/70 sm:text-right">
            <p>Period: <strong className="text-white">{periodStart} to {periodEnd}</strong></p>
            <p>Pay date: <strong className="text-white">{payDate}</strong></p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-b border-gray-200 md:grid-cols-2">
        <div className="border-b border-gray-200 p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Employee</p>
          <p className="mt-2 text-lg font-semibold text-gray-950">{row.employeeName}</p>
          <p className="mt-1 text-sm text-gray-500">{employee?.role || 'Employee'} · {employee?.tipped ? 'Receives tips' : 'No tips recorded'}</p>
          <p className="mt-1 text-sm text-gray-500">Employee ID: {row.employeeId}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Employer accounts</p>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>{COMPANY_INFO.employerIds.rq}</p>
            <p>{COMPANY_INFO.employerIds.cra}</p>
            <p>{COMPANY_INFO.employerIds.cnesst}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Earnings</p>
            <div className="mt-3 overflow-hidden border border-gray-200">
              <PaystubLine label="Regular hours" value={`${row.regularHours.toFixed(2)} h`} />
              <PaystubLine label="Overtime hours" value={`${row.overtimeHours.toFixed(2)} h`} />
              <PaystubLine label="Regular + overtime wages" value={money(row.wagePay)} />
              <PaystubLine label="Tips allocated" value={money(row.tips)} />
              <PaystubLine label="Gross earnings estimate" value={money(row.estimatedGross)} strong />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Estimated deductions</p>
            <div className="mt-3 overflow-hidden border border-gray-200">
              <PaystubLine label="Federal income tax" value={money(row.deductions.federalTax)} />
              <PaystubLine label="Quebec income tax" value={money(row.deductions.quebecTax)} />
              <PaystubLine label="QPP / RRQ" value={money(row.deductions.qpp)} />
              <PaystubLine label="QPIP / RQAP" value={money(row.deductions.qpip)} />
              <PaystubLine label="EI" value={money(row.deductions.ei)} />
              <PaystubLine label="Net pay estimate" value={money(row.estimatedNetPay)} strong />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <PaystubNote title="Employer remittances" detail={`Employer QPP/QPIP/EI estimate: ${money(row.employerContributions.total)}. CNESST and other remittances still need payroll review.`} />
          <PaystubNote title="Vacation / indemnity" detail="Vacation pay is not included in this estimate. Add it according to the employee record and pay period." />
          <PaystubNote title="Verify deductions" detail="Final source deductions depend on official payroll tables and employee federal/Quebec forms." />
        </div>

        <div className="mt-5 grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-2">
          <div className="h-16 border-b border-gray-300">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Prepared by</p>
          </div>
          <div className="h-16 border-b border-gray-300">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Employee acknowledgement</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function PaystubNote({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

function ComplianceItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="font-semibold text-gray-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-gray-500">{detail}</p>
    </div>
  )
}

function PaystubLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? 'font-semibold text-gray-950' : 'font-medium text-gray-800'}>{value}</span>
    </div>
  )
}

function PayrollStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-950 text-sm font-semibold text-white">
          {number}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-gray-500">{detail}</p>
        </div>
      </div>
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

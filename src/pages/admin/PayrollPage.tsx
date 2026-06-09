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
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { db } from '../../firebase/firebase'

type ShiftSource = 'manual' | 'spreadsheet' | 'n8n' | 'clover'
type ShiftSortKey = 'date' | 'employeeName' | 'clockIn' | 'workedHours' | 'eligibleTipHours' | 'hourlyRate' | 'source'
type SortDirection = 'asc' | 'desc'

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
  updated: number
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
  shiftsToUpdate: Array<{ id: string; shift: Omit<EmployeeShift, 'id'> }>
  employeesToCreate: Array<Omit<PayrollEmployee, 'id'> & { id: string }>
}

const CLOVER_CASH_EVENTS_PROXY_URL =
  import.meta.env.VITE_CLOVER_CASH_EVENTS_PROXY_URL ||
  import.meta.env.VITE_CLOVER_DASHBOARD_URL ||
  ''
const CLOVER_SERVICE_DAY_CUTOFF_MINUTES = 4 * 60

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

function getCurrentHalfMonthPeriod() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  if (day <= 15) {
    return {
      start: dateKey(new Date(year, month, 1)),
      end: dateKey(new Date(year, month, 15)),
    }
  }

  return {
    start: dateKey(new Date(year, month, 16)),
    end: dateKey(new Date(year, month + 1, 0)),
  }
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
    const first = Number(localMatch[1])
    const second = Number(localMatch[2])
    const month = second > 12 && first <= 12 ? first : second
    const day = second > 12 && first <= 12 ? second : first

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : dateKey(date)
}

function normalizeStoredShiftDate(value: unknown) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (!match) return normalizeImportedDate(value)

  const year = match[1]
  const second = Number(match[2])
  const third = Number(match[3])

  if (second > 12 && third <= 12) {
    return `${year}-${String(third).padStart(2, '0')}-${String(second).padStart(2, '0')}`
  }

  return `${year}-${String(second).padStart(2, '0')}-${String(third).padStart(2, '0')}`
}

function normalizeShiftFromFirestore(id: string, data: Omit<EmployeeShift, 'id'>): EmployeeShift {
  return {
    id,
    ...data,
    date: normalizeStoredShiftDate(data.date),
  }
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

function sourceBadgeClass(source: ShiftSource) {
  switch (source) {
    case 'spreadsheet':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
    case 'manual':
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
    case 'n8n':
      return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
    case 'clover':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    default:
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
  }
}

function sourceRowClass(source: ShiftSource) {
  switch (source) {
    case 'spreadsheet':
      return 'border-l-4 border-l-blue-400'
    case 'manual':
      return 'border-l-4 border-l-gray-200'
    case 'n8n':
      return 'border-l-4 border-l-purple-400'
    case 'clover':
      return 'border-l-4 border-l-emerald-400'
    default:
      return ''
  }
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

function getCloverTipServiceDate(createdAt: Date) {
  const serviceDate = new Date(createdAt)
  if (minutesSinceLocalMidnight(createdAt) < CLOVER_SERVICE_DAY_CUTOFF_MINUTES) {
    serviceDate.setDate(serviceDate.getDate() - 1)
  }
  return dateKey(serviceDate)
}

function isCloverTipEligibleForPool(tip: CloverTipPayment) {
  const window = getTipPoolWindow(tip.date)
  if (!window) return false

  const minutes = minutesSinceLocalMidnight(tip.createdAt)
  return minutes >= window.start || minutes < CLOVER_SERVICE_DAY_CUTOFF_MINUTES
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

function arrayFromElements(value: any): any[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.elements)) return value.elements
  return []
}

function valueAtPath(source: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], source)
}

function firstPositiveCloverAmount(source: any, paths: string[]) {
  for (const path of paths) {
    const amount = amountFromMaybeCents(valueAtPath(source, path))
    if (amount > 0) return amount
  }
  return 0
}

function sumNestedTipAmounts(source: any) {
  const nestedPaymentGroups = [
    source.payments,
    source.tenders,
    source.order?.payments,
    source.order?.tenders,
  ]

  return round2(nestedPaymentGroups.reduce((total, group) => (
    total + arrayFromElements(group).reduce((sum, item) => (
      sum + firstPositiveCloverAmount(item, [
        'tipAmount',
        'tip',
        'gratuityAmount',
        'gratuity',
        'tip_amount',
        'tipAmountCents',
        'tipCents',
      ])
    ), 0)
  ), 0))
}

function extractCloverTipAmount(raw: any) {
  return firstPositiveCloverAmount(raw, [
    'tipAmount',
    'tip',
    'gratuityAmount',
    'gratuity',
    'tip_amount',
    'tipAmountCents',
    'tipCents',
    'tender.tipAmount',
    'tender.tip',
    'payment.tipAmount',
    'payment.tip',
  ]) || sumNestedTipAmounts(raw)
}

function firstCloverPaymentCollection(payload: any) {
  return payload?.recentPayments || payload?.payments || payload?.paymentList || payload?.data || []
}

function buildCloverTipsUrl(baseUrl: string, startDate: string, endDate: string) {
  const url = new URL(baseUrl, window.location.origin)
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59.999`)
  const endWithServiceCutoff = new Date(end)
  endWithServiceCutoff.setDate(endWithServiceCutoff.getDate() + 1)
  endWithServiceCutoff.setHours(CLOVER_SERVICE_DAY_CUTOFF_MINUTES / 60, 0, 0, 0)

  url.searchParams.set('limit', '50')
  url.searchParams.set('orderLimit', '300')
  url.searchParams.set('detailLimit', '8')
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)
  url.searchParams.set('startTime', String(start.getTime()))
  url.searchParams.set('endTime', String(endWithServiceCutoff.getTime()))

  return url.toString()
}

function normalizeCloverTipPayment(raw: any, index: number): CloverTipPayment {
  const order = raw.order || {}
  const employee = raw.employee || order.employee || {}
  const createdAt = normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt)

  return {
    id: raw.id || `clover-tip-${index}`,
    date: getCloverTipServiceDate(createdAt),
    createdAt,
    amount: amountFromMaybeCents(raw.amount || raw.total),
    tipAmount: extractCloverTipAmount(raw),
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
  const payrollReportRef = useRef<HTMLDivElement | null>(null)
  const shiftLogRef = useRef<HTMLDivElement | null>(null)
  const shiftFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [employees, setEmployees] = useState<PayrollEmployee[]>([])
  const [shifts, setShifts] = useState<EmployeeShift[]>([])
  const [manualTips, setManualTips] = useState<ManualTipDay[]>([])
  const [cloverTips, setCloverTips] = useState<CloverTipPayment[]>([])
  const [newShift, setNewShift] = useState<Omit<EmployeeShift, 'id'>>(emptyShift)
  const [employeeDraft, setEmployeeDraft] = useState<Omit<PayrollEmployee, 'id'>>(emptyEmployee)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [tipDraft, setTipDraft] = useState({ date: emptyShift.date, amount: 0, notes: '' })
  const [periodStart, setPeriodStart] = useState(() => getCurrentHalfMonthPeriod().start)
  const [periodEnd, setPeriodEnd] = useState(() => getCurrentHalfMonthPeriod().end)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all')
  const [shiftSearch, setShiftSearch] = useState('')
  const [shiftSourceFilter, setShiftSourceFilter] = useState<'all' | ShiftSource>('all')
  const [shiftApprovalFilter, setShiftApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [shiftSortKey, setShiftSortKey] = useState<ShiftSortKey>('date')
  const [shiftSortDirection, setShiftSortDirection] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [cloverLoading, setCloverLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [employeeNotice, setEmployeeNotice] = useState<string | null>(null)
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
        setShifts(snapshot.docs.map((docSnap) => (
          normalizeShiftFromFirestore(docSnap.id, docSnap.data() as Omit<EmployeeShift, 'id'>)
        )))
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
      const response = await fetch(buildCloverTipsUrl(CLOVER_CASH_EVENTS_PROXY_URL, periodStart, periodEnd), {
        headers: { accept: 'application/json' },
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || `Clover proxy returned ${response.status}`)
      }

      const payments = arrayFromElements(firstCloverPaymentCollection(payload))
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
  }, [periodStart, periodEnd])

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

  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeId === 'all') return null
    return employeeOptions.find((employee) => employee.id === selectedEmployeeId) || null
  }, [employeeOptions, selectedEmployeeId])

  const reportEmployeeSummary = useMemo(() => {
    if (selectedEmployeeId === 'all') return employeeSummary
    return employeeSummary.filter((row) => row.employeeId === selectedEmployeeId)
  }, [employeeSummary, selectedEmployeeId])

  const reportPeriodShifts = useMemo(() => {
    if (selectedEmployeeId === 'all') return periodShifts
    return periodShifts.filter((shift) => (shift.employeeId || normalizeEmployeeId(shift.employeeName)) === selectedEmployeeId)
  }, [periodShifts, selectedEmployeeId])

  const visibleShiftRows = useMemo(() => {
    const search = shiftSearch.trim().toLowerCase()

    return reportPeriodShifts
      .filter((shift) => {
        if (shiftSourceFilter !== 'all' && shift.source !== shiftSourceFilter) return false
        if (shiftApprovalFilter === 'approved' && !shift.approved) return false
        if (shiftApprovalFilter === 'pending' && shift.approved) return false
        if (!search) return true

        return [
          shift.date,
          shift.employeeName,
          shift.clockIn,
          shift.clockOut,
          shift.source,
          shift.notes,
        ].some((value) => String(value || '').toLowerCase().includes(search))
      })
      .sort((a, b) => {
        const direction = shiftSortDirection === 'asc' ? 1 : -1
        const aValue = a[shiftSortKey]
        const bValue = b[shiftSortKey]

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction
        }

        return String(aValue || '').localeCompare(String(bValue || '')) * direction
      })
  }, [reportPeriodShifts, shiftApprovalFilter, shiftSearch, shiftSortDirection, shiftSortKey, shiftSourceFilter])

  const visibleShiftTotals = useMemo(() => ({
    rows: visibleShiftRows.length,
    hours: round2(visibleShiftRows.reduce((sum, shift) => sum + shift.workedHours, 0)),
    tipHours: round2(visibleShiftRows.reduce((sum, shift) => sum + shift.eligibleTipHours, 0)),
  }), [visibleShiftRows])

  const loadedRange = useMemo(() => {
    const dates = shifts.map((shift) => shift.date).filter(Boolean).sort()
    if (!dates.length) return 'No saved shifts yet'
    return `${dates[0]} to ${dates[dates.length - 1]}`
  }, [shifts])

  const totals = useMemo(() => {
    return {
      workedHours: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.workedHours, 0)),
      eligibleTipHours: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.eligibleTipHours, 0)),
      wages: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.wagePay, 0)),
      tips: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.tips, 0)),
      gross: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.estimatedGross, 0)),
      deductions: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.deductions.total, 0)),
      netPay: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.estimatedNetPay, 0)),
      employerContributions: round2(reportEmployeeSummary.reduce((sum, row) => sum + row.employerContributions.total, 0)),
    }
  }, [reportEmployeeSummary])

  const employeeById = useMemo(() => {
    return new Map(employeeOptions.map((employee) => [employee.id, employee]))
  }, [employeeOptions])

  const payrollHealth = useMemo(() => {
    const pendingShifts = reportPeriodShifts.filter((shift) => !shift.approved).length
    const cloverTipTotal = round2(periodCloverTips.reduce((sum, tip) => sum + tip.tipAmount, 0))
    const manualTipTotal = round2(periodManualTips.reduce((sum, tip) => sum + Number(tip.amount || 0), 0))
    const tipsUsedInPools = round2(dailyTipPools.reduce((sum, pool) => sum + pool.cloverTips + pool.manualTips, 0))
    const belowMinimumEmployees = employeeOptions.filter((employee) => {
      if (employee.active === false) return false
      const minimum = employee.tipped ? QUEBEC_TIPPED_MIN_WAGE_2026 : QUEBEC_GENERAL_MIN_WAGE_2026
      return Number(employee.hourlyRate || 0) < minimum
    })
    const employeeProfilesMissing = reportEmployeeSummary.filter((row) => !employeeById.has(row.employeeId)).length
    const employerCost = round2(totals.gross + totals.employerContributions)

    return {
      pendingShifts,
      cloverTipTotal,
      manualTipTotal,
      tipsUsedInPools,
      belowMinimumEmployees,
      employeeProfilesMissing,
      employerCost,
    }
  }, [
    dailyTipPools,
    employeeById,
    employeeOptions,
    periodCloverTips,
    periodManualTips,
    reportEmployeeSummary,
    reportPeriodShifts,
    totals.employerContributions,
    totals.gross,
  ])

  const payrollAttentionCount = useMemo(() => {
    return [
      reportPeriodShifts.length === 0,
      payrollHealth.pendingShifts > 0,
      payrollHealth.employeeProfilesMissing > 0,
      payrollHealth.belowMinimumEmployees.length > 0,
    ].filter(Boolean).length
  }, [
    payrollHealth.belowMinimumEmployees.length,
    payrollHealth.employeeProfilesMissing,
    payrollHealth.pendingShifts,
    reportPeriodShifts.length,
  ])

  const payrollLoading = loading || cloverLoading || importLoading
  const payrollReady = reportPeriodShifts.length > 0 && payrollAttentionCount === 0

  const parsePayrollSpreadsheet = async (file: File): Promise<PayrollImportPreview> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const rows = getPayrollImportRows(workbook)
    const existingShiftByKey = new Map(shifts.map((shift) => [shiftDuplicateKey(shift), shift]))
    const importedShiftKeys = new Set<string>()
    const updatedShiftIds = new Set<string>()
    const existingEmployeeIds = new Set(employeeOptions.map((employee) => employee.id))
    const createdEmployeeIds = new Set<string>()
    const messages: string[] = []
    const parsedShifts: Array<Omit<EmployeeShift, 'id'>> = []
    const shiftsToUpdate: Array<{ id: string; shift: Omit<EmployeeShift, 'id'> }> = []
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

      if (importedShiftKeys.has(duplicateKey)) {
        skipped += 1
        return
      }

      const existingShift = existingShiftByKey.get(duplicateKey)
      if (existingShift) {
        if (!updatedShiftIds.has(existingShift.id)) {
          const existingNotes = existingShift.notes || ''
          shiftsToUpdate.push({
            id: existingShift.id,
            shift: {
              ...importedShift,
              notes: existingNotes.includes(`Imported from ${file.name}`)
                ? existingNotes
                : [existingNotes, `Imported from ${file.name}`].filter(Boolean).join(' | '),
              approved: existingShift.approved || importedShift.approved,
            },
          })
          updatedShiftIds.add(existingShift.id)
        }
        importedShiftKeys.add(duplicateKey)
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
      updated: shiftsToUpdate.length,
      skipped,
      employeesCreated: employeesToCreate.length,
      messages,
      shifts: parsedShifts,
      shiftsToUpdate,
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
      if (preview.imported === 0 && preview.updated === 0 && preview.employeesCreated === 0) {
        setImportResult(preview)
      }
    } catch (importError: any) {
      console.error('Failed to parse payroll spreadsheet', importError)
      setImportResult({
        fileName: file.name,
        imported: 0,
        updated: 0,
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

      importPreview.shiftsToUpdate.forEach(({ id, shift }) => {
        batch.set(doc(db, 'employeeShifts', id), {
          ...shift,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      })

      if (importPreview.imported > 0 || importPreview.updated > 0 || importPreview.employeesCreated > 0) {
        await batch.commit()
      }

      setImportResult({
        fileName: importPreview.fileName,
        imported: importPreview.imported,
        updated: importPreview.updated,
        skipped: importPreview.skipped,
        employeesCreated: importPreview.employeesCreated,
        messages: importPreview.messages,
      })
      setImportPreview(null)
      setTimeout(() => viewShiftLog(), 120)
    } catch (saveError: any) {
      console.error('Failed to save payroll import', saveError)
      setImportResult({
        fileName: importPreview.fileName,
        imported: 0,
        updated: 0,
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
    setEmployeeNotice(null)
    const name = employeeDraft.name.trim()
    if (!name) {
      setEmployeeError('Enter an employee name.')
      return
    }

    const id = editingEmployeeId || normalizeEmployeeId(name)
    const duplicate = [...employees, ...employeeOptions].find((employee) => {
      if (employee.id === id) return false
      return employee.id === normalizeEmployeeId(name) || employee.name.trim().toLowerCase() === name.toLowerCase()
    })
    if (duplicate) {
      setEmployeeError(`${duplicate.name} is already in the employee list.`)
      return
    }

    await setDoc(doc(db, 'payrollEmployees', id), {
      ...employeeDraft,
      name,
      hourlyRate: Number(employeeDraft.hourlyRate || 0),
      active: employeeDraft.active !== false,
      ...(editingEmployeeId ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    }, { merge: true })

    setEmployeeDraft(emptyEmployee)
    setEditingEmployeeId(null)
    setEmployeeNotice(editingEmployeeId ? `${name} was updated.` : `${name} was added.`)
  }

  const startEditEmployee = (employee: PayrollEmployee) => {
    setEmployeeError(null)
    setEmployeeNotice(null)
    setEditingEmployeeId(employee.id)
    setEmployeeDraft({
      name: employee.name,
      hourlyRate: Number(employee.hourlyRate || 0),
      tipped: employee.tipped !== false,
      role: employee.role || 'Service',
      active: employee.active !== false,
      notes: employee.notes || '',
    })
  }

  const cancelEditEmployee = () => {
    setEmployeeError(null)
    setEditingEmployeeId(null)
    setEmployeeDraft(emptyEmployee)
  }

  const setEmployeeActive = async (employee: PayrollEmployee, active: boolean) => {
    if (!active && !window.confirm(`Archive ${employee.name}? Existing shifts and payroll history will stay available.`)) {
      return
    }

    await setDoc(doc(db, 'payrollEmployees', employee.id), {
      active,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    setEmployeeNotice(active ? `${employee.name} was restored.` : `${employee.name} was archived.`)

    if (editingEmployeeId === employee.id) {
      cancelEditEmployee()
    }
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
    const csv = buildCsv(reportEmployeeSummary, reportPeriodShifts, dailyTipPools)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `maisushi-payroll-${selectedEmployee?.name || 'all'}-${periodStart}-to-${periodEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const generatePayroll = () => {
    payrollReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const printPaystubs = () => {
    requestAnimationFrame(() => window.print())
  }

  const viewShiftLog = () => {
    shiftLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-[1760px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden border border-gray-200 bg-white shadow-sm">
          {payrollLoading && <span className="admin-loading-bar absolute inset-x-0 top-0 h-1" />}
          <div className="grid items-start xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.42fr)]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Payroll command center
                  </p>
                  <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                    Prepare payroll with a clear review path.
                  </h1>
                  <p className="mt-4 max-w-5xl text-sm leading-6 text-gray-600 sm:text-base">
                    Pick the period, verify hours, sync tips, and produce paystubs only when the review is clean.
                    Setup, imports, and corrections stay lower on the page so the owner flow stays simple.
                  </p>
                </div>
                <div className={`inline-flex w-fit items-center gap-2 border px-4 py-3 text-sm font-semibold ${payrollReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <span className={`h-2.5 w-2.5 ${payrollReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {payrollReady ? 'Ready to prepare' : `${payrollAttentionCount || 1} review item${payrollAttentionCount === 1 ? '' : 's'}`}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PayrollCommandButton
                  icon={WalletCards}
                  title="Review payroll"
                  detail="Jump to the pay-run totals"
                  onClick={generatePayroll}
                  primary
                />
                <PayrollCommandButton
                  icon={RefreshCw}
                  title={cloverLoading ? 'Syncing tips...' : 'Sync Clover tips'}
                  detail={`${money(payrollHealth.cloverTipTotal)} from Clover`}
                  onClick={loadCloverTips}
                  loading={cloverLoading}
                />
                <PayrollCommandButton
                  icon={Clock}
                  title="Audit shifts"
                  detail={`${payrollHealth.pendingShifts} pending · ${reportPeriodShifts.length} loaded`}
                  onClick={viewShiftLog}
                />
                <PayrollCommandButton
                  icon={Printer}
                  title="Print paystubs"
                  detail={`${reportEmployeeSummary.length} employee summaries`}
                  onClick={printPaystubs}
                  dark
                />
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <PayrollStatusPill
                  label="Hours"
                  value={`${totals.workedHours.toFixed(2)} h`}
                  detail={`${reportPeriodShifts.length} shifts`}
                  status={reportPeriodShifts.length > 0 ? 'ok' : 'warn'}
                />
                <PayrollStatusPill
                  label="Tips"
                  value={money(totals.tips)}
                  detail={`${totals.eligibleTipHours.toFixed(2)} eligible h`}
                  status={payrollHealth.tipsUsedInPools > 0 ? 'ok' : 'neutral'}
                />
                <PayrollStatusPill
                  label="People"
                  value={`${employeeOptions.filter((employee) => employee.active !== false).length} active`}
                  detail={selectedEmployee?.name || 'All employees'}
                  status={payrollHealth.employeeProfilesMissing === 0 ? 'ok' : 'warn'}
                />
                <PayrollStatusPill
                  label="Rates"
                  value={payrollHealth.belowMinimumEmployees.length ? `${payrollHealth.belowMinimumEmployees.length} warning` : 'Checked'}
                  detail="Quebec minimum check"
                  status={payrollHealth.belowMinimumEmployees.length ? 'danger' : 'ok'}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 bg-[#f4f4f4] p-5 sm:p-6 xl:border-l xl:border-t-0">
              <div className="border border-gray-300 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Pay period</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{periodStart} to {periodEnd}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Change the dates or employee, then generate a fresh review.
                </p>
                <div className="mt-5 grid gap-3">
                  <Field label="Start date">
                    <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="input" />
                  </Field>
                  <Field label="End date">
                    <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="input" />
                  </Field>
                  <Field label="Employee">
                    <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className="input">
                      <option value="all">All employees</option>
                      {employeeOptions.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={generatePayroll}
                    className="group inline-flex min-h-[52px] items-center justify-between gap-3 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <WalletCards className="h-4 w-4" />
                      Generate review
                    </span>
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <MiniStat label="Loaded shift range" value={loadedRange} />
                <MiniStat label="Employer cost" value={money(payrollHealth.employerCost)} />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon={WalletCards} label="Pay-run summary" title={`${selectedEmployee?.name || 'All employees'} · ${periodStart} to ${periodEnd}`} />
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Employer cost" value={money(payrollHealth.employerCost)} detail={`${money(totals.gross)} gross + ${money(totals.employerContributions)} employer costs`} />
              <MetricCard label="Net pay" value={money(totals.netPay)} detail="Estimated cash paid to employees after deductions" />
              <MetricCard label="Hours" value={`${totals.workedHours.toFixed(2)} h`} detail={`${reportPeriodShifts.length} shifts · ${totals.eligibleTipHours.toFixed(2)} tip hours`} />
              <MetricCard label="Tips allocated" value={money(totals.tips)} detail={`${money(payrollHealth.cloverTipTotal)} Clover · ${money(payrollHealth.manualTipTotal)} manual`} />
            </div>
            <PayrollBreakdownChart totals={totals} />
          </div>

          <aside className="border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon={ShieldCheck} label="Before paying" title="Owner checklist" />
            <div className="mt-5 space-y-3">
              <PayrollHealthItem
                status={reportPeriodShifts.length > 0 ? 'ok' : 'warn'}
                title={reportPeriodShifts.length > 0 ? 'Hours loaded' : 'No hours in this period'}
                detail={reportPeriodShifts.length > 0 ? `${reportPeriodShifts.length} shifts are included in this review.` : 'Import or add shifts before generating paystubs.'}
              />
              <PayrollHealthItem
                status={payrollHealth.pendingShifts === 0 ? 'ok' : 'warn'}
                title={payrollHealth.pendingShifts === 0 ? 'No pending shifts' : `${payrollHealth.pendingShifts} shifts need review`}
                detail={payrollHealth.pendingShifts === 0 ? 'Visible shifts are approved or already imported.' : 'Open the shift log and confirm these rows before paying.'}
              />
              <PayrollHealthItem
                status={payrollHealth.tipsUsedInPools > 0 ? 'ok' : 'neutral'}
                title={payrollHealth.tipsUsedInPools > 0 ? 'Tips are included' : 'No tips allocated'}
                detail={payrollHealth.tipsUsedInPools > 0 ? `${money(payrollHealth.tipsUsedInPools)} is included in daily tip pools.` : 'Sync Clover tips or add a manual tip day if tips are missing.'}
              />
              <PayrollHealthItem
                status={payrollHealth.employeeProfilesMissing === 0 ? 'ok' : 'warn'}
                title={payrollHealth.employeeProfilesMissing === 0 ? 'Employee setup is matched' : `${payrollHealth.employeeProfilesMissing} employee profile gap`}
                detail={payrollHealth.employeeProfilesMissing === 0 ? 'Payroll rows match employee setup records.' : 'Review employee setup so rates and roles stay consistent.'}
              />
              <PayrollHealthItem
                status={payrollHealth.belowMinimumEmployees.length === 0 ? 'ok' : 'danger'}
                title={payrollHealth.belowMinimumEmployees.length === 0 ? 'Rates pass minimum check' : `${payrollHealth.belowMinimumEmployees.length} rate warning`}
                detail={payrollHealth.belowMinimumEmployees.length === 0 ? 'Employee rates are above the configured Quebec minimums.' : payrollHealth.belowMinimumEmployees.map((employee) => employee.name).join(', ')}
              />
            </div>
            <div className="mt-5 border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              Payroll is an estimate for preparation. Confirm final Canada and Quebec deductions with payroll tables or payroll software before remitting.
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={viewShiftLog}
                className="group inline-flex min-h-[44px] items-center justify-between border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-700"
              >
                Open shift log
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={loadCloverTips}
                className="group inline-flex min-h-[44px] items-center justify-between border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-700"
              >
                Sync latest tips
                <RefreshCw className={`h-4 w-4 transition group-hover:translate-x-1 ${cloverLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </aside>
        </section>

        <section ref={payrollReportRef} className="border border-gray-200 bg-white p-0 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <SectionHeader icon={WalletCards} label="Pay by employee" title={`${periodStart} to ${periodEnd}`} />
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                This is the main review area. If something looks wrong, use the correction tools below: import, employee setup,
                shift editor, manual tips, or shift log.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={exportCsv} className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button type="button" onClick={printPaystubs} className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                <Printer className="h-4 w-4" />
                Paystubs
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="carbon-data-table min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Wages</th>
                  <th className="px-4 py-3">Tips</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net pay</th>
                  <th className="px-4 py-3">Employer</th>
                </tr>
              </thead>
              <tbody>
                {reportEmployeeSummary.map((row) => (
                  <tr key={row.employeeName}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-950">{row.employeeName}</p>
                      <p className="mt-1 text-xs text-gray-500">{row.overtimeHours.toFixed(2)} overtime h · {row.eligibleTipHours.toFixed(2)} tip h</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-950">{row.workedHours.toFixed(2)}</td>
                    <td className="px-4 py-4">{money(row.wagePay)}</td>
                    <td className="px-4 py-4">{money(row.tips)}</td>
                    <td className="px-4 py-4 font-semibold text-gray-950">{money(row.estimatedGross)}</td>
                    <td className="px-4 py-4">{money(row.deductions.total)}</td>
                    <td className="px-4 py-4 text-lg font-semibold text-gray-950">{money(row.estimatedNetPay)}</td>
                    <td className="px-4 py-4">{money(row.employerContributions.total)}</td>
                  </tr>
                ))}
                {!reportEmployeeSummary.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                      No payroll rows for this period. Add shifts or import a spreadsheet below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="payroll-tool-card group"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Fix hours</p>
            <h3 className="mt-3 text-xl font-semibold text-gray-950">Import or update shifts</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Use this when the payroll total is missing a day, employee, or spreadsheet row.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Open import <Download className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </button>
          <button
            type="button"
            onClick={() => shiftFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="payroll-tool-card group"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Correct one row</p>
            <h3 className="mt-3 text-xl font-semibold text-gray-950">Add or edit a shift</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Use this for one employee, one date, clock-in/out, break, rate, or source.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Go to shift editor <Edit3 className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </button>
          <button
            type="button"
            onClick={viewShiftLog}
            className="payroll-tool-card group"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Audit detail</p>
            <h3 className="mt-3 text-xl font-semibold text-gray-950">Review shift log</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Search, filter, sort, edit, or delete the rows behind the payroll numbers.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Open audit log <Clock className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeader icon={FileSpreadsheet} label="Correction tools" title="Import hours from Excel" />
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
                      {importPreview.imported} new shifts ready for <code className="rounded bg-white/70 px-1">employeeShifts</code>,
                      {' '}{importPreview.updated} existing shifts will be marked as spreadsheet,
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
                      disabled={importLoading || (importPreview.imported === 0 && importPreview.updated === 0)}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold">
                    {importResult.fileName}: {importResult.imported} new shifts imported, {importResult.updated} existing shifts marked as spreadsheet, {importResult.skipped} skipped, {importResult.employeesCreated} employees created.
                  </p>
                  <button type="button" onClick={viewShiftLog} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-900 ring-1 ring-black/10 hover:bg-gray-50">
                    View in Shift log
                  </button>
                </div>
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
            <SectionHeader icon={Download} label="Automation-ready" title="Optional QR / n8n time clock" />
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Keep using Excel for now if that is easier. When the team is ready, a QR form or POS automation can send the same fields directly into payroll: employee, date, clock-in, clock-out, break, source, notes, and approval status.
            </p>
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs leading-6 text-gray-600">
              <p className="font-semibold text-gray-950">Suggested webhook payload</p>
              <p>{'{"date":"2026-05-28","employeeName":"Alejandra","clockIn":"14:04","clockOut":"20:12","breakMinutes":30,"source":"n8n","notes":"QR time clock"}'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={Users} label="Employee setup" title={editingEmployeeId ? 'Edit rate and role' : 'Add employee'} />
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
              <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={employeeDraft.active !== false} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, active: event.target.checked }))} />
                Active in dropdowns
              </label>
              <Field label="Notes">
                <textarea value={employeeDraft.notes} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, notes: event.target.value }))} className="input min-h-24" placeholder="Optional payroll notes" />
              </Field>
              {employeeNotice && <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{employeeNotice}</p>}
              {employeeError && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{employeeError}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                {editingEmployeeId && (
                  <button type="button" onClick={cancelEditEmployee} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
                <button type="button" onClick={saveEmployee} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                  {editingEmployeeId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingEmployeeId ? 'Save employee' : 'Add employee'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={Users} label="Employee setup" title="Employee list and status" />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(employees.length ? employees : employeeOptions).length ? (employees.length ? employees : employeeOptions).map((employee, index) => (
                <div key={employee.id} className={`payroll-soft-row rounded-2xl border p-4 ${employee.active === false ? 'bg-gray-100/90 opacity-80' : index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-950">{employee.name}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {employee.role || 'Employee'} · {employee.tipped ? 'Tip eligible' : 'No tips'} · {employee.active === false ? 'Archived' : 'Active'}
                      </p>
                      {employee.hourlyRate < (employee.tipped ? QUEBEC_TIPPED_MIN_WAGE_2026 : QUEBEC_GENERAL_MIN_WAGE_2026) && (
                        <p className="mt-2 rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          Below current Quebec minimum for this type.
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-950">{money(employee.hourlyRate)}/h</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditEmployee(employee)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeActive(employee, employee.active === false)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        employee.active === false
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {employee.active === false ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {employee.active === false ? 'Restore' : 'Archive'}
                    </button>
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
            <SectionHeader icon={Clock} label="Shift correction" title={editingShiftId ? 'Edit one shift' : 'Add one shift'} />
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
            <SectionHeader icon={WalletCards} label="Tip correction" title="Manual daily tips" />
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
            <SectionHeader icon={CalendarDays} label="Tip audit" title="Allocation by day" />
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
            <SectionHeader icon={WalletCards} label="Detail review" title="Employee totals" />
            <div className="mt-5 space-y-3">
              {reportEmployeeSummary.length ? reportEmployeeSummary.map((row, index) => (
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

        <section ref={shiftLogRef} className="carbon-card p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4">
            <SectionHeader icon={Clock} label="Audit detail" title={`Shift log · ${selectedEmployee?.name || 'All employees'} · ${periodStart} to ${periodEnd}`} />
            <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
              <label className="carbon-search">
                <Search className="h-4 w-4 text-[#525252]" />
                <input
                  value={shiftSearch}
                  onChange={(event) => setShiftSearch(event.target.value)}
                  placeholder="Search date, employee, time, source..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <select value={shiftSourceFilter} onChange={(event) => setShiftSourceFilter(event.target.value as 'all' | ShiftSource)} className="carbon-select">
                <option value="all">All sources</option>
                <option value="spreadsheet">Spreadsheet</option>
                <option value="manual">Manual</option>
                <option value="n8n">n8n</option>
                <option value="clover">Clover</option>
              </select>
              <select value={shiftApprovalFilter} onChange={(event) => setShiftApprovalFilter(event.target.value as 'all' | 'approved' | 'pending')} className="carbon-select">
                <option value="all">All payment statuses</option>
                <option value="approved">Approved/Paid</option>
                <option value="pending">Pending</option>
              </select>
              <select value={shiftSortKey} onChange={(event) => setShiftSortKey(event.target.value as ShiftSortKey)} className="carbon-select">
                <option value="date">Sort by date</option>
                <option value="employeeName">Sort by employee</option>
                <option value="clockIn">Sort by clock in</option>
                <option value="workedHours">Sort by hours</option>
                <option value="eligibleTipHours">Sort by tip eligible</option>
                <option value="hourlyRate">Sort by rate</option>
                <option value="source">Sort by source</option>
              </select>
              <button
                type="button"
                onClick={() => setShiftSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
                className="carbon-button-secondary"
              >
                <ArrowUpDown className="h-4 w-4" />
                {shiftSortDirection === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="carbon-tag carbon-tag-blue">Blue = Excel spreadsheet</span>
              <span className="carbon-tag carbon-tag-gray">Gray = manual</span>
              <span className="carbon-tag carbon-tag-purple">Purple = n8n</span>
              <span className="carbon-tag carbon-tag-green">Green = Clover</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Visible rows" value={`${visibleShiftTotals.rows} / ${reportPeriodShifts.length}`} />
              <MiniStat label="Visible hours" value={`${visibleShiftTotals.hours.toFixed(2)} h`} />
              <MiniStat label="Visible tip hours" value={`${visibleShiftTotals.tipHours.toFixed(2)} h`} />
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="carbon-data-table min-w-full text-sm">
              <thead>
                <tr>
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
                {visibleShiftRows.map((shift) => (
                  <tr
                    key={shift.id}
                    className={`${sourceRowClass(shift.source)} ${editingShiftId === shift.id ? 'bg-[#e8f0ff]' : ''}`}
                  >
                    <td className="px-3 py-3 font-medium text-gray-950">{shift.date}</td>
                    <td className="px-3 py-3">{shift.employeeName}</td>
                    <td className="px-3 py-3">{shift.clockIn} - {shift.clockOut} · {shift.breakMinutes} min break</td>
                    <td className="px-3 py-3">{shift.workedHours.toFixed(2)}</td>
                    <td className="px-3 py-3">{shift.eligibleTipHours.toFixed(2)}</td>
                    <td className="px-3 py-3">{money(shift.hourlyRate)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass(shift.source)}`}>{shift.source}</span>
                      {shift.notes?.includes('Imported from') && (
                        <p className="mt-1 text-[11px] font-semibold text-blue-700">Excel import</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditShift(shift)} className="admin-action-button admin-action-button--compact">
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${shift.employeeName}'s shift on ${shift.date}? Payroll history will be recalculated.`)) {
                            removeShift(shift.id)
                          }
                        }}
                        className="admin-action-button admin-action-button--danger admin-action-button--compact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleShiftRows.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">
                      No shifts match the current filters for {selectedEmployee?.name || 'all employees'} from {periodStart} to {periodEnd}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader icon={WalletCards} label="Clover" title="Tips detected from POS" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Detected" value={`${periodCloverTips.length}`} />
              <MiniStat label="Total" value={money(periodCloverTips.reduce((sum, tip) => sum + tip.tipAmount, 0))} />
              <MiniStat label="Used in pools" value={money(dailyTipPools.reduce((sum, pool) => sum + pool.cloverTips, 0))} />
            </div>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-2">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Manual days" value={`${periodManualTips.length}`} />
              <MiniStat label="Manual total" value={money(periodManualTips.reduce((sum, tip) => sum + Number(tip.amount || 0), 0))} />
            </div>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-2">
              {periodManualTips.length ? periodManualTips.map((tip, index) => (
                <div key={tip.id} className={`payroll-soft-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${index % 2 === 0 ? 'bg-gray-50/90' : 'bg-white'}`}>
                  <div>
                    <p className="font-semibold text-gray-950">{tip.date}</p>
                    <p className="text-gray-500">{tip.notes || 'Manual tip pool amount'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-950">{money(tip.amount)}</p>
                    <button type="button" onClick={() => setTipDraft({ date: tip.date, amount: tip.amount, notes: tip.notes || '' })} className="admin-action-button admin-action-button--compact">
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button type="button" onClick={() => removeManualTip(tip.date)} className="admin-action-button admin-action-button--danger admin-action-button--compact">
                      <Trash2 className="h-4 w-4" />
                      Remove
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionHeader icon={Printer} label="Paystubs" title="Printable paystub preview" />
              <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-500">
                Click Print / Save PDF here, then choose Save as PDF in the browser print dialog.
              </p>
            </div>
            <button
              type="button"
              onClick={printPaystubs}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f26350] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#df4f3d]"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 printable-paystubs">
            {reportEmployeeSummary.length ? reportEmployeeSummary.map((row) => (
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

        .payroll-dark-input {
          border-color: rgba(255, 255, 255, 0.2);
          border-bottom: 2px solid rgba(255, 255, 255, 0.55);
          background: #ffffff;
          color: #111827;
          border-radius: 0;
        }

        .payroll-dark-input:focus {
          border-color: #78a9ff;
          box-shadow: 0 0 0 2px rgba(120, 169, 255, 0.38);
        }

        .admin-carbon-shell .payroll-command-button {
          min-height: 96px;
          border: 1px solid #c6c6c6 !important;
          padding: 1rem;
          text-align: left;
          transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease;
        }

        .admin-carbon-shell .payroll-command-button:hover {
          transform: translateY(-2px);
          border-color: #0f62fe !important;
        }

        .admin-carbon-shell .payroll-command-button--primary {
          border-color: #0f62fe !important;
          background: #0f62fe !important;
          color: #ffffff !important;
        }

        .admin-carbon-shell .payroll-command-button--light {
          background: #ffffff !important;
          color: #161616 !important;
        }

        .admin-carbon-shell .payroll-command-button--light:hover {
          background: #edf5ff !important;
        }

        .admin-carbon-shell .payroll-command-button--dark {
          border-color: #161616 !important;
          background: #161616 !important;
          color: #ffffff !important;
        }

        .admin-carbon-shell .payroll-command-button__icon {
          display: inline-flex;
          width: 2.5rem;
          height: 2.5rem;
          align-items: center;
          justify-content: center;
          background: #edf5ff !important;
          color: #0f62fe !important;
        }

        .admin-carbon-shell .payroll-command-button--primary .payroll-command-button__icon,
        .admin-carbon-shell .payroll-command-button--dark .payroll-command-button__icon {
          background: rgba(255, 255, 255, 0.16) !important;
          color: #ffffff !important;
        }

        .admin-carbon-shell .payroll-command-button__title {
          margin-top: 0.875rem;
          color: inherit !important;
          font-size: 0.9375rem;
          font-weight: 700;
        }

        .admin-carbon-shell .payroll-command-button__detail {
          margin-top: 0.25rem;
          color: #525252 !important;
          font-size: 0.8125rem;
          line-height: 1.45;
        }

        .admin-carbon-shell .payroll-command-button--primary .payroll-command-button__detail,
        .admin-carbon-shell .payroll-command-button--dark .payroll-command-button__detail {
          color: rgba(255, 255, 255, 0.82) !important;
        }

        .admin-carbon-shell .payroll-tool-card {
          display: block;
          border: 1px solid #c6c6c6 !important;
          background: #ffffff !important;
          padding: 1.25rem;
          text-align: left;
          color: #161616 !important;
          transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease;
        }

        .admin-carbon-shell .payroll-tool-card:hover {
          transform: translateY(-2px);
          border-color: #0f62fe !important;
          background: #edf5ff !important;
        }

        [class*="rounded-[28px]"] {
          border-radius: 0 !important;
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

        .carbon-card {
          border: 1px solid #e0e0e0;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .carbon-search,
        .carbon-select {
          min-height: 48px;
          border: 1px solid #8d8d8d;
          border-bottom: 2px solid #161616;
          background: #f4f4f4;
          color: #161616;
          font-size: 0.875rem;
          outline: none;
        }

        .carbon-search {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0 0.875rem;
        }

        .carbon-select {
          width: 100%;
          padding: 0 0.875rem;
        }

        .carbon-search:focus-within,
        .carbon-select:focus {
          border-color: #0f62fe;
          box-shadow: 0 0 0 2px #0f62fe;
        }

        .carbon-button-secondary {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: 1px solid #0f62fe;
          background: #ffffff;
          color: #0f62fe;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          transition: background-color 120ms ease, color 120ms ease;
        }

        .carbon-button-secondary:hover {
          background: #edf5ff;
        }

        .carbon-tag {
          border-radius: 0;
          padding: 0.375rem 0.625rem;
          font-weight: 700;
        }

        .carbon-tag-blue {
          background: #d0e2ff;
          color: #0043ce;
        }

        .carbon-tag-gray {
          background: #e0e0e0;
          color: #393939;
        }

        .carbon-tag-purple {
          background: #e8daff;
          color: #6929c4;
        }

        .carbon-tag-green {
          background: #a7f0ba;
          color: #0e6027;
        }

        .carbon-data-table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          border-bottom: 1px solid #8d8d8d;
          background: #e0e0e0;
          color: #525252;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-align: left;
          text-transform: uppercase;
        }

        .carbon-data-table tbody tr {
          border-bottom: 1px solid #e0e0e0;
          background: #ffffff;
        }

        .carbon-data-table tbody tr:nth-child(even) {
          background: #f4f4f4;
        }

        .carbon-data-table tbody tr:hover {
          background: #edf5ff;
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

function PayrollCommandButton({
  icon: Icon,
  title,
  detail,
  onClick,
  primary = false,
  dark = false,
  loading = false,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  detail: string
  onClick: () => void
  primary?: boolean
  dark?: boolean
  loading?: boolean
}) {
  const classes = primary
    ? 'payroll-command-button--primary'
    : dark
      ? 'payroll-command-button--dark'
      : 'payroll-command-button--light'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`payroll-command-button group ${classes}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="payroll-command-button__icon">
          <Icon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </span>
        <ChevronRight className="mt-1 h-4 w-4 opacity-70 transition group-hover:translate-x-1" />
      </div>
      <p className="payroll-command-button__title">{title}</p>
      <p className="payroll-command-button__detail">{detail}</p>
    </button>
  )
}

function PayrollStatusPill({
  label,
  value,
  detail,
  status,
}: {
  label: string
  value: string
  detail: string
  status: 'ok' | 'warn' | 'danger' | 'neutral'
}) {
  const dot = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-gray-400',
  }[status]

  return (
    <div className="border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-400">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
        <span className={`h-2.5 w-2.5 ${dot}`} />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-400">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

function PayrollHealthItem({
  status,
  title,
  detail,
}: {
  status: 'ok' | 'warn' | 'danger' | 'neutral'
  title: string
  detail: string
}) {
  const tone = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-800',
    neutral: 'border-gray-200 bg-gray-50 text-gray-700',
  }[status]

  const dot = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-gray-400',
  }[status]

  return (
    <div className={`border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 ${dot}`} />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 opacity-80">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function PayrollBreakdownChart({
  totals,
}: {
  totals: {
    gross: number
    wages: number
    tips: number
    deductions: number
    netPay: number
    employerContributions: number
  }
}) {
  const rows = [
    { label: 'Wages', value: totals.wages, color: '#0f172a', note: 'Base pay before tips' },
    { label: 'Tips', value: totals.tips, color: '#24a148', note: 'Allocated from Clover/manual pools' },
    { label: 'Deductions', value: totals.deductions, color: '#f1c21b', note: 'Estimated employee deductions' },
    { label: 'Net pay', value: totals.netPay, color: '#0f62fe', note: 'Estimated cash paid out' },
    { label: 'Employer contributions', value: totals.employerContributions, color: '#6f6f6f', note: 'Employer-side estimate' },
  ]
  const max = Math.max(...rows.map((row) => row.value), 1)
  const employerCost = round2(totals.gross + totals.employerContributions)

  return (
    <div className="mt-5 border border-gray-200 bg-[#f8fafc] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div>
          <SectionHeader icon={BarChartIcon} label="Payroll chart" title="Selected-period breakdown" />
          <p className="mt-2 text-sm leading-6 text-gray-600">
            A quick comparison of what the period costs, what employees receive, and what needs to be remitted or reviewed.
          </p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Estimated cost</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{money(employerCost)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">Gross pay plus employer contributions.</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-2 lg:grid-cols-[190px_1fr_120px] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-gray-800">{row.label}</p>
              <p className="text-xs leading-5 text-gray-500">{row.note}</p>
            </div>
            <div className="h-7 overflow-hidden border border-gray-200 bg-white">
              <div
                className="h-full transition-all duration-500"
                style={{ backgroundColor: row.color, width: `${Math.max(3, (row.value / max) * 100)}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-gray-950 lg:text-right">{money(row.value)}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 border-t border-gray-200 pt-4 text-sm sm:grid-cols-3">
        {[
          { label: 'Gross pay', value: money(totals.gross) },
          { label: 'Net pay', value: money(totals.netPay) },
          { label: 'Deductions', value: money(totals.deductions) },
        ].map((item) => (
          <div key={item.label} className="border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return <FileSpreadsheet className={className} />
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

function PaystubLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? 'font-semibold text-gray-950' : 'font-medium text-gray-800'}>{value}</span>
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

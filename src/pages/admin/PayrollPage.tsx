import { useMemo, useState } from 'react'

type PayrollRow = {
    id: string
    date: string
    employee: string
    startTime: string
    endTime: string
    breakMinutes: number
    hourlyRate: number
}

type PayrollComputedRow = PayrollRow & {
    hoursWorked: number
    overtimeHours: number
    regularHours: number
    overtimeRate: number
    regularPay: number
    overtimePay: number
    grossPay: number
}

type PayrollSummary = {
    employee: string
    regularHours: number
    overtimeHours: number
    grossPay: number
    hourlyRate: number
}

function makeId() {
    return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function parseTimeToMinutes(time: string): number {
    if (!time || !time.includes(':')) return 0
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

function round2(n: number): number {
    return Math.round(n * 100) / 100
}

function calculateWorkedHours(startTime: string, endTime: string, breakMinutes: number): number {
    const start = parseTimeToMinutes(startTime)
    const end = parseTimeToMinutes(endTime)
    if (end <= start) return 0
    const totalMinutes = end - start - breakMinutes
    if (totalMinutes <= 0) return 0
    return round2(totalMinutes / 60)
}

function calculateDailyOvertime(hoursWorked: number): number {
    return round2(Math.max(0, hoursWorked - 8))
}

function calculateRegularHours(hoursWorked: number): number {
    return round2(hoursWorked - calculateDailyOvertime(hoursWorked))
}

function money(n: number): string {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
    }).format(n)
}

function formatDate(date: string): string {
    if (!date) return '-'
    return date
}

function estimateDeductions(grossPay: number) {
    const federalTax = round2(grossPay * 0.0696)
    const qpp = round2(grossPay * 0.059)
    const ei = round2(grossPay * 0.013)
    const totalDeductions = round2(federalTax + qpp + ei)
    const netPay = round2(grossPay - totalDeductions)

    return {
        federalTax,
        qpp,
        ei,
        totalDeductions,
        netPay,
    }
}

function getPeriodRange(rows: PayrollComputedRow[], employee: string) {
    const employeeRows = rows
        .filter((r) => r.employee === employee)
        .sort((a, b) => a.date.localeCompare(b.date))

    if (!employeeRows.length) return { start: '-', end: '-' }

    return {
        start: employeeRows[0].date,
        end: employeeRows[employeeRows.length - 1].date,
    }
}

function buildPayStubHtml(args: {
    businessName: string
    employee: string
    periodStart: string
    periodEnd: string
    rows: PayrollComputedRow[]
    summary: PayrollSummary
}) {
    const { businessName, employee, periodStart, periodEnd, rows, summary } = args
    const employeeRows = rows
        .filter((r) => r.employee === employee)
        .sort((a, b) => a.date.localeCompare(b.date))

    const deductions = estimateDeductions(summary.grossPay)

    const rowsHtml = employeeRows
        .map(
            (row) => `
        <tr>
          <td>${formatDate(row.date)}</td>
          <td>${row.startTime}</td>
          <td>${row.endTime}</td>
          <td>${row.breakMinutes} min</td>
          <td>${row.regularHours.toFixed(2)}</td>
          <td>${row.overtimeHours.toFixed(2)}</td>
          <td>${money(row.grossPay)}</td>
        </tr>
      `
        )
        .join('')

    return `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Fiche de paie - ${employee}</title>
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          margin: 0;
          padding: 32px;
          background: #ffffff;
        }

        .document {
          max-width: 900px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          border-bottom: 2px solid #111827;
          padding-bottom: 16px;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .muted {
          color: #6b7280;
          font-size: 13px;
        }

        .section {
          margin-bottom: 24px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .card {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 16px;
        }

        .label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .value {
          font-size: 15px;
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        th, td {
          border: 1px solid #d1d5db;
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }

        th {
          background: #f3f4f6;
          font-weight: 700;
        }

        .totals {
          width: 380px;
          margin-left: auto;
          margin-top: 20px;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 0;
          font-size: 14px;
        }

        .totals-row.total {
          font-size: 18px;
          font-weight: 700;
          border-top: 2px solid #111827;
          border-bottom: 0;
          margin-top: 8px;
          padding-top: 12px;
        }

        .signature {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .signature-line {
          margin-top: 50px;
          border-top: 1px solid #111827;
          padding-top: 8px;
          font-size: 13px;
        }

        .note {
          margin-top: 28px;
          font-size: 12px;
          color: #6b7280;
        }

        @media print {
          body {
            padding: 0;
          }

          .document {
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="document">
        <div class="header">
          <div>
            <h1 class="title">Fiche de paie</h1>
            <div class="muted">${businessName}</div>
          </div>
          <div style="text-align:right;">
            <div class="label">Période</div>
            <div class="value">${formatDate(periodStart)} au ${formatDate(periodEnd)}</div>
          </div>
        </div>

        <div class="section grid">
          <div class="card">
            <div class="label">Employé</div>
            <div class="value">${employee}</div>
          </div>
          <div class="card">
            <div class="label">Taux horaire</div>
            <div class="value">${money(summary.hourlyRate)}</div>
          </div>
          <div class="card">
            <div class="label">Heures régulières</div>
            <div class="value">${summary.regularHours.toFixed(2)} h</div>
          </div>
          <div class="card">
            <div class="label">Heures supplémentaires</div>
            <div class="value">${summary.overtimeHours.toFixed(2)} h</div>
          </div>
        </div>

        <div class="section">
          <h2 style="font-size:18px; margin:0 0 12px 0;">Détail des journées</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Pause</th>
                <th>Heures régulières</th>
                <th>Heures sup.</th>
                <th>Brut jour</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-row">
            <span>Salaire brut</span>
            <strong>${money(summary.grossPay)}</strong>
          </div>
          <div class="totals-row">
            <span>Impôt fédéral estimé</span>
            <span>${money(deductions.federalTax)}</span>
          </div>
          <div class="totals-row">
            <span>QPP estimé</span>
            <span>${money(deductions.qpp)}</span>
          </div>
          <div class="totals-row">
            <span>EI estimé</span>
            <span>${money(deductions.ei)}</span>
          </div>
          <div class="totals-row">
            <span>Total déductions estimées</span>
            <span>${money(deductions.totalDeductions)}</span>
          </div>
          <div class="totals-row total">
            <span>Net estimé</span>
            <span>${money(deductions.netPay)}</span>
          </div>
        </div>

        <div class="signature">
          <div>
            <div class="signature-line">Signature employeur</div>
          </div>
          <div>
            <div class="signature-line">Signature employé</div>
          </div>
        </div>

        <div class="note">
          Document interne de paie. Les déductions affichées ici sont estimatives dans cette première version.
        </div>
      </div>
      <script>
        window.onload = () => {
          window.print();
        };
      </script>
    </body>
  </html>
  `
}

export default function PayrollPage() {
    const [rows, setRows] = useState<PayrollRow[]>([
        {
            id: makeId(),
            date: '2026-03-03',
            employee: 'Eduardo',
            startTime: '10:00',
            endTime: '20:00',
            breakMinutes: 60,
            hourlyRate: 23,
        },
        {
            id: makeId(),
            date: '2026-03-04',
            employee: 'Eduardo',
            startTime: '10:00',
            endTime: '20:00',
            breakMinutes: 60,
            hourlyRate: 23,
        },
        {
            id: makeId(),
            date: '2026-03-05',
            employee: 'Eduardo',
            startTime: '10:00',
            endTime: '20:15',
            breakMinutes: 60,
            hourlyRate: 23,
        },
        {
            id: makeId(),
            date: '2026-03-06',
            employee: 'Eduardo',
            startTime: '11:00',
            endTime: '21:15',
            breakMinutes: 60,
            hourlyRate: 23,
        },
        {
            id: makeId(),
            date: '2026-03-07',
            employee: 'Eduardo',
            startTime: '12:00',
            endTime: '20:00',
            breakMinutes: 60,
            hourlyRate: 23,
        },
    ])

    const [newRow, setNewRow] = useState<PayrollRow>({
        id: '',
        date: '',
        employee: '',
        startTime: '',
        endTime: '',
        breakMinutes: 60,
        hourlyRate: 20,
    })

    const addRow = () => {
        if (!newRow.date || !newRow.employee || !newRow.startTime || !newRow.endTime || !newRow.hourlyRate) return

        setRows((prev) => [
            ...prev,
            {
                ...newRow,
                id: makeId(),
            },
        ])

        setNewRow({
            id: '',
            date: '',
            employee: '',
            startTime: '',
            endTime: '',
            breakMinutes: 60,
            hourlyRate: 20,
        })
    }

    const removeRow = (id: string) => {
        setRows((prev) => prev.filter((row) => row.id !== id))
    }

    const payrollRows = useMemo<PayrollComputedRow[]>(() => {
        return rows.map((row) => {
            const hoursWorked = calculateWorkedHours(row.startTime, row.endTime, row.breakMinutes)
            const overtimeHours = calculateDailyOvertime(hoursWorked)
            const regularHours = calculateRegularHours(hoursWorked)
            const overtimeRate = round2(row.hourlyRate * 1.5)
            const regularPay = round2(regularHours * row.hourlyRate)
            const overtimePay = round2(overtimeHours * overtimeRate)
            const grossPay = round2(regularPay + overtimePay)

            return {
                ...row,
                hoursWorked,
                regularHours,
                overtimeHours,
                overtimeRate,
                regularPay,
                overtimePay,
                grossPay,
            }
        })
    }, [rows])

    const summary = useMemo<PayrollSummary[]>(() => {
        const grouped = new Map<string, PayrollSummary>()

        payrollRows.forEach((row) => {
            const existing = grouped.get(row.employee) || {
                employee: row.employee,
                regularHours: 0,
                overtimeHours: 0,
                grossPay: 0,
                hourlyRate: row.hourlyRate,
            }

            existing.regularHours = round2(existing.regularHours + row.regularHours)
            existing.overtimeHours = round2(existing.overtimeHours + row.overtimeHours)
            existing.grossPay = round2(existing.grossPay + row.grossPay)
            existing.hourlyRate = row.hourlyRate

            grouped.set(row.employee, existing)
        })

        return Array.from(grouped.values()).sort((a, b) => a.employee.localeCompare(b.employee))
    }, [payrollRows])

    const grandTotal = useMemo(() => {
        return round2(summary.reduce((acc, row) => acc + row.grossPay, 0))
    }, [summary])

    const printPayStub = (employee: string) => {
        const employeeSummary = summary.find((s) => s.employee === employee)
        if (!employeeSummary) return

        const { start, end } = getPeriodRange(payrollRows, employee)

        const html = buildPayStubHtml({
            businessName: 'MaiSushi',
            employee,
            periodStart: start,
            periodEnd: end,
            rows: payrollRows,
            summary: employeeSummary,
        })

        const printWindow = window.open('', '_blank', 'width=980,height=900')
        if (!printWindow) return

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Payroll / RH</h1>
                        <p className="text-sm text-gray-500">
                            Gestion simple des heures, heures supplémentaires et paie brute.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Ajouter une ligne</h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <input
                        type="date"
                        value={newRow.date}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                    <input
                        type="text"
                        value={newRow.employee}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, employee: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                        placeholder="Eduardo"
                    />
                    <input
                        type="time"
                        value={newRow.startTime}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                    <input
                        type="time"
                        value={newRow.endTime}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                    <input
                        type="number"
                        value={newRow.breakMinutes}
                        onChange={(e) =>
                            setNewRow((prev) => ({
                                ...prev,
                                breakMinutes: Number(e.target.value || 0),
                            }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                    <input
                        type="number"
                        step="0.01"
                        value={newRow.hourlyRate}
                        onChange={(e) =>
                            setNewRow((prev) => ({
                                ...prev,
                                hourlyRate: Number(e.target.value || 0),
                            }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="mt-4">
                    <button
                        onClick={addRow}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Ajouter
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Détail de paie</h2>

                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b text-left text-gray-600">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Employé</th>
                            <th className="px-3 py-2">Début</th>
                            <th className="px-3 py-2">Fin</th>
                            <th className="px-3 py-2">Pause</th>
                            <th className="px-3 py-2">Heures</th>
                            <th className="px-3 py-2">Régulières</th>
                            <th className="px-3 py-2">OT</th>
                            <th className="px-3 py-2">Taux</th>
                            <th className="px-3 py-2">OT Rate</th>
                            <th className="px-3 py-2">Brut</th>
                            <th className="px-3 py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollRows.map((row) => (
                            <tr key={row.id} className="border-b last:border-0">
                                <td className="px-3 py-2">{row.date}</td>
                                <td className="px-3 py-2">{row.employee}</td>
                                <td className="px-3 py-2">{row.startTime}</td>
                                <td className="px-3 py-2">{row.endTime}</td>
                                <td className="px-3 py-2">{row.breakMinutes} min</td>
                                <td className="px-3 py-2">{row.hoursWorked.toFixed(2)}</td>
                                <td className="px-3 py-2">{row.regularHours.toFixed(2)}</td>
                                <td className="px-3 py-2">{row.overtimeHours.toFixed(2)}</td>
                                <td className="px-3 py-2">{money(row.hourlyRate)}</td>
                                <td className="px-3 py-2">{money(row.overtimeRate)}</td>
                                <td className="px-3 py-2 font-medium">{money(row.grossPay)}</td>
                                <td className="px-3 py-2">
                                    <button
                                        onClick={() => removeRow(row.id)}
                                        className="rounded-lg border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50"
                                    >
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Résumé par employé</h2>

                    <div className="space-y-3">
                        {summary.map((item) => (
                            <div
                                key={item.employee}
                                className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{item.employee}</p>
                                    <p className="text-sm text-gray-500">
                                        Régulières: {item.regularHours.toFixed(2)} h · OT: {item.overtimeHours.toFixed(2)} h
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-gray-800">
                                        Brut: {money(item.grossPay)}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => printPayStub(item.employee)}
                                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                        Imprimer fiche
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Total période</h2>

                    <div className="rounded-2xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">Total brut à payer</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">{money(grandTotal)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
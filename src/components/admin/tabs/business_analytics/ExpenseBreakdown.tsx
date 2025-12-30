import { useState, useMemo } from 'react'
import { useExpenses } from '../../../../context/ExpensesContext'

export default function ExpenseBreakdown() {
  const { expenses, addExpense, removeExpense, getMonthlyExpenses, getExpensesByCategory, loading, error } = useExpenses()

  const [showAddForm, setShowAddForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    notes: ''
  })

  const expenseCategories = [
    'rent',
    'utilities',
    'salaries',
    'ingredients',
    'supplies',
    'marketing',
    'equipment',
    'maintenance',
    'insurance',
    'other'
  ]

  const expensesByCategory = useMemo(() => {
    return getExpensesByCategory()
  }, [expenses, getExpensesByCategory])

  const monthlyExpenses = useMemo(() => {
    return getMonthlyExpenses()
  }, [expenses, getMonthlyExpenses])

  const recentExpenses = useMemo(() => {
    return expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [expenses])

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpense.name || !newExpense.amount) {
      alert('Please fill in all required fields')
      return
    }

    setProcessing(true)
    try {
      await addExpense({
        name: newExpense.name.trim(),
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: newExpense.date,
        recurring: newExpense.recurring,
        notes: newExpense.notes || undefined
      })

      setNewExpense({
        name: '',
        amount: '',
        category: 'other',
        date: new Date().toISOString().split('T')[0],
        recurring: false,
        notes: ''
      })
      setShowAddForm(false)

      alert('Expense added successfully!')
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      try {
        await removeExpense(id)
        alert('Expense deleted successfully!')
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Failed to delete expense. Please try again.')
      }
    }
  }

  // Simple pie chart representation
  const ExpensePieChart = () => {

    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([category, amount]) => {
            const color = getCategoryColor(category)

            return (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <div className="text-xs">
                  <span className="font-light capitalize">{category}</span>
                  <span className="text-gray-600 ml-1">
                    (${(amount as number).toFixed(0)})
                  </span>
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      rent: '#ef4444',
      utilities: '#f59e0b',
      salaries: '#10b981',
      ingredients: '#3b82f6',
      supplies: '#8b5cf6',
      marketing: '#ec4899',
      equipment: '#06b6d4',
      maintenance: '#84cc16',
      insurance: '#f97316',
      other: '#6b7280'
    }
    return colors[category] || '#6b7280'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-lg text-gray-600 font-light">Loading expenses...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="text-red-700 font-light text-sm">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-light text-gray-900">Expense Breakdown</h3>
            <p className="text-gray-500 font-light text-xs sm:text-sm mt-1">Track and categorize business expenses</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gray-900 text-white px-3 sm:px-4 py-2 text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 transition-colors w-full sm:w-auto"
          >
            + ADD EXPENSE
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">MONTHLY EXPENSES</p>
              <p className="text-base sm:text-lg font-light text-red-600 mt-1 truncate">${monthlyExpenses.toFixed(2)}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">CATEGORIES</p>
              <p className="text-base sm:text-lg font-light text-blue-600 mt-1 truncate">{Object.keys(expensesByCategory).length}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">TOTAL EXPENSES</p>
              <p className="text-base sm:text-lg font-light text-purple-600 mt-1 truncate">{expenses.length}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">ADD NEW EXPENSE</h4>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-light text-gray-700 mb-1 tracking-wide">EXPENSE NAME *</label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                  placeholder="e.g., Monthly Rent"
                  required
                  disabled={processing}
                />
              </div>
              <div>
                <label className="block text-xs font-light text-gray-700 mb-1 tracking-wide">AMOUNT *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                  placeholder="0.00"
                  required
                  disabled={processing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-light text-gray-700 mb-1 tracking-wide">CATEGORY</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                  disabled={processing}
                >
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-light text-gray-700 mb-1 tracking-wide">DATE</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                  disabled={processing}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newExpense.recurring}
                onChange={(e) => setNewExpense({ ...newExpense, recurring: e.target.checked })}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                disabled={processing}
              />
              <label htmlFor="recurring" className="text-xs text-gray-700 font-light">
                Recurring monthly expense
              </label>
            </div>

            <div>
              <label className="block text-xs font-light text-gray-700 mb-1 tracking-wide">NOTES (OPTIONAL)</label>
              <textarea
                value={newExpense.notes}
                onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                rows={2}
                placeholder="Additional notes about this expense..."
                disabled={processing}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={processing}
                className="bg-gray-900 text-white px-4 py-2 text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-1"
              >
                {processing ? 'ADDING...' : 'ADD EXPENSE'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={processing}
                className="bg-gray-500 text-white px-4 py-2 text-sm font-light tracking-wide rounded-sm hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-1"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Breakdown by Category */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">EXPENSES BY CATEGORY</h4>
        {Object.keys(expensesByCategory).length > 0 ? (
          <div className="space-y-3">
            <ExpensePieChart />

            <div className="space-y-2">
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([category, amount]) => {
                  const percentage = ((amount as number) / monthlyExpenses) * 100
                  const color = getCategoryColor(category)

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-light capitalize">{category}</span>
                        <span className="font-light">${(amount as number).toFixed(0)} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="rounded-full h-1.5"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 font-light text-sm">
            No expense data available. Add some expenses to see the breakdown.
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">RECENT EXPENSES</h4>
        <div className="space-y-2">
          {recentExpenses.map(expense => (
            <div key={expense.id} className="flex justify-between items-start sm:items-center p-2 bg-gray-50 rounded-sm border border-gray-200 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0 mt-1"
                    style={{ backgroundColor: getCategoryColor(expense.category) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-light text-gray-900 text-sm truncate">{expense.name}</div>
                    <div className="text-xs text-gray-600 font-light capitalize">
                      {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      {expense.recurring && ' • 🔄'}
                    </div>
                  </div>
                </div>
                {expense.notes && (
                  <div className="text-xs text-gray-500 font-light mt-1">{expense.notes}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="font-light text-red-600 text-sm">${expense.amount.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="text-red-600 hover:text-red-800 text-xs p-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete expense"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {recentExpenses.length === 0 && (
            <div className="text-center py-3 text-gray-500 font-light text-sm">
              No expenses recorded yet. Add your first expense to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
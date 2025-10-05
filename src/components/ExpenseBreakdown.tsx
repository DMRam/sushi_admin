import React, { useState, useMemo } from 'react'
import { useExpenses } from '../context/ExpensesContext'

export default function ExpenseBreakdown() {
  const { expenses, addExpense, removeExpense, getMonthlyExpenses, getExpensesByCategory } = useExpenses()
  
  const [showAddForm, setShowAddForm] = useState(false)
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
  }, [expenses])

  const monthlyExpenses = useMemo(() => {
    return getMonthlyExpenses()
  }, [expenses])

  const recentExpenses = useMemo(() => {
    return expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [expenses])

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpense.name || !newExpense.amount) return

    addExpense({
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
  }

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      removeExpense(id)
    }
  }

  // Simple pie chart representation
  const ExpensePieChart = () => {
    const total = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 1)
    
    return (
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(expensesByCategory)
          .sort(([,a], [,b]) => b - a)
          .map(([category, amount]) => {
            const percentage = (amount / total) * 100
            const color = getCategoryColor(category)
            
            return (
              <div key={category} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="text-sm">
                  <span className="font-medium capitalize">{category}</span>
                  <span className="text-gray-600 ml-1">
                    (${amount.toFixed(2)} - {percentage.toFixed(1)}%)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">${monthlyExpenses.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Monthly Expenses</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{Object.keys(expensesByCategory).length}</div>
          <div className="text-sm text-gray-600">Expense Categories</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{expenses.length}</div>
          <div className="text-sm text-gray-600">Total Expenses</div>
        </div>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Add New Expense</h4>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name *</label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Monthly Rent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newExpense.recurring}
                onChange={(e) => setNewExpense({...newExpense, recurring: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="recurring" className="text-sm text-gray-700">
                Recurring monthly expense
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={newExpense.notes}
                onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional notes about this expense..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Breakdown by Category */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Expenses by Category</h4>
        {Object.keys(expensesByCategory).length > 0 ? (
          <div className="space-y-4">
            <ExpensePieChart />
            
            <div className="space-y-2">
              {Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = (amount / monthlyExpenses) * 100
                  const color = getCategoryColor(category)
                  
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{category}</span>
                        <span>${amount.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="rounded-full h-2"
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
          <div className="text-center py-8 text-gray-500">
            No expense data available. Add some expenses to see the breakdown.
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Expenses</h4>
        <div className="space-y-2">
          {recentExpenses.map(expense => (
            <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getCategoryColor(expense.category) }}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{expense.name}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      {expense.recurring && ' • 🔄 Recurring'}
                    </div>
                  </div>
                </div>
                {expense.notes && (
                  <div className="text-sm text-gray-500 mt-1">{expense.notes}</div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-red-600">${expense.amount.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          
          {recentExpenses.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
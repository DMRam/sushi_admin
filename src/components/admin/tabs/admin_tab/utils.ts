import { useEffect, useState } from 'react'
import type { Unit } from '../../../../types/types'

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

export function normalizeUnit(value: any): Unit {
  const normalized = String(value ?? '').trim().toLowerCase()

  const allowedUnits: Unit[] = [
    'unit',
    'g',
    'kg',
    'ml',
    'l',
    'oz',
    'lb',
    'piece',
    'slice',
    'tbsp',
    'tsp',
  ]

  if ((allowedUnits as string[]).includes(normalized)) {
    return normalized as Unit
  }

  return 'unit'
}
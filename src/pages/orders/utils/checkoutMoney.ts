export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / MS_PER_DAY);
}

export function isPast(target: Date): boolean {
  return target.getTime() < Date.now();
}

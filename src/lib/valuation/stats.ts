export function median(values: number[]): number | undefined {
  return quantile(values, 0.5)
}

/** Linear-interpolated quantile (same method as spreadsheet PERCENTILE.INC). */
export function quantile(values: number[], q: number): number | undefined {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (xs.length === 0) return undefined
  const pos = (xs.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const a = xs[lo]!
  const b = xs[hi]!
  return a + (b - a) * (pos - lo)
}

export function mean(values: number[]): number | undefined {
  const xs = values.filter((v) => Number.isFinite(v))
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined
}

/** Coefficient of variation (sample standard deviation / mean). */
export function coefficientOfVariation(values: number[]): number | undefined {
  const xs = values.filter((v) => Number.isFinite(v))
  if (xs.length < 2) return undefined
  const m = mean(xs)!
  if (m === 0) return undefined
  const variance = xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(variance) / m
}

/** Great-circle distance in miles. */
export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step
}

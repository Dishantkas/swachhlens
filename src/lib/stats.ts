export function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export function stdDev(values: number[]) {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1))
}

function logGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
    -0.5395239384953e-5,
  ]
  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  for (const coef of c) ser += coef / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const MAX = 200
  const EPS = 3e-14
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAX; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

// Regularized incomplete beta function I_x(a, b).
function incompleteBeta(x: number, a: number, b: number) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(a, b, x)) / a
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b
}

export type TTest = {
  n: number
  mean: number
  sd: number
  t: number
  df: number
  p: number
}

/** One-sample, one-tailed t-test. H1: the population mean is greater than mu0. */
export function oneSampleTTest(values: number[], mu0: number): TTest | null {
  const n = values.length
  if (n < 2) return null
  const m = mean(values)
  const sd = stdDev(values)
  if (sd === 0) return { n, mean: m, sd, t: m > mu0 ? Infinity : -Infinity, df: n - 1, p: m > mu0 ? 0 : 1 }
  const t = (m - mu0) / (sd / Math.sqrt(n))
  const df = n - 1
  const tail = 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5)
  return { n, mean: m, sd, t, df, p: t > 0 ? tail : 1 - tail }
}

/** Exact one-tailed binomial test. H1: the true success rate is greater than p0. */
export function binomialTest(successes: number, n: number, p0: number) {
  if (n === 0) return null
  const logChoose = (k: number) => logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
  let p = 0
  for (let k = successes; k <= n; k++) {
    p += Math.exp(logChoose(k) + k * Math.log(p0) + (n - k) * Math.log(1 - p0))
  }
  return { successes, n, rate: successes / n, p0, p: Math.min(1, p) }
}

export function formatP(p: number) {
  if (p < 0.001) return 'p < 0.001'
  return `p = ${p.toFixed(3)}`
}

// System Usability Scale: odd items are positive, even items are negative.
export function susScore(answers: number[]) {
  const total = answers.reduce((sum, v, i) => sum + (i % 2 === 0 ? v - 1 : 5 - v), 0)
  return total * 2.5
}

export function susGrade(score: number) {
  if (score >= 80.3) return 'Excellent (A)'
  if (score >= 68) return 'Good (above average)'
  if (score >= 51) return 'OK (below average)'
  return 'Poor'
}

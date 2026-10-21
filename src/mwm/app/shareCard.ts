import type { Analysis, AppState } from '../engine'
import { splitByFreedom } from './Headline'

const PAPER = '#fafaf7'
const INK = '#0f0f0f'
const SMOKE = '#5a5a5a'
const LINE = '#e5e3dd'
const OX = '#7a1f2a'
const SEG: Record<string, string> = { free: OX, local: '#b0646d', slow: '#d9b8bc', stuck: '#cfcac1' }

/**
 * A 1200 x 1500 card (4:5, what LinkedIn and Instagram crop to) drawn on a
 * canvas in the browser. Nothing is uploaded: the image is handed straight
 * to the download link.
 */
export async function drawShareCard(a: Analysis, state: AppState): Promise<Blob | null> {
  await document.fonts?.ready
  const W = 1200
  const H = 1500
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return null

  const serif = '"EB Garamond", Georgia, serif'
  const sans = 'Inter, system-ui, sans-serif'

  g.fillStyle = PAPER
  g.fillRect(0, 0, W, H)

  const P = 96
  g.fillStyle = OX
  g.font = `600 26px ${sans}`
  g.fillText('MINI WEALTH MANAGER', P, P + 20)

  g.fillStyle = INK
  g.font = `500 92px ${serif}`
  g.fillText('My balance is not', P, 300)
  g.fillText('my money.', P, 400)

  const parts = splitByFreedom(state)
  const total = a.standing.totalUsd
  const reach = parts.free + parts.local
  const pct = total > 0 ? Math.round((reach / total) * 100) : 0

  // Percentages and months, never amounts: the card is made to be posted.
  g.fillStyle = SMOKE
  g.font = `400 30px ${sans}`
  g.fillText('On paper', P, 560)
  g.fillText('Within reach', 640, 560)
  g.fillStyle = INK
  g.font = `500 110px ${serif}`
  g.fillText('100%', P, 680)
  g.fillStyle = OX
  g.fillText(`${pct}%`, 640, 680)

  // the split bar
  const bx = P
  const by = 760
  const bw = W - 2 * P
  const bh = 56
  let x = bx
  const order = ['free', 'local', 'slow', 'stuck'] as const
  for (const k of order) {
    if (parts[k] <= 0 || total <= 0) continue
    const w = (parts[k] / total) * bw
    g.fillStyle = SEG[k]
    g.fillRect(x, by, w, bh)
    x += w
  }
  g.font = `400 26px ${sans}`
  let lx = bx
  for (const k of order) {
    g.fillStyle = SEG[k]
    g.fillRect(lx, by + bh + 34, 18, 18)
    g.fillStyle = SMOKE
    const share = total > 0 ? Math.round((parts[k] / total) * 100) : 0
    const label = `${k[0].toUpperCase()}${k.slice(1)} ${share}%`
    g.fillText(label, lx + 28, by + bh + 52)
    lx += g.measureText(label).width + 72
  }

  if (a.flow.spendUsd > 0) {
    const m = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''))
    g.fillStyle = INK
    g.font = `400 34px ${sans}`
    g.fillText(`${m(a.flow.runwayTotalMonths)} months of spending on paper. ${m(a.flow.runwayAccessibleMonths)} in reality.`, P, 950)
  }

  g.strokeStyle = LINE
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(P, 1010)
  g.lineTo(W - P, 1010)
  g.stroke()

  g.fillStyle = SMOKE
  g.font = `400 30px ${sans}`
  g.fillText('Where I am', P, 1080)
  g.fillStyle = INK
  g.font = `500 54px ${serif}`
  const stage =
    a.human.stage === 'buildIncome'
      ? 'Step 1 of 3: income comes first'
      : a.human.stage === 'buildBuffer'
        ? 'Step 2 of 3: building a safety net I can reach'
        : 'Step 3 of 3: safety net done, ready to invest'
  wrap(g, stage, P, 1160, W - 2 * P, 64, 3)

  g.fillStyle = SMOKE
  g.font = `400 28px ${sans}`
  g.fillText('Free, no sign-up, nothing leaves your browser.', P, H - P - 40)
  g.fillStyle = OX
  g.font = `600 30px ${sans}`
  g.fillText('samirkassir.me/wealth', P, H - P + 6)

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'))
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines: number) {
  const words = text.split(' ')
  let line = ''
  let n = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y + n * lh)
      line = w
      n++
      if (n >= lines) return
    } else line = test
  }
  if (line) g.fillText(line, x, y + n * lh)
}

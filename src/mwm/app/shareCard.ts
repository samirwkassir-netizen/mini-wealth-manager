import type { Analysis, AppState } from '../engine'
import { splitByFreedom } from './Headline'

const PAPER = '#fafaf7'
const INK = '#0f0f0f'
const SMOKE = '#5a5a5a'
const LINE = '#e5e3dd'
const OX = '#7a1f2a'
const FILL = { free: OX, local: '#A9545E', slow: '#D29AA1', stuck: '#A39E96' } as const
const NAME = { free: 'Free', local: 'Local', slow: 'Slow', stuck: 'Stuck' } as const
const BODY = 'M36 34 C36 42 18 44 18 60 V136 Q18 150 32 150 H88 Q102 150 102 136 V60 C102 44 84 42 84 34 Z'

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
  g.font = `500 96px ${serif}`
  g.fillText('My balance is not', P, 290)
  g.fillText('my money.', P, 392)

  const parts = splitByFreedom(state)
  const total = a.standing.totalUsd
  const reach = parts.free + parts.local
  const pct = total > 0 ? Math.round((reach / total) * 100) : 0
  const order = ['free', 'local', 'slow', 'stuck'] as const
  const biggest = Math.max(...order.map((k) => parts[k]), 1)

  // Four jars on a shelf, labelled with shares, never amounts: the card is made to be posted.
  const jw = 200
  const gap = (W - 2 * P - 4 * jw) / 3
  const top = 470
  order.forEach((k, i) => {
    const x = P + i * (jw + gap)
    drawJar(g, k, parts[k] / biggest, x, top, jw)
    const share = total > 0 ? Math.round((parts[k] / total) * 100) : 0
    g.textAlign = 'center'
    g.fillStyle = parts[k] > 0 ? INK : SMOKE
    g.font = `500 56px ${serif}`
    g.fillText(`${share}%`, x + jw / 2, top + 330)
    g.font = `600 26px ${sans}`
    g.fillText(NAME[k], x + jw / 2, top + 370)
    g.textAlign = 'left'
  })
  g.fillStyle = '#d8cfc2'
  g.fillRect(P - 10, top + 278, W - 2 * P + 20, 12)

  g.fillStyle = INK
  g.font = `500 64px ${serif}`
  g.fillText('I can really use ', P, 1000)
  const w1 = g.measureText('I can really use ').width
  g.fillStyle = OX
  g.fillText(`${pct}%`, P + w1, 1000)
  const w2 = g.measureText(`${pct}%`).width
  g.fillStyle = INK
  g.fillText(' of it.', P + w1 + w2, 1000)

  if (a.flow.spendUsd > 0) {
    const m = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''))
    g.fillStyle = SMOKE
    g.font = `400 32px ${sans}`
    g.fillText(`${m(a.flow.runwayAccessibleMonths)} months of my spending, not ${m(a.flow.runwayTotalMonths)}.`, P, 1060)
  }

  g.strokeStyle = LINE
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(P, 1120)
  g.lineTo(W - P, 1120)
  g.stroke()

  g.fillStyle = SMOKE
  g.font = `400 28px ${sans}`
  g.fillText('Where I am', P, 1180)
  g.fillStyle = INK
  g.font = `500 46px ${serif}`
  const stage =
    a.human.stage === 'buildIncome'
      ? 'Step 1 of 3: earning comes first'
      : a.human.stage === 'buildBuffer'
        ? 'Step 2 of 3: saving rainy-day money I can really use'
        : 'Step 3 of 3: rainy-day money done, ready to grow the rest'
  wrap(g, stage, P, 1240, W - 2 * P, 56, 2)

  g.fillStyle = SMOKE
  g.font = `400 26px ${sans}`
  g.fillText('Free, no sign-up, nothing leaves your browser.', P, H - P - 36)
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

/** The same jar as src/art/Jar.tsx, drawn on a canvas (120 by 162 units, scaled to `w`). */
function drawJar(g: CanvasRenderingContext2D, kind: keyof typeof FILL, level: number, x: number, y: number, w: number) {
  const k = w / 120
  const l = Math.max(0, Math.min(1, level))
  const shown = l > 0 ? Math.max(l, 0.06) : 0
  const body = new Path2D(BODY)
  g.save()
  g.translate(x, y)
  g.scale(k, k)

  g.fillStyle = 'rgba(15,15,15,0.08)'
  g.beginPath()
  g.ellipse(60, 154, 44, 5, 0, 0, Math.PI * 2)
  g.fill()

  g.fillStyle = '#ffffff'
  g.fill(body)

  if (shown > 0) {
    g.save()
    g.clip(body)
    g.fillStyle = FILL[kind]
    const top = 148 - shown * 96
    g.fillRect(0, top, 120, 170 - top)
    g.restore()
  }

  g.strokeStyle = INK
  g.lineWidth = 2.6
  g.lineJoin = 'round'
  g.stroke(body)
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = 5
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(29, 68)
  g.lineTo(29, 124)
  g.stroke()

  g.fillStyle = PAPER
  g.strokeStyle = INK
  g.lineWidth = 2.4
  g.fillRect(34, 26, 52, 10)
  g.strokeRect(34, 26, 52, 10)

  g.fillStyle = INK
  if (kind === 'free') {
    g.save()
    g.translate(30, 19)
    g.rotate((-16 * Math.PI) / 180)
    g.translate(-6, -19)
    g.fillRect(0, 4, 60, 15)
    g.restore()
  } else {
    g.fillRect(30, 13, 60, 15)
  }

  if (kind === 'local') {
    g.fillStyle = PAPER
    g.fillRect(38, 76, 44, 34)
    g.strokeRect(38, 76, 44, 34)
    g.fillStyle = OX
    g.fill(new Path2D('M60 82 c-6 0 -10 4.4 -10 9.6 c0 7 10 13.4 10 13.4 s10 -6.4 10 -13.4 c0 -5.2 -4 -9.6 -10 -9.6 z'))
    g.fillStyle = PAPER
    g.beginPath()
    g.arc(60, 91.6, 3.4, 0, Math.PI * 2)
    g.fill()
  }
  if (kind === 'slow') {
    g.strokeStyle = INK
    g.lineWidth = 4
    g.stroke(new Path2D('M101 124 H112 Q116 124 116 128 V132'))
    g.fillStyle = OX
    g.fill(new Path2D('M116 137 c-2 3 -3 4.6 -3 6 a3 3 0 0 0 6 0 c0 -1.4 -1 -3 -3 -6 z'))
  }
  if (kind === 'stuck') {
    g.strokeStyle = INK
    g.lineWidth = 4
    g.stroke(new Path2D('M51 36 V30 a9 9 0 0 1 18 0 V36'))
    g.fillStyle = INK
    g.fillRect(45, 34, 30, 24)
    g.fillStyle = PAPER
    g.beginPath()
    g.arc(60, 44, 3, 0, Math.PI * 2)
    g.fill()
    g.fillRect(58.6, 45, 2.8, 7)
  }
  g.restore()
}

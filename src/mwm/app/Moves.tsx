import { useState } from 'react'
import type { Analysis } from '../engine'

const TAG: Record<string, string> = {
  'before markets': 'Before markets',
  first: 'First',
  then: 'Then',
  ongoing: 'Ongoing',
}

export function Moves({ a }: { a: Analysis }) {
  const [open, setOpen] = useState<string | null>(null)
  const empty = a.standing.totalUsd <= 0 && a.flow.incomeUsd <= 0 && a.flow.spendUsd <= 0
  const list = empty ? [] : a.actions

  return (
    <section className="w-moves" aria-labelledby="w-h-moves">
      <h2 id="w-h-moves" className="w-h">
        Your next moves
      </h2>
      {empty ? <p className="w-muted">Your moves, in order, appear here once you add what you hold.</p> : null}
      <ol className="w-moves-list">
        {list.map((m) => {
          const isOpen = open === m.id
          return (
            <li key={m.id} className={isOpen ? 'is-open' : ''}>
              <button type="button" className="w-move" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
                <span className="w-move-n">{m.order}</span>
                <span className="w-move-text">
                  <span className="w-move-tag">{TAG[m.tag] ?? m.tag}</span>
                  <span className="w-move-title">{m.title}</span>
                </span>
                <span className="w-move-chev" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen ? <p className="w-move-body">{m.body}</p> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

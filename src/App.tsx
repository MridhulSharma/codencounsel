import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { propertySource } from './lib/data'
import type { Parcel, PilotData } from './types/data'
import { Search } from './components/Search'
import { Worksheet } from './components/Worksheet'
import { Resources } from './components/Resources'

function Brand() {
  return (
    <span className="brand">
      <svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M4 9h24M4 23h24M9 9v14M23 9v14" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
      Level<span className="brand-dot">.</span>
    </span>
  )
}
export default function App() {
  const [selection, setSelection] = useState<{ parcel: Parcel; data: PilotData }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const token = useRef(0)
  async function select(pid: string) {
    const current = ++token.current
    setBusy(true)
    setError('')
    try {
      const data = await propertySource.loadAnalysis()
      if (current !== token.current) return
      const parcel = data.parcelsByPid.get(pid)
      if (!parcel) throw new Error('That parcel is not in this pilot dataset. Try another address.')
      setSelection({ parcel, data })
      setSearching(false)
      setTimeout(() => {
        const heading = document.querySelector<HTMLHeadingElement>('main h1')
        heading?.setAttribute('tabindex', '-1')
        heading?.focus()
        window.scrollTo({ top: 0, behavior: 'instant' })
      }, 0)
    } catch (e) {
      if (current === token.current)
        setError(e instanceof Error ? e.message : 'Unable to open the property. Try again.')
    } finally {
      if (current === token.current) setBusy(false)
    }
  }
  function clear() {
    token.current++
    setSelection(undefined)
    setSearching(false)
    setError('')
    setBusy(false)
    setClearOpen(false)
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header no-print">
        <div className="shell header-inner">
          <a
            href="#main"
            className="brand-link"
            aria-label="Level home"
            onClick={() => {
              if (selection) setClearOpen(true)
            }}
          >
            <Brand />
          </a>
          <nav aria-label="Main navigation">
            <a href="#resources">How it works</a>
            <span className="header-pilot">Allston pilot</span>
            {selection && (
              <button className="text-button" onClick={() => setSearching((v) => !v)}>
                Find another property
              </button>
            )}
            <Dialog.Root open={clearOpen} onOpenChange={setClearOpen}>
              <Dialog.Trigger asChild>
                <button className="secondary compact">Clear my data</button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                  <Dialog.Title>Clear this session?</Dialog.Title>
                  <Dialog.Description>
                    Your selected property, notes, checklist, and entered dates will be cleared.
                    Downloaded files stay on your device. Nothing is stored on our server.
                  </Dialog.Description>
                  <div className="actions">
                    <Dialog.Close asChild>
                      <button className="secondary">Keep working</button>
                    </Dialog.Close>
                    <button onClick={clear}>Clear session</button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </nav>
        </div>
      </header>
      <main id="main" className="shell" tabIndex={-1}>
        {!selection ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="pilot-marker">
                  <span aria-hidden="true" />
                  Free homeowner resource · Boston pilot
                </span>
                <h1 tabIndex={-1}>A clearer picture of your property assessment.</h1>
                <p className="hero-description">
                  Understand your assessment. Build your evidence. Know your deadlines.
                </p>
                <p>
                  Public records and a guided worksheet to help you prepare for a property-tax
                  review—one step at a time.
                </p>
                <a
                  className="button"
                  href="#address"
                  onClick={() => document.getElementById('address')?.focus()}
                >
                  Check my assessment
                </a>
                <p className="small muted">No account. No fees. You decide what happens next.</p>
              </div>
              <div className="hero-search">
                <div className="search-top">
                  <Brand />
                  <span>Your starting point</span>
                </div>
                <Search onSelect={select} busy={busy} />
                <div className="coverage-note">
                  <strong>Built around your neighborhood</strong>
                  <p>
                    4,428 public parcel records in Allston / ZIP 02134. Other Boston neighborhoods,
                    Chelsea, Revere, and Winthrop are not yet in the data pilot.
                  </p>
                </div>
              </div>
            </section>
            <section className="journey" aria-label="Your path to a prepared review">
              <div>
                <span>1</span>
                <h2>Understand the record</h2>
                <p>Review your property details, assessment history, and similar sales.</p>
              </div>
              <div>
                <span>2</span>
                <h2>Put evidence in context</h2>
                <p>See the calculation, its assumptions, and what the data cannot tell you.</p>
              </div>
              <div>
                <span>3</span>
                <h2>Prepare with care</h2>
                <p>
                  Organize your notes, confirm dates, and bring your packet to a human reviewer.
                </p>
              </div>
            </section>
          </>
        ) : (
          <>
            {searching && (
              <section className="surface no-print">
                <h2>Find another property</h2>
                <p>
                  Choosing a new property starts a fresh worksheet and clears your current notes.
                </p>
                <Search onSelect={select} busy={busy} />
              </section>
            )}
            <Worksheet key={selection.parcel.pid} {...selection} />
          </>
        )}
        {busy && (
          <p className="load-message" role="status">
            Loading public records and preparing your worksheet…
          </p>
        )}
        {error && (
          <div className="notice" role="alert">
            {error}{' '}
            <button className="text-button" onClick={() => window.location.reload()}>
              Reload and retry
            </button>
          </div>
        )}
        <div className="no-print">
          <Resources />
        </div>
      </main>
      <footer className="site-footer no-print">
        <div className="shell">
          <Brand />
          <p>
            <strong>Legal information + document preparation.</strong> Level provides no
            individualized legal advice, appraisal, eligibility determination, or guarantee of tax
            reduction. It never files or signs anything for you.
          </p>
          <p className="small">
            Your entries live only in this tab’s memory. No accounts, analytics, remote photo
            storage, or homeowner profiles. Static hosting may keep ordinary request logs. Printing
            and calendar export create files you control.
          </p>
          <p className="small">Code + Counsel — Building Common Ground · September 27, 2026</p>
        </div>
      </footer>
    </>
  )
}

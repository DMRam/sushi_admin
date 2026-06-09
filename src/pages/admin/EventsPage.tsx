import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import {
  CalendarDays,
  ClipboardList,
  Eye,
  Mail,
  Mic2,
  PartyPopper,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { db } from '../../firebase/firebase'

type EventPackage = {
  id: string
  title: string
  summary: string
  description: string
  startingPrice: string
  guestRange: string
  packageType: string
  imageUrl: string
  status: 'draft' | 'published'
  sortOrder: number
}

const emptyDraft: Omit<EventPackage, 'id'> = {
  title: '',
  summary: '',
  description: '',
  startingPrice: '',
  guestRange: '',
  packageType: 'Private event',
  imageUrl: '',
  status: 'draft',
  sortOrder: 10,
}

const starterPackages: Omit<EventPackage, 'id'>[] = [
  {
    title: 'Sushi Island',
    summary: 'A shareable sushi station for birthdays, teams, and private groups.',
    description: 'Rolls, trays, sauces, and optional premium upgrades organized as an event package.',
    startingPrice: 'Quote required',
    guestRange: '10-40 guests',
    packageType: 'Sushi station',
    imageUrl: '',
    status: 'draft',
    sortOrder: 10,
  },
  {
    title: '15th birthday party',
    summary: 'A teen birthday format with sushi, drinks, desserts, and optional karaoke.',
    description: 'Designed for families who want a clear party option without planning everything from zero.',
    startingPrice: 'Quote required',
    guestRange: '12-35 guests',
    packageType: 'Birthday',
    imageUrl: '',
    status: 'draft',
    sortOrder: 20,
  },
  {
    title: 'Office & team trays',
    summary: 'Lunch trays for offices, schools, sports teams, and staff meals.',
    description: 'Group-friendly sushi trays and add-ons for meetings, celebrations, and team lunches.',
    startingPrice: 'From $95',
    guestRange: '6-25 guests',
    packageType: 'Office trays',
    imageUrl: '',
    status: 'draft',
    sortOrder: 30,
  },
]

const intakeFields = [
  'Customer name and phone',
  'Requested date and time',
  'Estimated guest count and age group',
  'Event type',
  'Budget or preferred package',
  'Notes, allergies, and service needs',
]

const packagesCollection = collection(db, 'eventPackages')

export default function EventsPage() {
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [selectedId, setSelectedId] = useState<string>('new')
  const [draft, setDraft] = useState<Omit<EventPackage, 'id'>>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(packagesCollection, orderBy('sortOrder', 'asc')),
      (snapshot) => {
        const next: EventPackage[] = snapshot.docs.map((item) => {
          const data = item.data() as Partial<EventPackage>
          const status: EventPackage['status'] = data.status === 'published' ? 'published' : 'draft'
          return {
            id: item.id,
            title: data.title || '',
            summary: data.summary || '',
            description: data.description || '',
            startingPrice: data.startingPrice || '',
            guestRange: data.guestRange || '',
            packageType: data.packageType || 'Private event',
            imageUrl: data.imageUrl || '',
            status,
            sortOrder: Number(data.sortOrder || 10),
          }
        })
        setPackages(next)
        setLoading(false)
      },
      (error) => {
        console.error('Unable to load event packages', error)
        setLoading(false)
        setFeedback('Unable to load event packages. Check Firestore permissions.')
      },
    )

    return unsubscribe
  }, [])

  const selectedPackage = packages.find((item) => item.id === selectedId)
  const publishedCount = packages.filter((item) => item.status === 'published').length
  const draftCount = packages.filter((item) => item.status !== 'published').length

  useEffect(() => {
    if (selectedId === 'new') {
      setDraft(emptyDraft)
      return
    }

    if (selectedPackage) {
      const { id, ...rest } = selectedPackage
      setDraft(rest)
    }
  }, [selectedId, selectedPackage])

  const previewPackages = useMemo(
    () => (packages.length ? packages : starterPackages.map((item, index) => ({ ...item, id: `starter-${index}` }))),
    [packages],
  )

  const updateDraft = (field: keyof Omit<EventPackage, 'id'>, value: string | number | EventPackage['status']) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const seedStarterPackages = async () => {
    setSaving(true)
    setFeedback('')
    try {
      await Promise.all(
        starterPackages.map((item) =>
          addDoc(packagesCollection, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      )
      setFeedback('Starter event packages added as drafts. Publish the ones you want on the website.')
    } catch (error) {
      console.error('Unable to add starter event packages', error)
      setFeedback('Unable to add starter packages. Check Firestore permissions.')
    } finally {
      setSaving(false)
    }
  }

  const savePackage = async () => {
    const title = draft.title.trim()
    const summary = draft.summary.trim()
    if (!title || !summary) {
      setFeedback('Title and short website summary are required.')
      return
    }

    setSaving(true)
    setFeedback('')
    const payload = {
      ...draft,
      title,
      summary,
      description: draft.description.trim(),
      startingPrice: draft.startingPrice.trim(),
      guestRange: draft.guestRange.trim(),
      packageType: draft.packageType.trim() || 'Private event',
      imageUrl: draft.imageUrl.trim(),
      sortOrder: Number(draft.sortOrder || 10),
      updatedAt: serverTimestamp(),
    }

    try {
      if (selectedId === 'new') {
        const created = await addDoc(packagesCollection, {
          ...payload,
          createdAt: serverTimestamp(),
        })
        setSelectedId(created.id)
      } else {
        await setDoc(doc(db, 'eventPackages', selectedId), payload, { merge: true })
      }
      setFeedback(payload.status === 'published' ? 'Saved and published on the website.' : 'Saved as draft.')
    } catch (error) {
      console.error('Unable to save event package', error)
      setFeedback('Unable to save. Check Firestore permissions.')
    } finally {
      setSaving(false)
    }
  }

  const removePackage = async () => {
    if (selectedId === 'new') return
    setSaving(true)
    setFeedback('')
    try {
      await deleteDoc(doc(db, 'eventPackages', selectedId))
      setSelectedId('new')
      setFeedback('Event package removed.')
    } catch (error) {
      console.error('Unable to delete event package', error)
      setFeedback('Unable to delete. Check Firestore permissions.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1720px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <div className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Events command center
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Event packages
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Create birthday, sushi island, office tray, karaoke, and private sushi offers here. Published packages appear on the public website events section.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[680px]">
              <Metric icon={PartyPopper} label="Packages" value={`${packages.length}`} />
              <Metric icon={Eye} label="Published" value={`${publishedCount}`} />
              <Metric icon={ClipboardList} label="Drafts" value={`${draftCount}`} />
              <Metric icon={UsersRound} label="Lead form" value="Contact" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3 sm:p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Website offers</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Event menu</h2>
              </div>
              <div className="flex gap-2">
                {!packages.length && (
                  <button
                    type="button"
                    onClick={seedStarterPackages}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#f26350] hover:text-[#c94639] disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Add starters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId('new')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f26350] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#e14f3d]"
                >
                  <Plus className="h-4 w-4" />
                  New event
                </button>
              </div>
            </div>

            <div className="max-h-[620px] overflow-y-auto">
              {loading ? (
                <div className="p-5 text-sm text-slate-500">Loading event packages...</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {previewPackages.map((item) => {
                    const isSelected = item.id === selectedId
                    const isStarter = item.id.startsWith('starter-')
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isStarter}
                        onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-start gap-3 p-3 text-left transition ${
                          isSelected ? 'bg-[#fff3ef]' : 'bg-white hover:bg-slate-50'
                        } ${isStarter ? 'cursor-default opacity-75' : ''}`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-[#f26350]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : item.title.toLowerCase().includes('karaoke') ? (
                            <Mic2 className="h-5 w-5" />
                          ) : (
                            <PartyPopper className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">{item.title || 'Untitled event'}</h3>
                            <span
                              className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                item.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.summary}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                            <span>{item.packageType}</span>
                            {item.guestRange && <span>· {item.guestRange}</span>}
                            {item.startingPrice && <span>· {item.startingPrice}</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {!packages.length && (
                    <div className="border-t border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                      These are preview ideas only. Click <strong>Add starters</strong> or create your own event, then set it to published.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editor</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedId === 'new' ? 'Create event package' : draft.title || 'Edit event package'}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedId !== 'new' && (
                  <button
                    type="button"
                    onClick={removePackage}
                    disabled={saving}
                    className="inline-flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={savePackage}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#f26350] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e14f3d] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-5 2xl:grid-cols-[minmax(460px,0.92fr)_minmax(420px,0.78fr)]">
              <div className="space-y-4">
                <Field label="Event title">
                  <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className="event-input" placeholder="Sushi Island" />
                </Field>
                <Field label="Short website summary">
                  <textarea
                    value={draft.summary}
                    onChange={(event) => updateDraft('summary', event.target.value)}
                    className="event-input min-h-[84px]"
                    placeholder="A shareable sushi station for birthdays, teams, and private groups."
                  />
                </Field>
                <Field label="Details for staff and customers">
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    className="event-input min-h-[104px]"
                    placeholder="What is included, options, notes, and preparation details."
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Package type">
                    <input value={draft.packageType} onChange={(event) => updateDraft('packageType', event.target.value)} className="event-input" placeholder="Birthday" />
                  </Field>
                  <Field label="Guest range">
                    <input value={draft.guestRange} onChange={(event) => updateDraft('guestRange', event.target.value)} className="event-input" placeholder="10-40 guests" />
                  </Field>
                  <Field label="Starting price">
                    <input value={draft.startingPrice} onChange={(event) => updateDraft('startingPrice', event.target.value)} className="event-input" placeholder="From $95 or Quote required" />
                  </Field>
                  <Field label="Sort order">
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(event) => updateDraft('sortOrder', Number(event.target.value || 10))}
                      className="event-input"
                    />
                  </Field>
                </div>
                <Field label="Image URL">
                  <input value={draft.imageUrl} onChange={(event) => updateDraft('imageUrl', event.target.value)} className="event-input" placeholder="https://..." />
                </Field>
                <Field label="Website status">
                  <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value as EventPackage['status'])} className="event-input">
                    <option value="draft">Draft - admin only</option>
                    <option value="published">Published - visible on website</option>
                  </select>
                </Field>
                {feedback && (
                  <div className="border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                    {feedback}
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-1">
                <div className="border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Website preview</p>
                  <article className="mt-4 overflow-hidden border border-slate-200 bg-white shadow-sm">
                    {draft.imageUrl ? (
                      <img src={draft.imageUrl} alt="" className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-[#160d0b] text-[#f26350]">
                        <PartyPopper className="h-7 w-7" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
                        <span className="bg-[#fff3ef] px-2 py-1 text-[#c94639]">{draft.packageType || 'Event'}</span>
                        {draft.guestRange && <span className="bg-slate-100 px-2 py-1 text-slate-600">{draft.guestRange}</span>}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950">{draft.title || 'Event title'}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{draft.summary || 'Short website summary will appear here.'}</p>
                      {draft.startingPrice && <p className="mt-4 text-sm font-semibold text-[#c94639]">{draft.startingPrice}</p>}
                    </div>
                  </article>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intake checklist</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">What staff should collect</h3>
                  <div className="mt-4 grid gap-2">
                    {intakeFields.map((field) => (
                      <div key={field} className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-2">
                        <ClipboardList className="h-4 w-4 text-[#f26350]" />
                        <span className="text-sm font-medium text-slate-700">{field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ActionCard icon={Mail} title="Website flow" copy="Published packages appear on the landing page. Event inquiries still arrive through the contact form webhook." />
          <ActionCard icon={Phone} title="Phone flow" copy="Staff can choose the closest package and collect the checklist details during a call." />
          <ActionCard icon={CalendarDays} title="Next build" copy="The next step is persistent event requests, deposits, pricing rules, and an event calendar." />
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof PartyPopper; label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <Icon className="mb-2 h-4 w-4 text-[#f26350]" />
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function ActionCard({ icon: Icon, title, copy }: { icon: typeof Mail; title: string; copy: string }) {
  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-[#f26350]" />
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
    </article>
  )
}

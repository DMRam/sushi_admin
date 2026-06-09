import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { CalendarDays, Clock, Gift, PartyPopper, Sparkles, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HashLink } from 'react-router-hash-link'
import { db } from '../../../firebase/firebase'

type PublishedEventPackage = {
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

export function LandingEvents() {
  const { t } = useTranslation()
  const [packages, setPackages] = useState<PublishedEventPackage[]>([])
  const [loading, setLoading] = useState(true)
  const previewFormats = useMemo(
    () => [
      {
        icon: PartyPopper,
        title: t('landing.events.preview.birthdays.title', 'Birthdays & private parties'),
        copy: t(
          'landing.events.preview.birthdays.copy',
          'Sushi trays, shared tables, and family celebrations are being organized into clear packages.',
        ),
      },
      {
        icon: UsersRound,
        title: t('landing.events.preview.office.title', 'Office and team orders'),
        copy: t(
          'landing.events.preview.office.copy',
          'Group trays for offices, schools, sports teams, and staff meals will be easier to request soon.',
        ),
      },
      {
        icon: Gift,
        title: t('landing.events.preview.addons.title', 'Special add-ons'),
        copy: t(
          'landing.events.preview.addons.copy',
          'Premium rolls, sushi boats, desserts, drinks, and gift-card options are being reviewed.',
        ),
      },
    ],
    [t],
  )

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'eventPackages'), where('status', '==', 'published')),
      (snapshot) => {
        const next: PublishedEventPackage[] = snapshot.docs
          .map((item) => {
            const data = item.data() as Partial<PublishedEventPackage>
            const status: PublishedEventPackage['status'] = data.status === 'published' ? 'published' : 'draft'
            return {
              id: item.id,
              title: data.title || '',
              summary: data.summary || '',
              description: data.description || '',
              startingPrice: data.startingPrice || '',
              guestRange: data.guestRange || '',
              packageType: data.packageType || 'Event',
              imageUrl: data.imageUrl || '',
              status,
              sortOrder: Number(data.sortOrder || 10),
            }
          })
          .filter((item) => item.title && item.summary)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        setPackages(next)
        setLoading(false)
      },
      (error) => {
        console.error('Unable to load event packages', error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const hasPublishedPackages = packages.length > 0
  const visiblePackages = useMemo(() => packages.slice(0, 6), [packages])

  return (
    <section id="events" className="relative overflow-hidden border-t border-white/10 bg-[#080808] py-16">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-[-12%] top-[-20%] h-[420px] w-[420px] rounded-full bg-[#f26350]/16 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-24%] h-[460px] w-[460px] rounded-full bg-white/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.32em] text-[#f26350]">
              {t('landing.events.eyebrow', 'Events')}
            </div>
            <h2 className="max-w-2xl text-3xl font-light uppercase tracking-[0.1em] text-white sm:text-4xl">
              {hasPublishedPackages
                ? t('landing.events.publishedTitle', 'Plan something fresh with MaiSushi.')
                : t('landing.events.draftTitle', 'Event packages are being prepared.')}
            </h2>
            <p className="mt-5 max-w-xl text-base font-light leading-7 text-white/62">
              {hasPublishedPackages
                ? t(
                    'landing.events.publishedCopy',
                    'Birthdays, office trays, private groups, karaoke nights, and special sushi formats can be requested directly from the restaurant.',
                  )
                : t(
                    'landing.events.draftCopy',
                    'MaiSushi is preparing clearer options for birthdays, office trays, private groups, and special sushi nights. This section updates from the restaurant dashboard once packages are published.',
                  )}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <HashLink
                to="/#contact"
                className="inline-flex items-center justify-center bg-[#f26350] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_rgba(242,99,80,0.28)] transition hover:bg-[#ff725f]"
              >
                {t('landing.events.askCta', 'Ask about an event')}
              </HashLink>
              <a
                href="tel:+18198613889"
                className="inline-flex items-center justify-center border border-white/14 px-6 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white/82 transition hover:border-[#f26350] hover:text-white"
              >
                {t('landing.events.callCta', 'Call MaiSushi')}
              </a>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center border border-white/10 bg-[#0e0e0e] text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
                {t('landing.events.loading', 'Loading events')}
              </div>
            ) : hasPublishedPackages ? (
              <div className="grid gap-3 md:grid-cols-2">
                {visiblePackages.map((item) => (
                  <article key={item.id} className="overflow-hidden border border-white/10 bg-[#0e0e0e]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-44 w-full object-cover" />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-[#160d0b] text-[#f26350]">
                        <PartyPopper className="h-10 w-10" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em]">
                        <span className="border border-[#f26350]/35 bg-[#f26350]/10 px-2 py-1 text-[#ffad9f]">
                          {item.packageType}
                        </span>
                        {item.guestRange && <span className="border border-white/10 px-2 py-1 text-white/55">{item.guestRange}</span>}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm font-light leading-6 text-white/58">{item.summary}</p>
                      {item.startingPrice && <p className="mt-4 text-sm font-semibold text-[#ffad9f]">{item.startingPrice}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 border border-[#f26350]/25 bg-[#160d0b] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center bg-[#f26350] text-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffad9f]">
                        {t('landing.events.comingSoon', 'Coming soon')}
                      </div>
                      <div className="mt-1 text-xl font-semibold text-white">
                        {t('landing.events.updateInProgress', 'Event menu update in progress')}
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 border border-white/10 bg-black/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                    <Sparkles className="h-4 w-4 text-[#f26350]" />
                    {t('landing.events.dashboardReady', 'Dashboard ready')}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {previewFormats.map((item) => {
                    const Icon = item.icon
                    return (
                      <article key={item.title} className="border border-white/10 bg-[#0e0e0e] p-4">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center border border-[#f26350]/35 bg-[#f26350]/10 text-[#f26350]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm font-light leading-6 text-white/58">{item.copy}</p>
                      </article>
                    )
                  })}
                </div>

                <div className="mt-3 grid gap-3 border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                  <MiniStep icon={CalendarDays} title={t('landing.events.steps.dates.title', '1. Dates')} copy={t('landing.events.steps.dates.copy', 'Availability will be confirmed.')} />
                  <MiniStep icon={UsersRound} title={t('landing.events.steps.guests.title', '2. Guests')} copy={t('landing.events.steps.guests.copy', 'Package sizes are being defined.')} />
                  <MiniStep icon={PartyPopper} title={t('landing.events.steps.formats.title', '3. Formats')} copy={t('landing.events.steps.formats.copy', 'Birthdays, offices, and private nights.')} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStep({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof CalendarDays
  title: string
  copy: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#f26350]" />
      <div>
        <div className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">{title}</div>
        <div className="mt-1 text-sm font-light text-white/58">{copy}</div>
      </div>
    </div>
  )
}

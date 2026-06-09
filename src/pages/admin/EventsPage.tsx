import { CalendarDays, ClipboardList, Mail, Mic2, PartyPopper, Phone, UsersRound } from 'lucide-react'

const packages = [
  {
    title: 'Sushi Island',
    detail: 'Shareable sushi station with rolls, trays, sauces, and optional premium upgrades.',
    status: 'Draft package',
  },
  {
    title: '15th birthday party',
    detail: 'Teen birthday format with sushi platters, drinks, dessert add-ons, and optional karaoke.',
    status: 'Good revenue fit',
  },
  {
    title: 'Office & team trays',
    detail: 'Lunch trays for offices, schools, sports teams, staff meals, and business meetings.',
    status: 'Needs pricing',
  },
  {
    title: 'Karaoke + sushi',
    detail: 'Casual event format combining food, table service, and karaoke.',
    status: 'Concept',
  },
  {
    title: 'Premium add-ons',
    detail: 'Upsells such as sushi boats, mocktails, dessert trays, gift cards, and premium rolls.',
    status: 'High margin',
  },
  {
    title: 'Private sushi night',
    detail: 'Fixed-menu private experience for families, small companies, and friends.',
    status: 'Package idea',
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

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <div className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Events command center
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Events
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Keep 15th birthday parties, sushi island requests, office trays, private groups, and karaoke ideas separate from normal table bookings.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
              <Metric icon={PartyPopper} label="Packages" value="6" />
              <Metric icon={UsersRound} label="Best leads" value="Parties" />
              <Metric icon={ClipboardList} label="Status" value="Draft" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Offer menu</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Event formats to refine</h2>
              </div>
              <span className="bg-[#f26350]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#b63b2f]">
                Partial setup
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((item) => (
                <article key={item.title} className="border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center bg-white text-[#f26350] ring-1 ring-slate-200">
                    {item.title.includes('Karaoke') ? <Mic2 className="h-5 w-5" /> : <PartyPopper className="h-5 w-5" />}
                  </div>
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                  <div className="mt-4 inline-flex bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-slate-200">
                    {item.status}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intake checklist</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">What staff should collect</h2>
            <div className="mt-4 space-y-2">
              {intakeFields.map((field) => (
                <div key={field} className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <ClipboardList className="h-4 w-4 text-[#f26350]" />
                  <span className="text-sm font-medium text-slate-700">{field}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ActionCard icon={Mail} title="Website flow" copy="Events currently come through the contact form with event type, party size, and notes." />
          <ActionCard icon={Phone} title="Phone flow" copy="For now, staff can create the follow-up manually after a customer calls." />
          <ActionCard icon={CalendarDays} title="Next build" copy="Add persistent event requests, pricing, deposits, and a calendar once the packages are finalized." />
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

function ActionCard({ icon: Icon, title, copy }: { icon: typeof Mail; title: string; copy: string }) {
  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-[#f26350]" />
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
    </article>
  )
}

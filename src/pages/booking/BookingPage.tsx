import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react';
import { LandingHeader } from '../landing/components/LandingHeader';
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter';
import { supabase } from '../../lib/supabase';

const today = new Date().toISOString().slice(0, 10);
const NOTIFY_BOOKING_URL =
  'https://us-central1-sushi-admin.cloudfunctions.net/notifyBookingCreated';
const DUPLICATE_BOOKING_CODE = '23505';

const BOOKING_HOURS: Record<number, { open: string; close: string; label: string }> = {
  2: { open: '12:00', close: '20:00', label: '12:00 PM - 8:00 PM' },
  3: { open: '12:00', close: '20:00', label: '12:00 PM - 8:00 PM' },
  4: { open: '12:00', close: '21:00', label: '12:00 PM - 9:00 PM' },
  5: { open: '12:00', close: '22:00', label: '12:00 PM - 10:00 PM' },
  6: { open: '12:00', close: '22:00', label: '12:00 PM - 10:00 PM' },
};

function getDayFromDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getBookingHours(date: string) {
  return BOOKING_HOURS[getDayFromDateInput(date)] || null;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function BookingPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    date: today,
    time: '18:30',
    partySize: '2',
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const selectedHours = getBookingHours(form.date);
  const hoursLabel = selectedHours?.label || t('bookingPage.closedDay', 'Closed for reservations');

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => {
      if (key === 'date') {
        const nextHours = getBookingHours(value);
        const nextTime = nextHours && !isTimeWithinHours(value, current.time)
          ? nextHours.open
          : current.time;

        return { ...current, date: value, time: nextTime };
      }

      return { ...current, [key]: value };
    });
  };

  const isTimeWithinHours = (date: string, time: string) => {
    const hours = getBookingHours(date);
    if (!hours) return false;

    const selected = timeToMinutes(time);
    return selected >= timeToMinutes(hours.open) && selected < timeToMinutes(hours.close);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    if (!isTimeWithinHours(form.date, form.time)) {
      setStatus('error');
      setMessage(
        selectedHours
          ? t('bookingPage.hoursError', {
            hours: selectedHours.label,
            defaultValue: 'Please choose a time during restaurant hours: {{hours}}.',
          })
          : t('bookingPage.closedDayError', 'We are closed on this date. Please choose Tuesday to Saturday.'),
      );
      return;
    }

    const startsAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const booking = {
      id: crypto.randomUUID(),
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      starts_at: startsAt,
      party_size: Number(form.partySize) || 2,
      notes: form.notes.trim(),
      status: 'requested',
      source: 'website',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('bookings').insert(booking);
    if (error) {
      console.error('Booking request failed', error);
      setStatus('error');
      const isDuplicate =
        error.code === DUPLICATE_BOOKING_CODE ||
        error.message?.toLowerCase().includes('duplicate key');

      setMessage(
        isDuplicate
          ? t(
            'bookingPage.duplicateMessage',
            'You already have a reservation request for this same date and time. Please call us if you need to change it.',
          )
          : t('bookingPage.errorMessage'),
      );
      return;
    }

    fetch(NOTIFY_BOOKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking }),
    }).catch((notifyError) => {
      console.warn('Booking notification failed', notifyError);
    });

    setStatus('success');
    setMessage(t('bookingPage.successMessage'));
    setForm((current) => ({ ...current, name: '', phone: '', email: '', notes: '' }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-36 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/68">
            <CalendarDays className="h-4 w-4 text-[#f26350]" />
            {t('bookingPage.eyebrow')}
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t('bookingPage.title')}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/62">
            {t('bookingPage.subtitle')}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <InfoTile icon={<Clock className="h-5 w-5" />} label={t('bookingPage.info.dinner')} value={t('bookingPage.info.dinnerValue')} />
            <InfoTile icon={<Users className="h-5 w-5" />} label={t('bookingPage.info.groups')} value={t('bookingPage.info.groupsValue')} />
            <InfoTile icon={<CheckCircle2 className="h-5 w-5" />} label={t('bookingPage.info.status')} value={t('bookingPage.info.statusValue')} />
          </div>
        </section>

        <form onSubmit={submit} className="rounded-[4px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('bookingPage.form.name')} value={form.name} onChange={(value) => update('name', value)} required />
            <Field label={t('bookingPage.form.phone')} value={form.phone} onChange={(value) => update('phone', value)} required />
            <Field label={t('bookingPage.form.email')} value={form.email} onChange={(value) => update('email', value)} type="email" />
            <Field label={t('bookingPage.form.partySize')} value={form.partySize} onChange={(value) => update('partySize', value)} type="number" min="1" />
            <Field label={t('bookingPage.form.date')} value={form.date} onChange={(value) => update('date', value)} type="date" min={today} required />
            <Field
              label={t('bookingPage.form.time')}
              value={form.time}
              onChange={(value) => update('time', value)}
              type="time"
              min={selectedHours?.open}
              max={selectedHours?.close}
              required
            />
          </div>
          <div className="mt-3 rounded-[4px] border border-white/10 bg-white/[0.04] p-3 text-sm text-white/62">
            {selectedHours
              ? t('bookingPage.selectedHours', {
                hours: hoursLabel,
                defaultValue: 'Available booking times for this date: {{hours}}.',
              })
              : t('bookingPage.closedDay', 'Closed for reservations')}
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-white/62">{t('bookingPage.form.notes')}</span>
            <textarea
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              rows={4}
              className="w-full rounded-[4px] border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#f26350]"
              placeholder={t('bookingPage.form.notesPlaceholder')}
            />
          </label>
          <button
            disabled={status === 'saving'}
            className="mt-6 w-full rounded-[4px] bg-[#f26350] px-5 py-4 font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#ff725f] disabled:cursor-wait disabled:opacity-60"
          >
            {status === 'saving' ? t('bookingPage.form.sending') : t('bookingPage.form.submit')}
          </button>
          {message && (
            <p className={`mt-4 rounded-[4px] p-3 text-sm ${status === 'success' ? 'bg-emerald-500/12 text-emerald-200' : 'bg-red-500/12 text-red-200'}`}>
              {message}
            </p>
          )}
        </form>
      </main>
      <LandingCTAFooter displaySimple={false} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-white/62">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        max={max}
        className="w-full rounded-[4px] border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#f26350]"
      />
    </label>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 text-[#f26350]">{icon}</div>
      <div className="text-xs uppercase tracking-[0.1em] text-white/38">{label}</div>
      <div className="mt-1 font-bold text-white">{value}</div>
    </div>
  );
}

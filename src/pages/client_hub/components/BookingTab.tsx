import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, MessageSquareText } from "lucide-react";

import { supabase } from "../../../lib/supabase";
import type { ClientProfile } from "../../../types/types";

const today = new Date().toISOString().slice(0, 10);
const NOTIFY_BOOKING_URL = "https://us-central1-sushi-admin.cloudfunctions.net/notifyBookingCreated";

const BOOKING_HOURS: Record<number, { open: string; close: string; label: string }> = {
  2: { open: "12:00", close: "20:00", label: "12:00 PM - 8:00 PM" },
  3: { open: "12:00", close: "20:00", label: "12:00 PM - 8:00 PM" },
  4: { open: "12:00", close: "21:00", label: "12:00 PM - 9:00 PM" },
  5: { open: "12:00", close: "22:00", label: "12:00 PM - 10:00 PM" },
  6: { open: "12:00", close: "22:00", label: "12:00 PM - 10:00 PM" },
};

function getDayFromDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getBookingHours(date: string) {
  return BOOKING_HOURS[getDayFromDateInput(date)] || null;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isTimeWithinHours(date: string, time: string) {
  const hours = getBookingHours(date);
  if (!hours) return false;

  const selected = timeToMinutes(time);
  return selected >= timeToMinutes(hours.open) && selected < timeToMinutes(hours.close);
}

type BookingTabProps = {
  clientProfile: ClientProfile;
};

export function BookingTab({ clientProfile }: BookingTabProps) {
  const initialName = clientProfile.full_name || [clientProfile.first_name, clientProfile.last_name].filter(Boolean).join(" ");
  const [form, setForm] = useState({
    name: initialName,
    phone: clientProfile.phone || "",
    email: clientProfile.email || "",
    date: today,
    time: "18:30",
    partySize: "2",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const selectedHours = getBookingHours(form.date);
  const canSubmit = useMemo(() => {
    return form.name.trim().length >= 2 && form.phone.trim().length >= 7 && isTimeWithinHours(form.date, form.time);
  }, [form.date, form.name, form.phone, form.time]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => {
      if (key === "date") {
        const nextHours = getBookingHours(value);
        const nextTime = nextHours && !isTimeWithinHours(value, current.time)
          ? nextHours.open
          : current.time;

        return { ...current, date: value, time: nextTime };
      }

      return { ...current, [key]: value };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    if (!isTimeWithinHours(form.date, form.time)) {
      setStatus("error");
      setMessage(selectedHours ? `Please choose a time during restaurant hours: ${selectedHours.label}.` : "We are closed on this date. Please choose Tuesday to Saturday.");
      return;
    }

    const startsAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const booking = {
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      starts_at: startsAt,
      party_size: Number(form.partySize) || 2,
      notes: [
        form.notes.trim(),
        `Client dashboard booking${clientProfile.id ? ` - client ${clientProfile.id}` : ""}`,
      ].filter(Boolean).join("\n"),
      status: "requested",
      source: "website",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("bookings").insert(booking);

    if (error) {
      console.error("Client booking request failed", error);
      setStatus("error");
      setMessage("We could not send the booking request. Please try again or call the restaurant.");
      return;
    }

    fetch(NOTIFY_BOOKING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking }),
    }).catch((notifyError) => {
      console.warn("Booking notification failed", notifyError);
    });

    setStatus("success");
    setMessage("Booking request sent. We will confirm your reservation shortly.");
    setForm((current) => ({ ...current, notes: "" }));
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-white/10 bg-[#0B0B0B] p-5">
          <div className="inline-flex h-12 w-12 items-center justify-center bg-[#F45D4F]/14 text-[#F45D4F]">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">Book a table</h2>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Send a reservation request from your MaiSushi account. Your contact details are filled from your profile.
          </p>

          <div className="mt-6 grid gap-3">
            <InfoRow icon={Clock} label="Tue - Wed" value="12 PM - 8 PM" />
            <InfoRow icon={Clock} label="Thu" value="12 PM - 9 PM" />
            <InfoRow icon={Clock} label="Fri - Sat" value="12 PM - 10 PM" />
            <InfoRow icon={CheckCircle2} label="Status" value="Confirmed by staff" />
          </div>
        </div>

        <form onSubmit={submit} className="border border-white/10 bg-[#0B0B0B] p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={form.name} onChange={(value) => update("name", value)} required />
            <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} required />
            <Field label="Email" value={form.email} onChange={(value) => update("email", value)} type="email" />
            <Field label="Guests" value={form.partySize} onChange={(value) => update("partySize", value)} type="number" min="1" max="30" />
            <Field label="Date" value={form.date} onChange={(value) => update("date", value)} type="date" min={today} required />
            <Field
              label="Time"
              value={form.time}
              onChange={(value) => update("time", value)}
              type="time"
              min={selectedHours?.open}
              max={selectedHours?.close}
              required
            />
          </div>

          <div className="mt-4 border border-white/10 bg-white/[0.035] p-3 text-sm text-white/58">
            {selectedHours ? `Available booking times for this date: ${selectedHours.label}.` : "Closed for reservations on this date."}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/48">
              <MessageSquareText className="h-4 w-4 text-[#F45D4F]" />
              Notes
            </span>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={4}
              placeholder="High chair, birthday, preferred table..."
              className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#F45D4F]"
            />
          </label>

          <button
            disabled={status === "saving" || !canSubmit}
            className="mt-5 w-full bg-[#F45D4F] px-5 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#de4f43] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            type="submit"
          >
            {status === "saving" ? "Sending request" : "Request booking"}
          </button>

          {message && (
            <p className={`mt-4 border p-3 text-sm ${status === "success" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-400/10 text-red-100"}`}>
              {message}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
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
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/48">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        max={max}
        className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#F45D4F]"
      />
    </label>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border border-white/10 bg-white/[0.035] p-3">
      <span className="inline-flex items-center gap-2 text-sm text-white/50">
        <Icon className="h-4 w-4 text-[#F45D4F]" />
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

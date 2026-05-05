// Check if store is open AND get next opening time
export function getStoreStatus(now: Date = new Date()) {
  const day = now.getDay(); // 0 = Sunday

  const hours = {
    2: { open: 12, close: 21 }, // Tue
    3: { open: 12, close: 21 }, // Wed
    4: { open: 12, close: 21 }, // Thu
    5: { open: 12, close: 22 }, // Fri
    6: { open: 12, close: 22 }, // Sat
  } as Record<number, { open: number; close: number }>;

  const today = hours[day];
  const currentHour = now.getHours();

  // If today has no schedule → closed
  if (!today) {
    return {
      isOpen: false,
      nextOpening: getNextOpeningDay(now, hours),
    };
  }

  // If open
  if (currentHour >= today.open && currentHour < today.close) {
    return {
      isOpen: true,
      nextOpening: null,
    };
  }

  // If before opening today
  if (currentHour < today.open) {
    const next = new Date(now);
    next.setHours(today.open, 0, 0, 0);

    return {
      isOpen: false,
      nextOpening: next,
    };
  }

  // After closing → find next day
  return {
    isOpen: false,
    nextOpening: getNextOpeningDay(now, hours),
  };
}

// Helper to find next open day
function getNextOpeningDay(
  now: Date,
  hours: Record<number, { open: number; close: number }>
) {
  for (let i = 1; i <= 7; i++) {
    const nextDay = (now.getDay() + i) % 7;
    const schedule = hours[nextDay];

    if (schedule) {
      const next = new Date(now);
      next.setDate(now.getDate() + i);
      next.setHours(schedule.open, 0, 0, 0);
      return next;
    }
  }

  return null;
}
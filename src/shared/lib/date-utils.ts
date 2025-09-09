function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function addSecs(date: Date, secs: number): Date {
  return addMs(date, secs * 1000);
}

function addMins(date: Date, mins: number): Date {
  return addMs(date, mins * 60 * 1000);
}

function addHours(date: Date, hours: number): Date {
  return addMs(date, hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return addMs(date, days * 24 * 60 * 60 * 1000);
}

export { addMs, addSecs, addMins, addHours, addDays };

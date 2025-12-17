// ScheduledTimePicker.tsx
"use client";

type ScheduledTimePickerProps = {
  value: string;
  onChange: (val: string) => void;
};

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function formatNiceDateLabel(value: string | null) {
  if (!value) return "Time TBD";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Time TBD";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ScheduledTimePicker({
  value,
  onChange,
}: ScheduledTimePickerProps) {
  const applyPresetMinutes = (minutesFromNow: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutesFromNow, 0, 0);
    onChange(toLocalInputValue(date));
  };

  const applyTonight = () => {
    const date = new Date();
    date.setHours(20, 0, 0, 0);
    if (date.getTime() < Date.now()) {
      date.setDate(date.getDate() + 1);
    }
    onChange(toLocalInputValue(date));
  };

  const applyTomorrowEvening = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(19, 0, 0, 0);
    onChange(toLocalInputValue(date));
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wide text-slate-400">
        Scheduled Time
      </label>

      <div className="flex flex-wrap gap-2 mb-1">
        <button
          type="button"
          onClick={() => applyPresetMinutes(30)}
          className="text-[11px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
        >
          In 30 min
        </button>
        <button
          type="button"
          onClick={() => applyPresetMinutes(60)}
          className="text-[11px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
        >
          In 1 hour
        </button>
        <button
          type="button"
          onClick={applyTonight}
          className="text-[11px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
        >
          Tonight
        </button>
        <button
          type="button"
          onClick={applyTomorrowEvening}
          className="text-[11px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
        >
          Tomorrow evening
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] px-2 py-1 rounded-full bg-slate-900 border border-slate-600 hover:bg-slate-800"
        >
          Time TBD
        </button>
      </div>

      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
      />

      <p className="text-[10px] text-slate-500">
        {value
          ? `Scheduled for ${formatNiceDateLabel(value)}`
          : "No exact time set yet (TBD)."}
      </p>
    </div>
  );
}
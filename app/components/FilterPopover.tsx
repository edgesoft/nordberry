import React, { useState, useEffect, useCallback } from "react";
import { useFetcher, useRouteLoaderData } from "@remix-run/react";
import { useLocation } from "react-router-dom";
import OptionToggleDark from "./OptionToggleDark";
import { FilterStatusKey, Statuses } from "~/types/filterStatusTypes";
import { ringColors } from "~/utils/colors";

const STATUS_OPTIONS: {
  key: FilterStatusKey;
  label: string;
}[] = [
  { key: FilterStatusKey.Pending, label: "Pending" },
  { key: FilterStatusKey.Working, label: "Working" },
  { key: FilterStatusKey.Done, label: "Done" },
];

const DEFAULT_STATUSES: Statuses = {
  [FilterStatusKey.Pending]: true,
  [FilterStatusKey.Working]: true,
  [FilterStatusKey.Done]: true,
};

interface FilterPopoverProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  initialStatuses: Statuses;
}

interface OptionToggleDarkProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function OptionToggleDark({
  status,
  selected,
  onToggle,
}: OptionToggleDarkProps) {
  const dotColor = ringColors[status] || "bg-zinc-600";
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900
        text-xs font-medium text-zinc-300 min-w-[8rem] hover:border-zinc-500 transition"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span>{status}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={selected}
        onClick={onToggle}
        className={`
        relative inline-flex h-4 w-8 items-center rounded-full
        transition-colors duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0
        ${selected ? "bg-emerald-600" : "bg-zinc-700"}
      `}
      >
        <span
          className={`
          inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
          ${selected ? "translate-x-4.5" : "translate-x-1"}
        `}
        />
      </button>
    </div>
  );
}

export default function FilterPopover({
  isOpen,
  onClose,
  onOpen,
}: FilterPopoverProps) {
  const fetcher = useFetcher();
  const location = useLocation();

  const { statuses: initialStatuses } = useRouteLoaderData<{
    statuses: Statuses;
  }>("root");

  const [statuses, setStatuses] = useState<Statuses>(initialStatuses);

  const submit = useCallback(
    (newStatuses: Statuses) => {
      const form = new FormData();
      for (const key of Object.values(FilterStatusKey)) {
        form.set(key, String(newStatuses[key]));
      }
      fetcher.submit(form, {
        method: "post",
        action: "/api/filters",
      });
    },
    [fetcher]
  );

  useEffect(() => {
    if (fetcher.type === "done" && fetcher.data?.ok) {
      fetcher.load(location.pathname + location.search);
    }
  }, [fetcher, location]);

  const toggle = (key: FilterStatusKey) => {
    const next = { ...statuses, [key]: !statuses[key] };
    if (Object.values(next).every((v) => !v)) return;
    setStatuses(next);
    submit(next);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="absolute right-0 top-full mt-2.5 w-100
          rounded-lg border border-zinc-700
          bg-gradient-to-b from-zinc-900/90 to-black/80
          shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.6)]
          z-50 overflow-hidden"
      >
        <div className="px-2 pt-4 pb-3 border-b border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">
            Filter status
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2 px-2 py-4">
          {STATUS_OPTIONS.map(({ key, label }) => (
            <OptionToggleDark
              key={key}
              status={key}
              selected={statuses[key]}
              onToggle={() => toggle(key)}
            >
              {label}
            </OptionToggleDark>
          ))}
        </div>
        {fetcher.data?.error && (
          <p className="px-2 py-1 text-red-400 text-xs">{fetcher.data.error}</p>
        )}
      </div>
    </>
  );
}

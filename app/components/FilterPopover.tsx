import React, { useState, useEffect, useCallback } from "react";
import { useFetcher, useRouteLoaderData } from "@remix-run/react";
import { useLocation, useNavigate } from "react-router-dom";
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
  onClose: () => void;
  onOpen: () => void;
  triggerSearch?: () => void;
}

interface OptionToggleDarkProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  status: FilterStatusKey;
}

function OptionToggleDark({ status, selected, onToggle }: OptionToggleDarkProps) {
  const dotColor = ringColors[status] || "bg-zinc-600";
  return (
    <div
      className="flex items-center justify-between w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-200 hover:border-zinc-500 transition"
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

export default function FilterPopover({ isOpen, onClose, onOpen, triggerSearch }: FilterPopoverProps) {
  const fetcher = useFetcher();
  const location = useLocation();
  const navigate = useNavigate();

  const { statuses: initialStatuses, dbUser } =
    useRouteLoaderData<any>("root") || {};

  const [statuses, setStatuses] = useState<Statuses>(initialStatuses ?? DEFAULT_STATUSES);

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
    <div className="fixed inset-x-2 top-[4rem] mx-auto max-w-3xl rounded-md shadow-xl bg-zinc-900 border border-zinc-900 z-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md shadow-xl bg-zinc-900 border border-zinc-700 overflow-hidden">
        <div className="p-4">
          <h4 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase mb-2">
            Filter status
          </h4>
          <div className="space-y-2">
            {STATUS_OPTIONS.map(({ key, label }) => (
              <OptionToggleDark
                key={key}
                status={key}
                selected={statuses[key]}
                onToggle={() => toggle(key)}
                label={label}
              />
            ))}
          </div>
        </div>

        {dbUser?.role === "admin" && (
          <div className="p-4 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-700">
            <h4 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase mb-2">
              Profil
            </h4>
            <button
              onClick={() => {
                onClose()
                navigate("/admin/users")}
              }
              className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-800 transition text-left"
            >
              <div className="p-2 rounded-md bg-zinc-900 border border-zinc-700">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="flex flex-col text-sm text-white">
                <span className="font-medium">Användare</span>
                <span className="text-gray-400 text-xs">Hantera användare och roller</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

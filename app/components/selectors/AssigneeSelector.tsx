import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { createPortal } from "react-dom";

export function AssigneeSelector({
  selected,
  onChange,
}: {
  selected: Assignee[];
  onChange: (u: Assignee[]) => void;
}) {
  const { activeUsers } = useLoaderData<typeof loader>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SimpleUser[]>([]);
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [inputRect, setInputRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  /* --- sök bland användare --- */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = activeUsers.filter((u) => {
      const match =
        u.name?.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower);
      const already = selected.some((s) => s.id === u.id);
      return match && !already;
    });
    const to = setTimeout(() => setResults(filtered), 200);
    return () => clearTimeout(to);
  }, [query, selected, activeUsers]);

  /* --- positionera dropdown --- */
  useEffect(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setInputRect({
        top: r.bottom + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
      });
    }
  }, [results]);

  /* --- click outside stänger --- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (u: SimpleUser) => {
    onChange([...selected, { ...u, role: "worker" }]);
    setQuery("");
  };
  const remove = (idx: number) => {
    const upd = [...selected];
    upd.splice(idx, 1);
    onChange(upd);
  };
  const setRole = (idx: number, role: "worker" | "approver") => {
    const upd = [...selected];
    upd[idx].role = role;
    onChange(upd);
    setDropdownIndex(null);
  };

  return (
    <div className="space-y-2 relative w-full">
      <label className="text-sm text-gray-300">Ansvariga</label>
      <div className="bg-zinc-900 border border-gray-700 rounded-md p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((u, idx) => (
            <div
              key={u.id}
              className="flex items-center gap-2 bg-zinc-800 border border-gray-600 rounded-md px-3 py-1 relative"
            >
              <span className="text-sm text-white whitespace-nowrap">
                {u.name}
              </span>
              <div className="relative">
                <button
                  onClick={() =>
                    setDropdownIndex(dropdownIndex === idx ? null : idx)
                  }
                  className="text-xs bg-black text-white rounded px-2 py-0.5"
                >
                  {u.role}
                </button>
                {dropdownIndex === idx && (
                  <div className="absolute left-0 top-full mt-1 w-24 rounded-md bg-zinc-900 border border-gray-700 z-50">
                    <ul className="text-xs text-white">
                      <li
                        className="px-3 py-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => setRole(idx, "worker")}
                      >
                        worker
                      </li>
                      <li
                        className="px-3 py-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => setRole(idx, "approver")}
                      >
                        approver
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(idx)}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök efter person..."
          className="w-full bg-zinc-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {results.length > 0 &&
        inputRect &&
        createPortal(
          <ul
            ref={dropdownRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-gray-700 mt-1 rounded-md z-[9999] shadow-lg"
            style={{
              position: "absolute",
              top: inputRect.top,
              left: inputRect.left,
              width: inputRect.width,
            }}
          >
            {results.map((r) => (
              <li
                key={r.id}
                onClick={() => add(r)}
                className="px-3 py-2 text-sm text-white hover:bg-zinc-800 cursor-pointer"
              >
                {r.name}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}

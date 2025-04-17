import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Dependency, Step } from "~/components/chainTypes";
import { ringColors } from "~/utils/colors";

type Props = {
  selected: Dependency[];
  onChange: (deps: Dependency[]) => void;
  localSteps?: Step[];
  dropdownRef: React.RefObject<HTMLDivElement>;
  targetStatus: "pending" | "working" | "done";
};

export function DependencySelector({
  selected,
  onChange,
  localSteps = [],
  dropdownRef,
  targetStatus,
}: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [results, setResults] = useState<any[]>([]);

  const allowOnlyDone = targetStatus !== "pending";

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(query)}`);
      const backend = await res.json();

      const lower = query.toLowerCase();
      const local = localSteps
        .filter(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            s.chainName?.toLowerCase().includes(lower)
        )
        .map((s) => ({ ...s, chain: { name: s.chainName ?? "" } }));

      const merged = [...local, ...backend.tasks]
        .filter((s) => !selected.find((d) => d.id === s.id))
        .filter((s) => !(allowOnlyDone && s.status !== "done")); // <- enda logik‑tillägget

      const grouped = merged.reduce((acc: any[], t: any) => {
        const name = t.chain?.name ?? "Okänt flöde";
        const g = acc.find((x) => x.name === name);
        g ? g.steps.push(t) : acc.push({ name, steps: [t] });
        return acc;
      }, []);

      setResults(grouped);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
        zIndex: 9999,
      });
    }
  }, [results]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const add = (step: any, chainName: string) => {
    onChange([...selected, { ...step, chainName }]);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const remove = (id: string) => onChange(selected.filter((d) => d.id !== id));

  /* ---------- UI ---------- */
  return (
    <div className="space-y-2 w-full">
      <label className="text-sm text-gray-300">Beroenden</label>
      <div className="bg-zinc-900 border border-gray-700 rounded-md p-3 relative">
        {/* taggar */}
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((dep) => (
            <span
              key={dep.id}
              className="flex items-center gap-2 bg-zinc-800 border border-gray-600 rounded-md px-3 py-1 text-xs text-white"
            >
              <span
                className={`w-2 h-2 rounded-md ${
                  ringColors[dep.status]
                } border border-gray-700`}
              />
              {dep.chainName && (
                <>
                  <span className="font-semibold text-gray-300">
                    {dep.chainName}
                  </span>
                  <span className="text-gray-400">/</span>
                </>
              )}
              <span>{dep.title}</span>
              <button
                onClick={() => remove(dep.id)}
                className="text-gray-400 hover:text-white ml-1"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {/* input */}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök steg eller ID..."
          className="w-full bg-zinc-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {/* dropdown */}
      {isOpen &&
        results.length > 0 &&
        createPortal(
          <div
            onMouseDown={(e) => e.stopPropagation()}
            ref={dropdownRef}
            style={dropdownStyle}
            className="rounded-md bg-zinc-900 border border-gray-700 shadow-lg max-h-64 overflow-auto"
          >
            {results.map((c: any) => (
              <div key={c.name} className="p-2 border-b border-gray-800">
                <div className="text-sm text-white font-semibold mb-1">
                  {c.name}
                </div>
                <ul className="space-y-1">
                  {c.steps.map((s: any) => {
                    const disabled = allowOnlyDone && s.status !== "done";

                    return (
                    <li
                      key={s.id}
                      onClick={() => !disabled && add(s, c.name)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md
                                ${disabled
                                  ? "text-gray-500 cursor-not-allowed"
                                  : "text-white hover:bg-zinc-800 cursor-pointer"}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-md ${
                          ringColors[s.status]
                        } border border-gray-700`}
                      />
                      <span className="font-mono text-gray-400">
                        #{s.id.slice(0, 6)}
                      </span>
                      <span>{s.title}</span>
                    </li>
                  )})}
                </ul>
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

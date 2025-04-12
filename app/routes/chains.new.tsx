import { useEffect, useRef, useState } from "react";
import { useNavigate, useLoaderData } from "@remix-run/react";
import { createPortal } from "react-dom";
import { prisma } from "../utils/db.server";
import { json } from "@remix-run/node";
import { ringColors } from "../utils/colors";
import { LoaderFunctionArgs } from "@remix-run/router";
import toast from "react-hot-toast";
import Avatar from "~/components/avatar";

type CustomToastProps = {
  t: { id: string; visible: boolean };
  name: string;
  message: string;
  imageUrl?: string;
};

export function CustomToast({ t, name, message, imageUrl }: CustomToastProps) {
  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          <div className="text-orange-200 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M11 3a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0V3zm1 16a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center border-zinc-800 px-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export const loader = async (args: LoaderFunctionArgs) => {
  const activeUsers = await prisma.user.findMany({
    where: {
      status: "active",
    },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return json({ activeUsers });
};

type SimpleUser = {
  id: string;
  name: string | null;
  email: string;
  imageUrl?: string | null;
};

function AssigneeSelector({ selected, onChange }) {
  const { activeUsers } = useLoaderData<typeof loader>(); // Hämta datan här!
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SimpleUser[]>([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [inputRect, setInputRect] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filteredUsers = activeUsers.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(lowerQuery);
      const emailMatch = user.email.toLowerCase().includes(lowerQuery);
      const isSelected = selected.some(
        (sel) => sel.id === user.id || sel.name === user.name
      );
      return (nameMatch || emailMatch) && !isSelected;
    });

    // Ingen timeout behövs nödvändigtvis om listan inte är enorm,
    // men debounce är fortfarande bra för prestanda. Behåller den.
    const timeout = setTimeout(() => {
      setResults(filteredUsers);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, selected, activeUsers]);

  useEffect(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setInputRect({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [results]);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (user) => {
    onChange([...selected, { ...user, role: "worker" }]);
    setQuery("");
  };

  const remove = (index) => {
    const updated = [...selected];
    updated.splice(index, 1);
    onChange(updated);
  };

  const setRole = (index, role) => {
    const updated = [...selected];
    updated[index].role = role;
    onChange(updated);
    setDropdownIndex(null);
  };

  return (
    <div className="space-y-2 relative w-full">
      <label className="text-sm text-gray-300">Ansvariga</label>
      <div className="bg-zinc-900 border border-gray-700 rounded-md p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((user, idx) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-zinc-800 border border-gray-600 rounded-md px-3 py-1 relative"
            >
              <span className="text-sm text-white whitespace-nowrap">
                {user.name}
              </span>
              <div className="relative">
                <button
                  onClick={() =>
                    setDropdownIndex(dropdownIndex === idx ? null : idx)
                  }
                  className="text-xs bg-black text-white rounded px-2 py-0.5"
                >
                  {user.role}
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

export function DependencySelector({
  selected,
  onChange,
  localSteps = [],
  dropdownRef,
  dropdownMounted,
}: {
  selected: {
    id: string;
    title: string;
    status: string;
    chainName: string;
  }[];
  onChange: (deps: any[]) => void;
  localSteps?: any[];
  dropdownRef: React.RefObject<HTMLElement>;
  dropdownMounted: React.RefObject<HTMLElement>;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(query)}`);
      const backend = await res.json();

      const lower = query.toLowerCase();
      const local = localSteps
        .filter(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            s.chainName?.toLowerCase().includes(lower)
        )
        .map((s) => ({
          ...s,
          status: s.status ?? "pending",
          chain: { name: s.chainName ?? "" }, // viktigt!
        }));

      // Mixa backend + lokal, filtrera bort redan valda
      const merged = [...local, ...backend.tasks].filter(
        (step) => !selected.find((s) => s.id === step.id)
      );

      // Gruppera på chain.name
      const grouped = merged.reduce((acc, task) => {
        const chainName = task.chain?.name ?? "Okänt flöde";
        const group = acc.find((g) => g.name === chainName);
        if (group) {
          group.steps.push(task);
        } else {
          acc.push({ name: chainName, steps: [task] });
        }
        return acc;
      }, []);

      setResults(grouped);

      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addDependency = (
    step: { id: string; title: string; status: string },
    chainName: string
  ) => {
    if (!selected.find((s) => s.id === step.id)) {
      onChange([...selected, { ...step, chainName }]);
    }
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const removeDependency = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-2 w-full">
      <label className="text-sm text-gray-300">Beroenden</label>
      <div className="bg-zinc-900 border border-gray-700 rounded-md p-3 relative">
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((dep, i) => (
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
                onClick={() => removeDependency(dep.id)}
                className="text-gray-400 hover:text-white ml-1"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök steg eller ID..."
          className="w-full bg-zinc-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {isOpen &&
        results.length > 0 &&
        createPortal(
          <div
            onMouseDown={(e) => e.stopPropagation()}
            ref={(el) => {
              dropdownRef.current = el;
              if (el) {
                dropdownMounted.current = true; // detta kommer från props
              } else {
                dropdownMounted.current = false;
              }
            }}
            style={dropdownStyle}
            className="rounded-md bg-zinc-900 border border-gray-700 shadow-lg max-h-64 overflow-auto"
          >
            {results.map((chain, i) => {
              return (
                <div key={i} className="p-2 border-b border-gray-800">
                  <div className="text-sm text-white font-semibold mb-1">
                    {chain.name}
                  </div>
                  <ul className="space-y-1">
                    {chain.steps.map((step) => (
                      <li
                        key={step.id}
                        onClick={() => addDependency(step, chain.name)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-zinc-800 cursor-pointer rounded-md"
                      >
                        <span
                          className={`w-2 h-2 rounded-md ${
                            ringColors[step.status]
                          } border border-gray-700`}
                        />
                        <span className="font-mono text-gray-400">
                          #{`${step.id.slice(0, 6)}`}
                        </span>
                        <span>{step.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

const createLocalId = () => `${Math.random().toString(36).slice(2, 10)}`;

function StepList({ steps }) {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex justify-between items-center px-2 py-2 border border-gray-700 bg-zinc-900 rounded-md"
        >
          <div className="text-white text-sm w-full">
            <div className="flex justify-between">
              <div className="font-medium">{step.title}</div>
              <div className="flex gap-0.5">
                {step.assignees?.map((a) => (
                  <Avatar size={6} user={a}/>
                  
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              {step.dependencies?.map((dep, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-300 bg-zinc-800 rounded-md"
                >
                  <span
                    className={`w-2 h-2 rounded-md ${ringColors[dep.status]}`}
                  />
                  <span>
                    {dep.chainName ? `${dep.chainName}/` : ""}
                    {dep.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NewChainModal() {
  const navigate = useNavigate();
  const [chainName, setChainName] = useState("Nytt flöde");
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const [stepFlow, setStepFlow] = useState(1);
  const [stepList, setStepList] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const chainNameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dependencyDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMounted = useRef(false); // ⬅️ NY
  const stepTitleInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState({
    title: "",
    dependencies: [],
    assignees: [],
  });

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && navigate("/chains");
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [navigate]);

  /**
  useEffect(() => {
    const handler = (event: FocusEvent) => {
      const el = event.target as HTMLElement;

      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        // Ge tid för tangentbord att öppnas
        setTimeout(() => {
          el.scrollIntoView({
            block: "center",
          });
        }, 0); // funkar bäst med 300-500ms delay
      }
    };

    window.addEventListener("focusin", handler);
    return () => {
      window.removeEventListener("focusin", handler);
    };
  }, []);
   */

  const saveStep = () => {
    const hasApprover = currentStep.assignees.some(
      (a) => a.role === "approver"
    );

    if (!hasApprover) {
      if (navigator.vibrate) navigator.vibrate(10);
      toast.custom(
        (t) => (
          <CustomToast
            t={t}
            name="Skapa steg"
            message="Minst en approver krävs"
          />
        ),
        {
          duration: 2000
        }
      );
      return;
    }

    const localId = createLocalId();
    setStepList([...stepList, { ...currentStep, id: localId, local: true }]);
    setCurrentStep({ title: "", dependencies: [], assignees: [] });
    setStepFlow(1);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      const clickedInsideModal = modalRef.current?.contains(target);

      const clickedInsideDependencyDropdown =
        dependencyDropdownRef.current?.contains(target);

      const hasUnsavedWork =
        stepList.length > 0 ||
        currentStep.title.trim().length > 0 ||
        currentStep.dependencies.length > 0 ||
        currentStep.assignees.length > 0 ||
        hasTouchedName;

      if (
        !clickedInsideModal &&
        !clickedInsideDependencyDropdown &&
        !hasUnsavedWork
      ) {
        navigate("/chains");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navigate, hasTouchedName, currentStep.title ]);

  const saveChain = async () => {
    if (!hasTouchedName || !chainName.trim()) {
      if (navigator.vibrate) navigator.vibrate(10);
      toast.custom(
        (t) => (
          <CustomToast
            t={t}
            name="Spara flöde"
            message="Du måste skriva in ett namn för flödet."
          />
        ),
        {
          duration: 2000
        }
      );

      setEditingName(true); // så att input visas
      setTimeout(() => {
        chainNameInputRef.current?.focus();
      }, 0);

      return;
    }

    const res = await fetch("/api/chains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: chainName.trim(), steps: stepList }),
    });

    if (res.ok) {
      const data = await res.json();
      navigate(`/chain/${data.id}`);
    } else {
      alert("Något gick fel vid skapande.");
    }
    //navigate("/chains");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center sm:px-4">
      <div
        ref={modalRef}
        className="bg-[#121212] text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div
          className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a2a]"
          onClick={() => {
            setEditingName(true);
            setTimeout(() => {
              chainNameInputRef.current?.focus();
            }, 0);
          }}
        >
          {editingName ? (
            <input
              ref={chainNameInputRef}
              value={chainName}
              onChange={(e) => {
                setChainName(e.target.value);
                if (!hasTouchedName) setHasTouchedName(true);
              }}
              onFocus={() => {
                if (!hasTouchedName) setChainName("");
              }}
              onBlur={() => {
                if (!chainName.trim()) setChainName("Nytt flöde");
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setEditingName(false);
                  setTimeout(() => {
                    stepTitleInputRef.current?.focus();
                  }, 0);
                }
              }}
              autoFocus
              className="bg-transparent border-b border-gray-600 focus:outline-none text-xl font-bold"
            />
          ) : (
            <h2
              className="text-lg font-bold cursor-pointer"
              onClick={() => setEditingName(true)}
            >
              {chainName}
              <span className="bg-zinc-900 rounded-md px-2 py-1 text-gray-400 text-[10px] group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                Redigera
              </span>
            </h2>
          )}
          <button
            onClick={() => navigate("/chains")}
            className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Steglista */}
        {stepList.length > 0 && (
          <div className="px-4 pt-4">
            <StepList steps={stepList} />
          </div>
        )}

        {/* Flow */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {stepFlow === 1 && (
            <div className="space-y-4">
              <label className="text-sm text-gray-300">
                {stepList.length === 0
                  ? "Namn första steget"
                  : "Namn på nästa steg"}
              </label>
              <input
                ref={stepTitleInputRef}
                type="text"
                value={currentStep.title}
                placeholder="Ex: Planering, Startmöte..."
                onChange={(e) =>
                  setCurrentStep({ ...currentStep, title: e.target.value })
                }
                onKeyDown={(e) => {
                  // Kolla om Enter-tangenten trycktes ned
                  if (e.key === "Enter") {
                    // Förhindra standardbeteende (t.ex. formulärsubmit)
                    e.preventDefault();
                    // Kolla om titeln inte är tom (samma logik som disabled-knappen)
                    if (currentStep.title.trim()) {
                      // Gå vidare till nästa steg
                      setStepFlow(2);
                    }
                    // Om titeln är tom händer ingenting (precis som att klicka på disabled knapp)
                  }
                }}
                className="w-full bg-zinc-900 border border-gray-700 text-sm text-white px-3 py-2 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setStepFlow(2)}
                  disabled={!currentStep.title.trim()}
                  className={`${
                    currentStep.title.trim().length === 0
                      ? "bg-zinc-700 cursor-not-allowed"
                      : "bg-green-700 hover:bg-green-600"
                  } text-white text-sm px-4 py-2 rounded`}
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {stepFlow === 2 && (
            <div className="space-y-4">
              <DependencySelector
                selected={currentStep.dependencies}
                onChange={(deps) =>
                  setCurrentStep({ ...currentStep, dependencies: deps })
                }
                dropdownRef={dependencyDropdownRef}
                dropdownMounted={dropdownMounted}
                localSteps={stepList}
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setStepFlow(1)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  ← Tillbaka
                </button>
                <button
                  onClick={() => setStepFlow(3)}
                  className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {stepFlow === 3 && (
            <div className="space-y-4">
              <AssigneeSelector
                selected={currentStep.assignees}
                onChange={(a) =>
                  setCurrentStep({ ...currentStep, assignees: a })
                }
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setStepFlow(2)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  ← Tillbaka
                </button>
                <button
                  onClick={saveStep}
                  disabled={currentStep.assignees.length === 0}
                  className={`${
                    currentStep.assignees.length === 0
                      ? "bg-zinc-700 cursor-not-allowed"
                      : "bg-green-700 hover:bg-green-600"
                  } text-white text-sm px-4 py-2 rounded`}
                >
                  + Skapa steg
                </button>
              </div>
            </div>
          )}
        </div>

        {stepList.length > 0 && (
          <div className="px-4 py-4 border-t border-[#2a2a2a] bg-[#181818] flex justify-end">
            <button
              onClick={saveChain}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
            >
              Spara flöde
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, startTransition } from "react";
import { SignedIn, UserButton, useAuth } from "@clerk/remix";
import {
  Link,
  useRouteLoaderData,
  useNavigate,
  useLocation,
} from "@remix-run/react";
import { ringColors } from "../utils/colors";
import { useNordEvent } from "~/hooks/useNordEvent";
import toast, { type Toast } from "react-hot-toast";
import FilterPopover from "./FilterPopover";

interface NewUserToastProps {
  t: Toast;
  user: any;
}

function NewUserToastToast({ t, user }: NewUserToastProps) {
  const title = `Ny användare`;
  const message = `Ny användare (${user.name}) behöver godkännas`;
  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          <div className="text-green-400 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.25 1.25 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.25 1.25 0 0 0 .41-1.412A9.99 9.99 0 0 0 10 12.75a9.99 9.99 0 0 0-6.535 1.743Z" />
            </svg>
          </div>
          <div className="flex flex-col pt-0.5">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center border-l border-zinc-800 px-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function UserButtonWithBlur() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isLoaded } = useAuth();
  const buttonSizeClasses = "w-8 h-8";

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isOpen = document.querySelector(".cl-userButtonPopoverCard");
      setIsMenuOpen(!!isOpen);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-150 ease-in-out opacity-100"
          onClick={() => {
            const btn = document.querySelector("button[class*=userButtonTrigger]");
            (btn as HTMLElement)?.click();
          }}
        />
      )}
      <div className={`flex items-center ${buttonSizeClasses}`}>
        {!isLoaded ? (
          <div className={`${buttonSizeClasses} rounded-full bg-gray-700 animate-pulse`} />
        ) : (
          <SignedIn>
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { userButtonAvatarBox: buttonSizeClasses } }}
            />
          </SignedIn>
        )}
      </div>
    </>
  );
}

interface MenuDropdownProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  pendingApprovalCount: number;
}

function MenuDropdown({
  open,
  setOpen,
  pendingApprovalCount,
}: MenuDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-green-700 hover:bg-green-600 text-sm px-4 py-2 rounded text-white font-medium flex items-center gap-1"
      >
        Menu
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {pendingApprovalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white ring-2 ring-orange-700">
            {pendingApprovalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          
          <div className="fixed bg-zinc-900 right-2 mt-2 w-72 rounded-xl shadow-xl border border-zinc-700 z-50">
            <div className="p-3">
              <h3 className="text-xs text-gray-400 uppercase mb-2 px-2">Profil</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(() => navigate("/admin/users"));
                  setOpen(false);
                }}
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
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 
                             11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex flex-col text-sm text-white">
                  <span className="font-medium">Användare</span>
                  <span className="text-gray-400 text-xs">Hantera användare och roller</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const Header = () => {
  const [open, setOpen] = useState(false);
  const rootData = useRouteLoaderData<typeof rootLoaderType>("root");
  const dbUser = rootData?.dbUser;
  const pendingApprovalCount = rootData?.pendingApprovalCount ?? 0;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const location = useLocation();

  // NYTT: Visa/dölj otillgängliga
  const [showDisabled, setShowDisabled] = useState(false);
  const visibleResults = showDisabled
    ? searchResults
    : searchResults.filter((t) => t.canAccess);


    
  // Debounce + fetch
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/tasks?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.tasks ?? []);
      } catch (e) {
        console.error("Search failed", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Klick utanför / Escape stänger
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
        setSearchResults([]);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  // Nord‐event för nya användare…
  useNordEvent((payload) => {
    const isAdmin = dbUser?.role === "admin";
    const isNewPendingUser =
      payload.table === "user" &&
      (payload.action === "INSERT" || payload.action === "UPDATE") &&
      payload.data?.status === "pending_approval";

    if (isAdmin && isNewPendingUser) {
      if (payload.revalidator.state === "idle") {
        payload.revalidator.revalidate();
      }
      if (location.pathname !== "/admin/users") {
        toast.custom((t) => <NewUserToastToast t={t} user={payload.data} />, {
          duration: 4000,
          id: "new-user-toast",
        });
      }
    }
  });

  // Trigger‐sökning manuell (t.ex. vid FilterPopover)
  const triggerSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.tasks ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="bg-black text-white px-1 py-3 border-b border-gray-800 flex justify-between items-center relative z-40">
      {/* Sök‐overlay dyker upp först när panelen är öppen */}

      {( searchResults.length > 0 || isFilterOpen || open) && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 top-[4.75rem]"
          onClick={() => {
            //setSearchQuery("");
            setSearchResults([]);
            setShowDisabled(false);
            setIsFilterOpen(false);
            setOpen(false);
          }}
        />
      )}

  

      {/* Logo */}
      <Link to="/" prefetch="intent" className="flex items-center gap-2 min-w-fit min-w-[120px]">
        <img src="/logo-slick.png" alt="Logo" className="h-12 w-12" loading="eager" />
      </Link>

      <div className="flex items-center gap-2 md:gap-2 flex-1 justify-end">
        {dbUser && dbUser.status === "active" && (
          <div ref={wrapperRef} className="relative w-full md:max-w-[calc(100vw-130px)]">
            {/* Sökfält */}
            <input
              type="text"
              placeholder="Sök flöde eller steg..."
              value={searchQuery}
              onFocus={() => {
                setIsFilterOpen(false);
                if (searchQuery && searchResults.length === 0 && !isSearching) {
                  triggerSearch();
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pr-10 text-sm rounded-md bg-zinc-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {/* Spinner */}
            {isSearching && (
              <div className="absolute right-9 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
            {/* Filter‐knapp */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearchResults([]);
                setIsFilterOpen(true);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 bg-zinc-900 p-1 rounded-md hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 48 48">
                <path d="M47,12a2,2,0,0,0-2-2H24a2,2,0,0,0,0,4H45A2,2,0,0,0,47,12Z" />
                <path d="M3,14H8.35a6,6,0,1,0,0-4H3a2,2,0,0,0,0,4Z" />
                <path d="M45,22H37.65a6,6,0,1,0,0,4H45Z" />
                <path d="M22,22H3a2,2,0,0,0,0,4H22Z" />
                <path d="M45,34H28a2,2,0,0,0,0,4H45Z" />
                <path d="M18,30a6,6,0,0,0-5.65,4H3a2,2,0,0,0,0,4h9.35A6,6,0,1,0,18,30Z" />
              </svg>
            </button>
            {/* FilterPopover */}
           
            <FilterPopover isOpen={isFilterOpen} triggerSearch={triggerSearch} onClose={() => setIsFilterOpen(false)} />

            {/* Sökresults‐panel */}
            {searchQuery && (visibleResults.length > 0 || isSearching) && (
              <div className="fixed inset-x-2 top-[4rem] rounded-md shadow-xl bg-zinc-900 border border-zinc-700 z-50 max-h-96 overflow-auto">
                {/* Visa/Dölj otillgängliga */}
                <div className="flex justify-end px-4 py-2 border-b border-zinc-800">
                  <button
                    onClick={() => setShowDisabled((v) => !v)}
                    className="text-xs text-zinc-300 hover:text-zinc-100"
                  >
                    {showDisabled ? "Dölj otillgängliga" : "Visa otillgängliga"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px">
                  {(isSearching ? [] : visibleResults).map((task) => {
                    const disabled = !task.canAccess;
                    return disabled ? (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800 text-gray-500 opacity-60 cursor-not-allowed select-none"
                        title="Du har inte åtkomst till detta steg"
                      >
                        <span
                          className={`w-2 h-2 mt-1 rounded-full ${
                            ringColors[task.status] ?? "bg-gray-500"
                          } border border-zinc-700`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium">{task.title}</span>
                          <span className="text-xs text-zinc-600 font-mono">
                            #{task.id.slice(0, 6)} – {task.chain?.name ?? "Okänt flöde"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={task.id}
                        to={`/task/${task.id}`}
                        prefetch="intent"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowDisabled(false);
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800 transition border-b border-zinc-800"
                      >
                        <span
                          className={`w-2 h-2 mt-1 rounded-full ${
                            ringColors[task.status] ?? "bg-gray-500"
                          } border border-zinc-700`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium text-white">
                            {task.title}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            #{task.id.slice(0, 6)} – {task.chain?.name ?? "Okänt flöde"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  {!isSearching && visibleResults.length === 0 && searchQuery && (
                    <div className="px-4 py-3 text-sm text-gray-400 md:col-span-2 xl:col-span-3">
                      Inga resultat hittades.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigationssektion */}
        <nav className="flex items-center gap-2 md:gap-2">
          {dbUser && dbUser.role === "admin" && dbUser.status === "active" && (
            <MenuDropdown
              open={open}
              setOpen={setOpen}
              pendingApprovalCount={pendingApprovalCount}
            />
          )}
          <UserButtonWithBlur />
        </nav>
      </div>
    </header>
  );
};

export default Header;

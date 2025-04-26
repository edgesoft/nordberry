import { useState, useEffect, useRef } from "react";
import { SignedIn, UserButton, useAuth } from "@clerk/remix";
import {
  Link,
  useRouteLoaderData, useLocation
} from "@remix-run/react";
import { ringColors } from "../utils/colors";
import { useNordEvent } from "~/hooks/useNordEvent";
import toast, { type Toast } from "react-hot-toast";
import FilterPopover from "./FilterPopover";

interface NewUserToastProps {
  t: Toast;
  user: any;
}

function NewUserToast({ t, user }: NewUserToastProps) {
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
            const btn = document.querySelector(
              "button[class*=userButtonTrigger]"
            );
            (btn as HTMLElement)?.click();
          }}
        />
      )}
      <div className={`flex items-center ${buttonSizeClasses}`}>
        {!isLoaded ? (
          <div
            className={`${buttonSizeClasses} rounded-full bg-gray-700 animate-pulse`}
          />
        ) : (
          <SignedIn>
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: { userButtonAvatarBox: buttonSizeClasses },
              }}
            />
          </SignedIn>
        )}
      </div>
    </>
  );
}

const Header = () => {
  const rootData = useRouteLoaderData<typeof rootLoaderType>("root");
  const dbUser = rootData?.dbUser;
  const pendingApprovalCount = rootData?.pendingApprovalCount ?? 0;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const location = useLocation();

  const [showDisabled, setShowDisabled] = useState(false);
  const visibleResults = showDisabled
    ? searchResults
    : searchResults.filter((t) => t.canAccess);


  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/tasks?q=${encodeURIComponent(searchQuery)}`
        );
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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
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
        toast.custom((t) => <NewUserToast t={t} user={payload.data} />, {
          duration: 4000,
          id: "new-user-toast",
        });
      }
    }
  });

  const triggerSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/tasks?q=${encodeURIComponent(searchQuery)}`
      );
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

      {(searchResults.length > 0 || isFilterOpen ) && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 top-[4.75rem]"
          onClick={() => {
            setSearchResults([]);
            setShowDisabled(false);
            setIsFilterOpen(false);
          }}
        />
      )}

      <Link
        to="/"
        prefetch="intent"
        className="flex items-center gap-2  gap-2 min-w-fit"
      >
        <img
          src="/logo-slick.png"
          alt="Logo"
          className="h-12 w-12"
          loading="eager"
        />
      </Link>

      <div className="flex items-center gap-2 md:gap-2 flex-1 justify-between">
        {dbUser && dbUser.status === "active" && (
          <div ref={wrapperRef} className="relative w-full ">
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
            {isSearching && (
              <div className="absolute right-9 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
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
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white ring-2 ring-zinc-900 shadow-sm">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
            <FilterPopover
              isOpen={isFilterOpen}
              triggerSearch={triggerSearch}
              onClose={() => setIsFilterOpen(false)}
            />

            {searchQuery && (visibleResults.length > 0 || isSearching) && (
              <div className="fixed inset-x-2 top-[4rem] rounded-md shadow-xl bg-zinc-900 border border-zinc-700 z-50 max-h-96 overflow-auto">
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
                          <span className="truncate text-sm font-medium">
                            {task.title}
                          </span>
                          <span className="text-xs text-zinc-600 font-mono">
                            #{task.id.slice(0, 6)} –{" "}
                            {task.chain?.name ?? "Okänt flöde"}
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
                            #{task.id.slice(0, 6)} –{" "}
                            {task.chain?.name ?? "Okänt flöde"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  {!isSearching &&
                    visibleResults.length === 0 &&
                    searchQuery && (
                      <div className="px-4 py-3 text-sm text-gray-400 md:col-span-2 xl:col-span-3">
                        Inga resultat hittades.
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center">
          <UserButtonWithBlur />
        </div>
      </div>
    </header>
  );
};

export default Header;

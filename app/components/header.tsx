import React, { useState, useEffect, useRef } from "react";
import { SignedIn, UserButton, useAuth } from "@clerk/remix";
import { Link, useLoaderData } from "@remix-run/react";
import { createPortal } from "react-dom";
import { ringColors } from "~/utils/colors"; // Se till att du har denna!

interface MenuOverlayProps {
  onClose: () => void;
}

function MenuOverlay({ onClose }: MenuOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end p-4">
      <div
        id="menu-panel"
        ref={ref}
        className="absolute w-72 rounded-xl shadow-xl border border-zinc-700 bg-zinc-900 p-4 h-auto overflow-y-auto"
      >
        <h3 className="text-xs text-gray-400 uppercase mb-2 px-2">Profil</h3>
        <button
          className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-800 transition text-left"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="p-2 rounded-md bg-zinc-800 border border-zinc-700">
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
            <span className="text-gray-400 text-xs">
              Hantera användare och roller
            </span>
          </div>
        </button>
      </div>
    </div>,
    document.body
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

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-99 w-full h-full"
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
                elements: {
                  userButtonAvatarBox: buttonSizeClasses,
                },
              }}
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
}

function MenuDropdown({ open, setOpen }: MenuDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed right-0 mt-2 w-72 rounded-xl shadow-xl border border-zinc-700 bg-black/60 backdrop-blur-sm backdrop-saturate-150 z-99">
          <div className="p-3">
            <h3 className="text-xs text-gray-400 uppercase mb-2 px-2">
              Profil
            </h3>
            <button className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-800 transition text-left">
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
                <span className="text-gray-400 text-xs">
                  Hantera användare och roller
                </span>
              </div>
            </button>
            <hr className="border-zinc-700 my-2" />
          </div>
        </div>
      )}
    </div>
  );
}

const Header = () => {
  const [open, setOpen] = useState(false);
  const { dbUser } = useLoaderData<typeof loader>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setSearchResults([]);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchResults([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const triggerSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/tasks?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data.tasks ?? []);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="bg-black text-white px-1 py-3 border-b border-gray-800 flex justify-between items-center relative z-40">
      {searchResults.length > 0 && (
        <div
          className="fixed left-0 right-0 top-[55px] bottom-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setSearchResults([])}
        />
      )}
      <Link
        to="/"
        prefetch="intent"
        className="flex items-center gap-3 min-w-fit min-w-[120px]"
      >
        <img
          src="/logo-1.png"
          alt="Logo"
          className="h-12 w-12"
          loading="eager"
        />
      </Link>

      <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
        {dbUser && dbUser.status === "active" && (
          <div
            ref={wrapperRef}
            className="relative w-full md:max-w-[calc(100vw-130px)]"
          >
            <input
              type="text"
              placeholder="Sök projekt eller steg..."
              value={searchQuery}
              onFocus={() => {
                if (searchQuery && searchResults.length === 0) {
                  triggerSearch();
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pr-10 text-sm rounded-md bg-zinc-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}

            {searchQuery && (searchResults.length > 0 || isSearching) && (
              <div className="fixed inset-x-2  mt-2 rounded-md shadow-xl bg-zinc-900 border border-zinc-700 z-50 max-h-96 overflow-auto ">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px">
                  {searchResults.map((task) => {
                    const disabled = task.canAccess === false;

                    return disabled ? (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800 text-gray-500 opacity-60 cursor-not-allowed select-none"
                        title="Du har inte åtkomst till detta steg"
                      >
                        <span
                          className={`w-2 h-2 mt-1 rounded-full ${
                            ringColors[task.status]
                          } border border-zinc-700`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium">
                            {task.title}
                          </span>
                          <span className="text-xs text-zinc-600 font-mono">
                            #{task.id.slice(0, 6)} –{" "}
                            {task.chain?.name ?? "Okänd kedja"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={task.id}
                        to={`/task/${task.id}`}
                        onClick={() => {
                          setSearchResults([]);
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800 transition border-b border-zinc-800"
                      >
                        <span
                          className={`w-2 h-2 mt-1 rounded-full ${
                            ringColors[task.status]
                          } border border-zinc-700`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium text-white">
                            {task.title}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            #{task.id.slice(0, 6)} –{" "}
                            {task.chain?.name ?? "Okänd kedja"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex items-center gap-2 md:gap-6">
          {dbUser && dbUser.role === "admin" && dbUser.status === "active" && (
            <>
              <MenuDropdown open={open} setOpen={setOpen} />
              {open && <MenuOverlay onClose={() => setOpen(false)} />}
            </>
          )}
          <UserButtonWithBlur />
        </nav>
      </div>
    </header>
  );
};

export default Header;

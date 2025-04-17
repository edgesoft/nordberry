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

interface NewUserToastProps {
  t: Toast;
  user: any;
}

function NewUserToastToast({ t, user }: NewUserToastProps) {
  // Definiera texterna för just detta meddelande
  const title = `Ny användare`;
  const message = `Ny användare (${user.name}) behöver godkännas`;

  return (
    <div
      // Återanvänd animationsklasserna (se till att 'animate-enter'/'animate-leave' finns i din CSS/Tailwind-config)
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      {/* Innehållsarea */}
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          {/* Ikon - Byt ut mot checkmark och ändra färg */}
          <div className="text-green-400 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center shrink-0">
            {" "}
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.25 1.25 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.25 1.25 0 0 0 .41-1.412A9.99 9.99 0 0 0 10 12.75a9.99 9.99 0 0 0-6.535 1.743Z" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex flex-col pt-0.5">
            {" "}
            {/* Lite padding top för texten? */}
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
      {/* Stängningsknapp */}
      <div className="flex items-center border-l border-zinc-800 px-2">
        {" "}
        {/* Lade till border-l */}
        <button
          onClick={() => toast.dismiss(t.id)} // Använd toast.dismiss
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
          aria-label="Close"
        >
          {/* Stäng-ikon SVG */}
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          x
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
    function handleClickOutside(event: MouseEvent) {
      if (open && ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
          {" "}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />{" "}
        </svg>
        {pendingApprovalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white ring-2 ring-orange-700">
            {pendingApprovalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-2 mt-2 w-72 rounded-xl shadow-xl border border-zinc-700 bg-black/60 backdrop-blur-sm backdrop-saturate-150 z-99">
          {" "}
          {/* Högt z-index för menyn */}
          <div className="p-3">
            <h3 className="text-xs text-gray-400 uppercase mb-2 px-2">
              Profil
            </h3>
            {/* Knappen för att navigera till Användare */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Hindra klicket från att bubbla upp och stänga menyn direkt
                startTransition(() => {
                  navigate("/admin/users"); // Navigera
                });
                setOpen(false); // Stäng menyn efter klick/navigering
              }}
              className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-zinc-800 transition text-left"
            >
              {/* Ikon och text för Användare-knappen */}
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
          </div>
        </div>
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
  const location = useLocation();

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
        setSearchResults([]); // Rensa resultat vid fel
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timeout);
  }, [searchQuery]); // Körs om när söksträngen ändras

  // useEffect för att stänga sökresultaten vid klick utanför eller Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setSearchResults([]); // Rensa resultat
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchResults([]); // Rensa resultat
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []); // Körs endast en gång vid mount

  useNordEvent((payload) => {
    const isAdmin = dbUser?.role === "admin";
    const currentPath = location.pathname;

    const isNewPendingUser =
      payload.table === "user" &&
      (payload.action === "INSERT" || payload.action === "UPDATE") &&
      payload.data?.status === "pending_approval";

    if (isAdmin && isNewPendingUser) {
      if (payload.revalidator.state === "idle") {
        payload.revalidator.revalidate();
      }

      if (currentPath !== "/admin/users") {
        toast.custom((t) => <NewUserToastToast t={t} user={payload.data} />, {
          duration: 4000,
          id: "new-user-toast",
        });
      }
    }
  });

  // Funktion för att trigga sökning (används t.ex. vid onFocus om man vill)
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
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Renderar hela headern
  return (
    // Header element med grundläggande styling och z-index
    <header className="bg-black text-white px-1 py-3 border-b border-gray-800 flex justify-between items-center relative z-40">
      {/* Blur-overlay för custom-menyn (visas endast när menyn är öppen) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-90" // z-index under menyn (99) men över headern (40) och sökresultat (50)
        />
      )}

      {/* Overlay/Backdrop för sökresultaten (visas när det finns resultat) */}
      {searchResults.length > 0 && (
        <div
          className="fixed left-0 right-0 top-[55px] bottom-0 bg-black/30 backdrop-blur-sm z-40" // Ligger på samma nivå som header, under sökresultatpanelen
          onClick={() => setSearchResults([])} // Klick stänger resultaten
        />
      )}

      {/* Logo */}
      <Link
        to="/"
        prefetch="intent"
        className="flex items-center gap-3 min-w-fit min-w-[120px]"
      >
        <img
          src="/logo-slick.png"
          alt="Logo"
          className="h-12 w-12"
          loading="eager"
        />
      </Link>

      {/* Höger sektion med sök och navigation */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
        {/* Söksektion (visas om användaren är aktiv) */}
        {dbUser && dbUser.status === "active" && (
          // Wrapper för sökfält + resultat (används av click-outside)
          <div
            ref={wrapperRef}
            className="relative w-full md:max-w-[calc(100vw-130px)]"
          >
            {/* Sökfältet */}
            <input
              type="text"
              placeholder="Sök flöde eller steg..."
              value={searchQuery}
              onFocus={() => {
                // Kan trigga sökning direkt vid fokus om man vill och har text
                if (searchQuery && searchResults.length === 0 && !isSearching) {
                  triggerSearch();
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)} // Uppdatera sökstate
              className="w-full px-3 py-1.5 pr-10 text-sm rounded-md bg-zinc-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {/* Indikator för pågående sökning */}
            {isSearching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
            {/* Sökresultatpanel (visas villkorligt) */}
            {searchQuery && (searchResults.length > 0 || isSearching) && (
              <div className="fixed inset-x-2 mt-2 rounded-md shadow-xl bg-zinc-900 border border-zinc-700 z-50 max-h-96 overflow-auto ">
                {" "}
                {/* z-index över header/sök-backdrop */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px">
                  {/* Mappa och rendera sökresultaten */}
                  {searchResults.map((task) => {
                    const disabled = task.canAccess === false; // Exempel på logik för disabled state
                    return disabled ? (
                      // Disabled state (ej klickbar)
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
                      // Klickbar länk
                      <Link
                        key={task.id}
                        to={`/task/${task.id}`} // Navigera till task
                        prefetch="intent"
                        onClick={() => {
                          setSearchQuery(""); // Rensa sökfältet vid val
                          setSearchResults([]); // Stäng resultaten
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
                  {/* Om inga resultat men sökning gjorts */}
                  {!isSearching &&
                    searchResults.length === 0 &&
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

        {/* Navigationssektion */}
        <nav className="flex items-center gap-2 md:gap-6">
          {/* Custom-meny (visas för admin) */}
          {dbUser && dbUser.role === "admin" && dbUser.status === "active" && (
            <>
              <MenuDropdown
                open={open}
                setOpen={setOpen}
                pendingApprovalCount={pendingApprovalCount}
              />
            </>
          )}
          {/* Clerk Användarknapp */}
          <UserButtonWithBlur />
        </nav>
      </div>
    </header>
  );
};

export default Header;

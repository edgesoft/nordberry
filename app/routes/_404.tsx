import { Link } from "@remix-run/react";

export default function NotFound() {
  return (
    <div className="pt-24 px-4 pb-24 bg-black min-h-screen text-white flex justify-center items-center">
      <NotFoundCard />
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
      <div className="bg-zinc-950 border-b border-zinc-800 p-6 flex justify-center items-center">
        <svg
          className="w-16 h-16 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
          />
        </svg>
      </div>

      <div className="p-6 bg-zinc-930">
        <h3 className="text-white text-lg font-semibold mb-2">Sidan kunde inte hittas</h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Det verkar som om du försökt nå en sida som inte finns. Dubbelkolla adressen eller gå tillbaka.
        </p>
        <div className="flex">
          <Link
            to="/"
            className="text-sm font-medium px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Gå till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}

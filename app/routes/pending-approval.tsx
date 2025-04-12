import { Outlet } from "@remix-run/react";
import { redirect } from "@remix-run/node";
import { requireUser } from "../utils/auth.server";

export async function loader(args: LoaderArgs) {

  try {
    const dbUser = await requireUser(args, { requireActiveStatus: false });
    if (dbUser && dbUser.status === "active") return redirect(`/chains`);
  } catch(e) {
    console.log(e)
  }

  return null;
}

export function PendingApproval() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
      {/* Header / ikon / grid-mönster-bakgrund */}
      <div className="bg-zinc-950 border-b border-zinc-800 p-6 flex justify-center items-center">
        {/* Exempelikon – byt gärna mot din egen SVG eller bild */}
        <svg
          className="w-15 h-15 text-zinc-500"
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

      {/* Text-content */}
      <div className="p-6 bg-zinc-930">
        <h3 className="text-white text-lg font-semibold mb-2">
          Inväntar godkännande
        </h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Administratören behöver godkänna din begäran innan du kan fortsätta.
        </p>
      </div>
    </div>
  );
}

export default function View() {
  return (
    <>
      <div className="pt-24 md:pt-24 px-2 md:px-4 pb-24 bg-black min-h-screen text-white space-y-2 space-y-2 md:space-y-6">
        <div className="flex justify-center px-4">
          <PendingApproval />
        </div>
        <Outlet />
      </div>
    </>
  );
}

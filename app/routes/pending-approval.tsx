import { redirect } from "@remix-run/node";
import { useRouteLoaderData } from "@remix-run/react";
import { requireUser } from "../utils/auth.server";
import toast, { type Toast } from "react-hot-toast";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useNordEvent } from "~/hooks/useNordEvent";
import type { loader as rootLoader } from "../root";

export async function loader(args: LoaderFunctionArgs) {
  try {
    const dbUser = await requireUser(args, { requireActiveStatus: false });
    if (dbUser && dbUser.status === "active") return redirect(`/chains`);
  } catch (e) {
    console.log(e);
    throw e;
  }

  return null;
}

interface ActivationToastProps {
  t: Toast;
}

function ActivationToast({ t }: ActivationToastProps) {
  const title = "Konto Aktiverat";
  const message = "Du har nu tillgång och omdirigeras inom kort.";

  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          <div className="text-green-400 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center shrink-0">
            {" "}
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex flex-col pt-0.5">
            {" "}
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center border-l border-zinc-800 px-2">
        {" "}
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

export function PendingApproval() {
  const {dbUser} = useRouteLoaderData<typeof rootLoader>("root");

  useNordEvent((payload) => {
    const isRelevant =
      payload.table === "user" &&
      payload.action === "UPDATE" &&
      payload.data.id === dbUser.id;

    if (isRelevant) {
      toast.custom((t) => <ActivationToast t={t} />, {
        duration: 4000,
        id: "activation-toast",
      });

      setTimeout(() => {
        if (payload.revalidator.state === "idle") {
          payload.revalidator.revalidate();
        }
      }, 1500);
    }
  });
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
      <div className="bg-zinc-950 border-b border-zinc-800 p-6 flex justify-center items-center">
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
    <div className="pt-24 md:pt-24 px-2 md:px-4 pb-24 bg-black min-h-screen text-white space-y-2 space-y-2 md:space-y-6">
      <div className="flex justify-center px-4">
        <PendingApproval />
      </div>
    </div>
  );
}

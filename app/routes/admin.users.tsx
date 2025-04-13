import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"; // Importera ActionFunctionArgs också
import { useFetcher, useLoaderData } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import Avatar from "~/components/avatar"; // Antag att denna komponent finns och fungerar
import { useHasMounted } from "~/hooks/useHasMounted";

// Loader för att hämta användare (oförändrad logik, men väljer nu fler fält om det behövs)
export const loader = async (args: LoaderFunctionArgs) => {
  const user = await requireUser(args, { requireActiveStatus: true });

  if (user.role !== "admin") {
    throw new Response("Not authorized", { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true, // Säkerställ att email alltid hämtas
      imageUrl: true,
      status: true, // Hämtar status
      createdAt: true, // Hämtar skapandedatum
    },
  });

  return json({ users });
};

// Action för att aktivera användare (oförändrad logik)
export const action = async (args: ActionFunctionArgs) => { // Använd ActionFunctionArgs
    const user = await requireUser(args, { requireActiveStatus: true });
  if (user.role !== "admin") {
    throw new Response("Not authorized", { status: 403 });
  }

  const {request} = args

  const formData = await request.formData();
  const userId = formData.get("userId");

  if (typeof userId !== "string") {
    return json({ error: "Invalid userId" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });

  // Kolla om användaren finns och har rätt status
  if (!target || target.status !== "pending_approval") {
    return json({ error: "Can only activate users in pending_approval" }, { status: 400 });
  }

  // Uppdatera status
  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  });

  return json({ success: true });
};

// Komponenten för att visa användarlistan (ombyggd med tabell)
export default function AdminUserList() {
  const { users } = useLoaderData<typeof loader>();
  const hasMounted = useHasMounted();
  const fetcher = useFetcher(); // En fetcher för alla knappar

  // Funktion för att formatera datum (eller använd ett bibliotek som date-fns)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Funktion för att rendera status-badge (exempel)
  const renderStatusBadge = (status: string) => {
    let bgColor = "bg-zinc-600"; // Default
    let textColor = "text-zinc-100";
    let text = status;

    switch (status) {
      case "active":
        bgColor = "bg-green-500/20";
        textColor = "text-green-400";
        text = "Aktiv";
        break;
      case "pending_approval":
        bgColor = "bg-yellow-500/20";
        textColor = "text-yellow-400";
        text = "Väntar";
        break;
      case "inactive":
      case "disabled": // Om du har fler statusar
        bgColor = "bg-red-500/20";
        textColor = "text-red-400";
        text = "Inaktiv";
        break;
    }

    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${bgColor} ${textColor} ring-1 ring-inset ring-current/20`}>
        {text}
      </span>
    );
  };

  return (
    // Ta bort max-w-2xl, justera padding och centrera inte (mx-auto borttagen)
    <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Tabell-wrapper för styling och overflow */}
      <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-zinc-700">
          {/* Tabellhuvud */}
          <thead className="bg-zinc-800/50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Användare</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell">Email</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden lg:table-cell">Skapad</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-white">Åtgärd</th>
            </tr>
          </thead>
          {/* Tabellkropp */}
          <tbody className="divide-y divide-zinc-800 bg-zinc-900">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                {/* Användare (Avatar + Namn) */}
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar user={user} size={8} /> {/* Något större avatar? */}
                    <div className="font-medium text-white truncate">{user.name ?? <span className="italic text-zinc-400">Namn saknas</span>}</div>
                  </div>
                </td>
                {/* Email (Dold på små skärmar) */}
                <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400 hidden sm:table-cell truncate">
                  {user.email}
                </td>
                {/* Status (Badge) */}
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  {renderStatusBadge(user.status)}
                </td>
                {/* Skapad Datum (Dold på mindre skärmar) */}
                <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400 hidden lg:table-cell">
                  {hasMounted? formatDate(user.createdAt): null}
                </td>
                {/* Åtgärd (Aktivera-knapp) */}
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  {user.status === "pending_approval" ? (
                    <fetcher.Form method="post" className="inline-block">
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        disabled={fetcher.state !== 'idle'} // Inaktivera medan fetcher jobbar
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition ${
                          fetcher.state !== 'idle'
                            ? 'bg-zinc-500 cursor-not-allowed'
                            : 'bg-green-700 hover:bg-green-600 text-white  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                        }`}
                      >
                        Aktivera
                      </button>
                    </fetcher.Form>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">Ingen åtgärd</span> // Placeholder om ingen åtgärd
                  )}
                </td>
              </tr>
            ))}
            {/* Om inga användare finns */}
            {users.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-10 px-4 text-sm text-zinc-500 italic">
                        Inga användare att visa.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
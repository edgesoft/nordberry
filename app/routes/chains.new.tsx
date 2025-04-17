import { useNavigate } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { ChainEditor } from "~/components/ChainEditor/ChainEditor";

export const loader = async (_: LoaderFunctionArgs) => {
  const activeUsers = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, name: true, email: true, imageUrl: true },
    orderBy: { name: "asc" },
  });
  return json({ activeUsers });
};


export default function NewChain() {
  const navigate = useNavigate();

  async function createChain(data: { name: string; steps: any[] }) {
    await fetch("/api/chains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    navigate("/chains")
  }

  return (
    <ChainEditor
      onClose={() => navigate("/chains")}
      initialName="Nytt flöde"
      initialSteps={[]}
      onSave={createChain}
    />
  );
}

import { redirect } from "@remix-run/node";
import { LoaderArgs } from "@remix-run/node";
import { requireUser } from "../utils/auth.server";

export async function loader(args: LoaderArgs) {

  const dbUser = await requireUser(args, { requireActiveStatus: true });
  return redirect(`/chains`);  
}

export default function Main() { 
    return null
}
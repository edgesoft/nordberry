import { redirect } from "@remix-run/node";
import { LoaderArgs } from "@remix-run/node";
import { requireUser } from "../utils/auth.server";

export async function loader(args: LoaderArgs) {
  await requireUser(args, { requireActiveStatus: true });
  return redirect(`/chains`);  
}

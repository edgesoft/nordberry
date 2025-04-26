import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { filterStatusCookie } from "~/utils/filter.server";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();

  const done = form.get("done") === "true";
  const working = form.get("working") === "true";
  const pending = form.get("pending") === "true";

  if (!done && !working && !pending) {
    return json(
      { error: "Du måste ha minst en status vald." },
      { status: 400 },
    );
  }

  const payload = JSON.stringify({ done, working, pending });

  const cookieHeader = await filterStatusCookie.serialize(payload);

  return json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookieHeader,
      },
    },
  );
};
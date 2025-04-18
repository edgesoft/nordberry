import { createCookie } from "@remix-run/node";
import { FilterStatusKey } from "~/types/filterStatusTypes";

export type Statuses = Record<FilterStatusKey, boolean>;

export const filterStatusCookie = createCookie("filter-status", {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

export async function getFilterStatuses(
  request: Request
): Promise<Statuses> {
  const header = request.headers.get("Cookie") || "";
  const data = await filterStatusCookie.parse(header);
  const defaults: Statuses = {
    [FilterStatusKey.Pending]: true,
    [FilterStatusKey.Working]: true,
    [FilterStatusKey.Done]:    true,
  };

  if (typeof data !== "string" && data) {
    return { ...defaults, ...data };
  }

  try {
    return { ...defaults, ...(data ? JSON.parse(data) : {}) };
  } catch {
    return defaults;
  }
}
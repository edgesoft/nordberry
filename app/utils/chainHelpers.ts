import type { Step } from "~/components/chainTypes";

export const createLocalId = () =>
  Math.random().toString(36).slice(2, 10);

export function moveStepArray(list: Step[], from: number, dir: -1 | 1) {
  const upd = [...list];
  const to = from + dir;
  if (to < 0 || to >= upd.length) return list;

  const [moved] = upd.splice(from, 1);
  upd.splice(to, 0, moved);

  const reordered = upd.map((s, i) => ({ ...s, order: i }));
  const orderMap = Object.fromEntries(reordered.map((s) => [s.id, s.order]));

  const removedTitles: string[] = [];
  const cleaned = reordered.map((s) => {
    const before = s.dependencies ?? [];
    const after = before.filter((d) => {
      const depOrder = orderMap[d.id];
      if (depOrder === undefined) return true; // extern
      return depOrder < orderMap[s.id];
    });
    if (after.length < before.length) removedTitles.push(s.title);
    return { ...s, dependencies: after };
  });

  return { cleaned, removedTitles };
}
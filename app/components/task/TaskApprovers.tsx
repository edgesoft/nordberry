import { useFetcher, useMatches } from "@remix-run/react";
import { useState } from "react";
import Avatar from "~/components/avatar";
import ConfirmModal from "~/components/confirm-modal";
import RevokeApprovalButton from "~/components/revoke-approval-button";

const useRootData = () => {
    const root = useMatches().find((m) => m.id === "root")?.data;
    return { dbUser: root?.dbUser };
  };
  

export function TaskApprovers({ task, assignees }) {
  const fetcher = useFetcher();
  const { dbUser } = useRootData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const canApprove = task.dependencies.every((d) => d.status === "done");
  const isSubmitting = fetcher.state !== "idle";

  const open = (a) => {
    setSelected(a);
    setModalOpen(true);
  };
  const close = () => !isSubmitting && setModalOpen(false);
  const confirm = () => {
    fetcher.submit(
      { taskId: selected.taskId, userId: selected.userId },
      { method: "post", action: "/api/task/approve" }
    );
    setModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {assignees.map((a) => {
        if (a.role === "viewer") return null;
        const ring = a.approved
          ? "ring-emerald-400"
          : a.role === "approver"
          ? "ring-orange-400"
          : "ring-gray-600";

        return (
          <div
            key={a.user.id}
            className="flex items-center justify-between bg-zinc-800 p-2 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`ring-1 rounded-full w-6 h-6 ${ring}`}>
                <Avatar user={a.user} size={6} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {a.user.name}
                </div>
                <div className="text-xs text-zinc-400">{a.user.email}</div>
              </div>
            </div>

            {a.approved ? (
              <RevokeApprovalButton
                taskId={task.id}
                userId={a.user.id}
                taskStatus={task.status}
              />
            ) : (
              a.user.id === dbUser?.id &&
              a.role === "approver" && (
                <>
                  <button
                    type="button"
                    onClick={() => open(a)}
                    title={
                      canApprove && task.status === "working"
                        ? "Godkänn steget"
                        : task.status === "working"
                        ? "Kan inte godkänna innan beroenden är klara"
                        : "Steget är inte i arbete"
                    }
                    disabled={
                      !canApprove || isSubmitting || task.status !== "working"
                    }
                    className={`text-sm text-white p-1 rounded-full transition ${
                      !canApprove || isSubmitting || task.status !== "working"
                        ? "bg-zinc-500 opacity-60 cursor-not-allowed"
                        : "bg-zinc-700 hover:bg-green-600"
                    }`}
                  >
                    {isSubmitting ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                      />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  <ConfirmModal
                    isOpen={modalOpen}
                    onClose={close}
                    onConfirm={confirm}
                    title="Bekräfta godkännande"
                    isSubmitting={isSubmitting}
                  >
                    Är du säker på att du vill godkänna detta steg? Detta kan
                    öppna nya steg och kedjor.
                  </ConfirmModal>
                </>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

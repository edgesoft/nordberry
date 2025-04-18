import { useLongHoverPress } from "../hooks/useLongHoverPress";
import Avatar from "../components/avatar";
import { useFetcher } from "@remix-run/react";
import toast from "react-hot-toast";
import { sourceMatchers } from "~/utils/sourceMatcher";
import { useState, useEffect } from "react";
import { type FetcherWithComponents } from "@remix-run/react";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("sv", { numeric: "auto" });

  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  return rtf.format(-days, "day");
}

export const DeleteUndoToast = ({
  t,
  commentId,
  onUndoSuccess,
}: {
  t: Toast;
  commentId: string;
  onUndoSuccess: () => void;
}) => {
  const undoFetcher = useFetcher();

  const handleUndo = () => {
  
    undoFetcher.submit(null, {
      method: "post",
      action: `/api/comments/${commentId}/undo-delete`, // Din Ångra-action
    });
    toast.dismiss(t.id); // Stäng toasten när Ångra klickas
  };

  // Om ångra-anropet lyckas, kör onUndoSuccess callback
  useEffect(() => {
    if (undoFetcher.state === "idle" && undoFetcher.data?.success) {
      onUndoSuccess();
    }
    // Här kan du också hantera ev. fel vid undoFetcher.data?.error
  }, [undoFetcher.state, undoFetcher.data, onUndoSuccess]);

  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          <div className="text-orange-200 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M11 3a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0V3zm1 16a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white py-2">
              Kommentar borttagen
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center border-l border-zinc-950 p-2">
        <button
          onClick={() => {
            handleUndo();
            toast.remove(t.id);
          }}
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
          aria-label="Ångra"
        >
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-4 h-4"
            strokeWidth={1.8}
            fill="none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

function renderCommentWithLinks(text: string): React.ReactNode {
  let remaining = text;
  const result: React.ReactNode[] = [];
  let key = 0;

  while (remaining.length > 0) {
    let earliestMatchIndex = -1;
    let matchedUrl = "";
    let matcherUsed: (typeof sourceMatchers)[0] | undefined;

    // Hitta första matchande länk i texten
    for (const matcher of sourceMatchers) {
      const match = matcher.regex.exec(remaining);
      if (
        match &&
        (earliestMatchIndex === -1 || match.index < earliestMatchIndex)
      ) {
        earliestMatchIndex = match.index;
        matchedUrl = match[0];
        matcherUsed = matcher;
      }
      matcher.regex.lastIndex = 0; // reset regexp state
    }

    if (earliestMatchIndex === -1 || !matcherUsed) {
      result.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Lägg till text före länken
    if (earliestMatchIndex > 0) {
      result.push(
        <span key={key++}>{remaining.slice(0, earliestMatchIndex)}</span>
      );
    }

    // Lägg till själva länken
    result.push(
      <a
        key={key++}
        href={matchedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pl-2 pr-2 border border-zinc-900 bg-zinc-900 rounded-md text-xs text-white hover:bg-emerald-700"
      >
        {matcherUsed.extractName(matchedUrl)}
      </a>
    );

    // Klipp bort det vi precis processade
    remaining = remaining.slice(earliestMatchIndex + matchedUrl.length);
  }

  return result;
}


export function CommentBubble({
  comment,
  prevUserId,
  dbUserId,
  deleteFetcher
}: {
  comment: any;
  prevUserId?: string;
  dbUserId?: string;
  deleteFetcher: FetcherWithComponents<{ success: boolean; deletedCommentId?: string; error?: string }>; 
}) {
  const isSameUser = prevUserId === comment.user.id;
  const isMine = comment.user.id === dbUserId;

  const [isVisible, setIsVisible] = useState(true);
  const { activeId, bind } = useLongHoverPress(500);
  const bindProps = bind(comment.id);
  const showDelete = activeId === comment.id;


  const handleDeleteClick = () => {
    // 1. Optimistisk UI-uppdatering: Dölj direkt
    setIsVisible(false);

    // 2. Skicka formuläret för mjuk radering
    deleteFetcher.submit(null, {
      // Skicka med submit istället för Form's default
      method: "post",
      action: `/api/comments/${comment.id}/soft-delete`,
    });
  };

  // Om inte synlig (pga optimistisk radering), rendera ingenting
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="relative group flex gap-3 items-start"
      {...(isMine ? bindProps : {})}
    >
      {!isSameUser ? (
        <Avatar user={comment.user} size={8} />
      ) : (
        <div className="w-8 flex justify-center" />
      )}

      <div
        className={`bg-zinc-900 text-white text-sm px-2 py-2 rounded-md whitespace-pre-wrap max-w-xl ${
          isSameUser ? "mt-0.5" : ""
        }`}
      >
        <div className="text-xs text-zinc-400 mb-0.5">
          {!isSameUser && `${comment.user.name} • `}
          {timeAgo(new Date(comment.createdAt))}
        </div>

        {renderCommentWithLinks(comment.content)}

        {comment.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.files.map((file: any) => (
              <a
                key={file.id}
                href={file.source === "S3" ? `/api/files/${file.id}` : file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs pr-2 pl-1 py-1 rounded-full hover:bg-zinc-700 transition-colors"
              >
                <svg
                    className="w-3 h-3 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12.79V7a5 5 0 00-10 0v9a3 3 0 006 0V9"
                    />
                  </svg>{file.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Papperskorgen */}
      {isMine && showDelete && (
        <div className="absolute -left-0.5 top-0 z-50">
          <button
            type="submit"
            onClick={(e) => {
              e.stopPropagation();
              // Ta bort preventDefault om du inte behöver det för annat
              handleDeleteClick(); // Anropa den nya funktionen
            }}
            className="block text-left px-2 py-2 text-sm text-zinc-400 hover:text-zinc-500 bg-zinc-800 rounded-full shadow-lg"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M22 5a1 1 0 0 1-1 1H3a1 1 0 0 1 0-2h5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h5a1 1 0 0 1 1 1ZM4.934 21.071 4 8h16l-.934 13.071a1 1 0 0 1-1 .929H5.931a1 1 0 0 1-.997-.929ZM15 18a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

import { useLongHoverPress } from "../hooks/useLongHoverPress";
import Avatar from "../components/avatar";
import { useFetcher } from "@remix-run/react";
import toast from "react-hot-toast";
import { useState, useEffect, useRef } from "react";
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

function renderLexicalJsonToReact(json: any): React.ReactNode {
  const root = json.root ?? json;
  if (!root || root.type !== "root" || !Array.isArray(root.children)) {
    return null;
  }

  const output: React.ReactNode[] = [];
  let key = 0;

  for (const node of root.children) {
    if (node.type === "paragraph" && Array.isArray(node.children)) {
      const parts: React.ReactNode[] = [];

      for (const child of node.children) {
        if (child.type === "text") {
          let className = "";
          if (child.format) {
            if (child.format & 1) className += " font-bold";
            if (child.format & 2) className += " italic";
            if (child.format & 4) className += " underline";
            if (child.format & 8) className += " line-through";
            if (child.format & 16)
              className += " font-mono bg-zinc-800 px-1 rounded";
          }

          parts.push(
            <span key={key++} className={className.trim()}>
              {child.text}
            </span>
          );
        }

        if (child.type === "inline-badge") {
          const { text, url } = child;
          const badgeClass =
            "inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs pr-2 pl-1 py-1 rounded-full hover:bg-zinc-700 transition-colors";

          if (url) {
            parts.push(
              <a
                key={key++}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={badgeClass}
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
                </svg>{" "}
                {text}
              </a>
            );
          } else {
            parts.push(
              <span key={key++} className={badgeClass}>
                {text}
              </span>
            );
          }

          parts.push(<span key={key++}> </span>);
        }
      }

      output.push(
        <div
          key={key++}
          className="mb-2 leading-snug whitespace-pre-wrap break-words"
        >
          {parts}
        </div>
      );
    }
  }

  return output;
}

export function CommentContent({ content }: { content: any }) {
  const MAX_HEIGHT = 80;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setIsOverflowing(containerRef.current.scrollHeight > MAX_HEIGHT);
    }
  }, [content]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ maxHeight: isExpanded ? "none" : MAX_HEIGHT }}
        className={`transition-all overflow-hidden`}
      >
        <div className="leading-snug whitespace-pre-wrap break-words space-y-1">
          {renderLexicalJsonToReact(content)}
        </div>
      </div>

      {!isExpanded && isOverflowing && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" />
      )}

      {isOverflowing && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-400 hover:text-white mt-2"
        >
          {isExpanded ? "Visa mindre" : "Visa mer"}
        </button>
      )}
    </div>
  );
}

export function CommentBubble({
  comment,
  prevUserId,
  dbUserId,
  deleteFetcher,
}: {
  comment: any;
  prevUserId?: string;
  dbUserId?: string;
  deleteFetcher: FetcherWithComponents<{
    success: boolean;
    deletedCommentId?: string;
    error?: string;
  }>;
}) {
  const isMine = comment.user.id === dbUserId;
  const isSameUser = prevUserId === comment.user.id;
  const [isVisible, setIsVisible] = useState(true);
  const { activeId, bind, clear } = useLongHoverPress(500);
  const bindProps = bind(comment.id);
  const showMenu = activeId === comment.id;

  const handleDeleteClick = () => {
    setIsVisible(false);
    deleteFetcher.submit(null, {
      method: "post",
      action: `/api/comments/${comment.id}/soft-delete`,
    });
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative group flex items-end gap-2  ${
        isMine ? "justify-end" : "justify-start"
      }`}
      {...(isMine ? bindProps : {})}
    >
      {!isMine && !isSameUser ? (
        <Avatar user={comment.user} size={8} />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div
        className={`relative w-full ${
          isMine ? "max-w-[75vw] ml-auto" : "max-w-[75vw] mr-auto"
        }`}
      >
        <div
          className={`rounded-xl px-4 py-2 text-sm leading-snug ${
            isMine
              ? "bg-emerald-950 text-white"
              : "bg-zinc-900 text-white text-sm"
          }`}
        >
          <div className="text-xs text-zinc-400 mb-1">
            {!isMine && !isSameUser && `${comment.user.name} • `}
            {timeAgo(new Date(comment.createdAt))}
          </div>

          <CommentContent content={JSON.parse(comment.content)} />

          {comment.files.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 flex-1 overflow-y-auto px-4 pt-4">
              {comment.files.map((file: any) => (
                <a
                  key={file.id}
                  href={
                    file.source === "S3" ? `/api/files/${file.id}` : file.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-zinc-700 text-zinc-300 text-xs pr-2 pl-1 py-1 rounded-full hover:bg-zinc-600 transition-colors"
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
                  </svg>
                  {file.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {isMine && showMenu && (
          <>
            <div className="hidden sm:flex absolute -top-3 -right-0 flex items-center gap-1 bg-white rounded-lg shadow-lg pl-1 pr-1 z-50">
              <button
                onClick={() => console.log("Redigera")}
                className="text-zinc-300 hover:text-white p-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-zinc-500 hover:text-zinc-800"
                >
                  <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.34-2.34a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Ta bort preventDefault om du inte behöver det för annat
                  handleDeleteClick(); // Anropa den nya funktionen
                }}
                className="text-zinc-500 hover:text-zinc-800 p-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M22 5a1 1 0 0 1-1 1H3a1 1 0 0 1 0-2h5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h5a1 1 0 0 1 1 1ZM4.934 21.071 4 8h16l-.934 13.071a1 1 0 0 1-1 .929H5.931a1 1 0 0 1-.997-.929ZM15 18a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Z" />
                </svg>
              </button>
            </div>
            {/* Mobil meny – visas endast på små skärmar */}
            <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
              {/* Klick utanför stänger */}
              <div className="absolute inset-0" onClick={() => clear()} />

              <div
                className="w-full bg-zinc-900 rounded-t-2xl p-4 z-10 space-y-4"
                style={{
                  transform: "translateY(0%)",
                  opacity: 1,
                  transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
                }}
              >
                <button
                  onClick={() => console.log("Redigera")}
                  className="flex items-center space-x-3 text-white hover:text-green-400 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-zinc-400"
                  >
                    <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.34-2.34a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                  <span className="text-sm font-medium">Redigera</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick();
                  }}
                  className="flex items-center space-x-3 text-white hover:text-red-400 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-zinc-400"
                  >
                    <path d="M22 5a1 1 0 0 1-1 1H3a1 1 0 0 1 0-2h5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h5a1 1 0 0 1 1 1ZM4.934 21.071 4 8h16l-.934 13.071a1 1 0 0 1-1 .929H5.931a1 1 0 0 1-.997-.929ZM15 18a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Zm-4 0a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0Z" />
                  </svg>
                  <span className="text-sm font-medium">Ta bort</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

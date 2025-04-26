import React, { useEffect, useState, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  $createParagraphNode,
  $getRoot,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  DecoratorNode,
  LexicalEditor,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import {
  ListNode,
  ListItemNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";

type SharepointFilePayload = {
  url: string;
  name: string;
  source: "SHAREPOINT";
};

class InlineBadgeNode extends DecoratorNode<JSX.Element> {
  __text: string;
  __url: string | null;
  __source: string | null;

  static getType(): string {
    return "inline-badge";
  }

  static clone(node: InlineBadgeNode): InlineBadgeNode {
    return new InlineBadgeNode(
      node.__text,
      node.__url,
      node.__source,
      node.__key
    );
  }

  constructor(
    text: string,
    url?: string | null,
    source?: string | null,
    key?: string
  ) {
    super(key);
    this.__text = text;
    this.__url = url ?? null;
    this.__source = source ?? null;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700 text-white mr-1";
    span.textContent = this.__text;
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    const className =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700 text-white mr-1";

    if (this.__url) {
      return (
        <a
          href={this.__url}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onMouseDown={(e) => e.preventDefault()}
        >
          {this.__text}
        </a>
      );
    }

    return <span className={className}>{this.__text}</span>;
  }

  exportJSON(): any {
    return {
      type: "inline-badge",
      version: 1,
      text: this.__text,
      url: this.__url,
      source: this.__source,
    };
  }

  static importJSON(json: any): InlineBadgeNode {
    return new InlineBadgeNode(
      json.text,
      json.url ?? null,
      json.source ?? null,
      json.key
    );
  }

  isInline(): boolean {
    return true;
  }
}

function $createInlineBadgeNode(
  text: string,
  url?: string,
  source?: string
): InlineBadgeNode {
  return new InlineBadgeNode(text, url, source);
}

export function extractLinkedFiles(content: string) {
  const results: { url: string; source: string; name: string }[] = [];

  const sharepointRegex = /https:\/\/[\w.-]+\.sharepoint\.com\/[^\s)"]+/g;
  const matches = content.match(sharepointRegex) ?? [];

  for (const url of matches) {
    results.push({
      url,
      source: "SHAREPOINT",
      name: extractNameFromUrl(url),
    });
  }

  return results;
}
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // 1. Försök ta "file" param (fungerar t.ex. för .xlsx)
    const file = urlObj.searchParams.get("file");
    if (file) {
      try {
        return decodeURIComponent(decodeURIComponent(file));
      } catch {
        return decodeURIComponent(file);
      }
    }

    // 2. Om wd=target(...) och första delen är en .one – använd den
    const wd = urlObj.searchParams.get("wd");
    if (wd?.startsWith("target(")) {
      const decodedOnce = decodeURIComponent(wd);
      const decodedTwice = decodeURIComponent(decodedOnce);
      const inner = decodedTwice.slice("target(".length, -1); // strip "target(" and ")"
      const parts = inner.split("|");
      if (parts.length >= 1 && parts[0].endsWith(".one")) {
        return parts[0].trim();
      }
    }

    // 3. Annars försök hämta sista path-segment
    const pathParts = urlObj.pathname.split("/");
    return decodeURIComponent(pathParts[pathParts.length - 1]);
  } catch {
    return "unknown";
  }
}

const IconButton = ({
  isActive,
  onClick,
  title,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors 
        ${
          isActive
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-zinc-700 text-white hover:bg-zinc-600"
        } focus:outline-none focus:ring-2 focus:ring-green-500`}
  >
    {children}
  </button>
);

const BoldIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13.5 12A3.5 3.5 0 0 0 12 5H7a1 1 0 0 0 0 2h5a1.5 1.5 0 0 1 0 3H7a1 1 0 0 0 0 2h5.5a1.5 1.5 0 0 1 0 3H7a1 1 0 0 0 0 2h5.5a3.5 3.5 0 0 0 1-6.9z" />
  </svg>
);

const ItalicIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 4v2h2.21l-3.42 12H6v2h8v-2h-2.21l3.42-12H18V4z" />
  </svg>
);

const UnderlineIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 20v-2h14v2H5zm7-4a5 5 0 0 0 5-5V4h-2v7a3 3 0 0 1-6 0V4H7v7a5 5 0 0 0 5 5z" />
  </svg>
);

const StrikethroughIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 10v2h16v-2H4zm8 6c-1.93 0-3-.64-3-1.5 0-.44.21-.82.55-1.13l-1.62-1.2A3.77 3.77 0 0 0 7 14.5c0 2.04 2.25 3.5 5 3.5s5-1.46 5-3.5h-2c0 .86-1.07 1.5-3 1.5z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8.7 16.7 4.4 12l4.3-4.7-1.4-1.4L1.6 12l5.7 6.1 1.4-1.4zm6.6 0 1.4 1.4 5.7-6.1-5.7-6.1-1.4 1.4 4.3 4.7-4.3 4.7z" />
  </svg>
);

const BulletListIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="5" cy="18" r="1.5" />
    <rect x="9" y="5" width="12" height="2" rx="1" />
    <rect x="9" y="11" width="12" height="2" rx="1" />
    <rect x="9" y="17" width="12" height="2" rx="1" />
  </svg>
);

const NumberedListIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <text x="3" y="8" fontSize="6" fill="currentColor">
      1.
    </text>
    <text x="3" y="14" fontSize="6" fill="currentColor">
      2.
    </text>
    <text x="3" y="20" fontSize="6" fill="currentColor">
      3.
    </text>
    <rect x="9" y="5" width="12" height="2" rx="1" />
    <rect x="9" y="11" width="12" height="2" rx="1" />
    <rect x="9" y="17" width="12" height="2" rx="1" />
  </svg>
);
/* ----------- Toolbar-komponenten ----------- */

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    isBulletList: false,
    isNumberList: false,
  });

  useEffect(() => {
    const updateToolbar = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const topLevel = anchorNode.getTopLevelElementOrThrow();

        const isList = $isListNode(topLevel);
        const listType = isList ? topLevel.getListType?.() : null;

        setFormats({
          bold: selection.hasFormat("bold"),
          italic: selection.hasFormat("italic"),
          underline: selection.hasFormat("underline"),
          strikethrough: selection.hasFormat("strikethrough"),
          isBulletList: listType === "bullet",
          isNumberList: listType === "number",
        });
      }
    };

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        updateToolbar,
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  return (
    <div className="flex items-center gap-1 px-1.5 py-2 border-b border-zinc-800 bg-zinc-900 rounded-t-md">
      <IconButton
        title="Bold"
        isActive={formats.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <BoldIcon />
      </IconButton>
      <IconButton
        title="Italic"
        isActive={formats.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <ItalicIcon />
      </IconButton>
      <IconButton
        title="Underline"
        isActive={formats.underline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
      >
        <UnderlineIcon />
      </IconButton>
      <IconButton
        title="Strikethrough"
        isActive={formats.strikethrough}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
      >
        <StrikethroughIcon />
      </IconButton>
      <IconButton
        title="Punktlista"
        isActive={formats.isBulletList}
        onClick={() => {
          editor.dispatchCommand(
            formats.isBulletList
              ? REMOVE_LIST_COMMAND
              : INSERT_UNORDERED_LIST_COMMAND,
            undefined
          );
        }}
      >
        <BulletListIcon />
      </IconButton>

      <IconButton
        title="Numrerad lista"
        isActive={formats.isNumberList}
        onClick={() => {
          editor.dispatchCommand(
            formats.isNumberList
              ? REMOVE_LIST_COMMAND
              : INSERT_ORDERED_LIST_COMMAND,
            undefined
          );
        }}
      >
        <NumberedListIcon />
      </IconButton>
    </div>
  );
}

/* ----------- Paste Plugin (Modifierad med Async Insertion) ----------- */

const checkHasContent = () => {
  const root = $getRoot();

  for (const node of root.getChildren()) {
    const nodeType = node.getType();

    if (nodeType === "list") {
      // För listor, kolla varje ListItemNode
      for (const item of node.getChildren()) {
        for (const child of item.getChildren()) {
          if (
            child.getType() === "text" &&
            child.getTextContent().trim() !== ""
          ) {
            return true;
          }
        }
      }
    } else {
      // För vanliga paragraphs etc
      for (const child of node.getChildren()) {
        if (
          (child.getType() === "text" &&
            child.getTextContent().trim() !== "") ||
          child.getType() === "inline-badge"
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

function SharepointPastePlugin({
  setFiles,
}: {
  setFiles: React.Dispatch<React.SetStateAction<SharepointFilePayload[]>>;
}) {
  // SSR-safe: kör bara i browser
  if (typeof window === "undefined") {
    return null;
  }

  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        // 1) Hämta text/plain
        const plain = event.clipboardData?.getData("text/plain") || "";
        const links = extractLinkedFiles(plain);

        if (links.length === 0) {
          // Låt Lexical hantera vanlig paste
          return false;
        }

        // 2) Stoppa default-paste
        event.preventDefault();

        // 3) Bygg file‑payloads och uppdatera React‑state
        //const filesToInsert = matches.map((m) =>
        //  extractSharepointFile(m[0])
        //);
        setFiles((prev) => [...prev, ...links]);

        // 4) Synkront: infoga noderna
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          const parent = selection.anchor.getNode().getTopLevelElementOrThrow();

          if (parent.getType() !== "paragraph") {
            // Force everything into a new paragraph
            const p = $createParagraphNode();
            for (const file of links) {
              p.append(
                $createInlineBadgeNode(file.name, file.url, file.source)
              );
              p.append($createTextNode(" "));
            }
            $getRoot().append(p);
            return;
          }

          // Inline insert
          for (const file of links) {
            selection.insertNodes([
              $createInlineBadgeNode(file.name, file.url, file.source),
            ]);
            selection.insertText(" ");
          }
        });

        // 5) Stoppa övriga paste–handlers
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      unregister();
    };
  }, [editor, setFiles]);

  return null;
}

export default SharepointPastePlugin;
/* ----------- Blur Plugin ----------- */
// BlurPlugin förblev oförändrad

function BlurPlugin({
  files,
  onBlur,
}: {
  files: SharepointFilePayload[];
  onBlur: (data: { json: any; files: SharepointFilePayload[] }) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Använd gärna useRef för att fånga elementet istället för querySelector om möjligt
    // Men querySelector fungerar oftast bra här
    const el = document.querySelector('[contenteditable="true"]');
    if (!el) {
      console.warn("ContentEditable element hittades inte för BlurPlugin.");
      return;
    }

    const handleBlur = () => {
      editor.update(() => {
        const json = editor.getEditorState().toJSON();
        onBlur({ json, files }); // Skicka både editor state JSON och fil-listan
      });
    };

    el.addEventListener("blur", handleBlur);

    // Cleanup function för att ta bort event listener
    return () => {
      el.removeEventListener("blur", handleBlur);
    };
  }, [editor, files, onBlur]); // Beroenden: editor, files, onBlur

  return null; // Pluginet renderar inget
}

function CanPostPlugin({
  onCanPostChange,
}: {
  onCanPostChange: (canPost: boolean) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    requestAnimationFrame(() => {
      onCanPostChange(null);
      editor.update(() => {});
    });
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const hasContent = checkHasContent();
        onCanPostChange(hasContent);
      });
    });
  }, [editor, onCanPostChange]);

  return null;
}

function EditorFocusPlugin({ shouldFocus }: { shouldFocus: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (shouldFocus && editor) {
      const timer = setTimeout(() => {
        editor.focus(() => {
          editor.update(() => {
            const root = $getRoot();
            root.selectEnd();
          });
        });
      }, 50);

      return () => clearTimeout(timer); 
    }
  }, [shouldFocus, editor]);

  return null; 
}


export function RichTextJsonEditor({
  isEditing,
  initialJson,
  onBlur,
  onCanPostChange,
}: {
  isEditing: boolean,
  initialJson?: any;
  onBlur: (result: { json: any; files: SharepointFilePayload[] }) => void;
  onCanPostChange?: (canPost: boolean) => void;
}) {
  const [files, setFiles] = useState<SharepointFilePayload[]>([]);
  const [focus, setFocus] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  const initialConfig = {
    namespace: "Editor",

    theme: {
      paragraph: "font-light text-zinc-300 text-sm leading-snug",
      text: {
        bold: "font-bold text-white",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "font-mono bg-zinc-800 px-1 rounded",
      },
    },
    onError: (error: Error) => console.error("Lexical error:", error),
    nodes: [InlineBadgeNode, ListNode, ListItemNode],
    editorState: initialJson
      ? (editor: LexicalEditor) => {
          try {
            const parsed = editor.parseEditorState(initialJson);
            editor.setEditorState(parsed);
          } catch (e) {
            console.error("Kunde inte ladda initial JSON:", e);
            editor.setEditorState(editor.parseEditorState(null));
          }
        }
      : undefined,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border border-zinc-700 rounded-md bg-zinc-900">
        <Toolbar />
        <div className="relative p-2 max-h-30 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                ref={editableRef}
                onFocus={() => {
                  setFocus(true);
                  setTimeout(() => {
                    editableRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }, 100);
                }}
                onBlur={() => setFocus(false)}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
                className="peer w-full text-sm text-zinc-300 font-light bg-transparent outline-none placeholder-zinc-500 px-3 py-2 min-h-[36px] leading-snug
    [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:pl-4 [&_ul]:text-zinc-300
    [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:pl-4 [&_ol]:text-zinc-300
    [&_li]:ml-2 [&_li]:leading-snug select-text focus:outline-none"
                aria-placeholder="Skriv en kommentar..."
                suppressContentEditableWarning
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
                style={{
                  WebkitTouchCallout: "none", // Disable iOS copy/define
                  WebkitUserSelect: "text", // Tillåt markering men undvik system-popup
                  userSelect: "test",
                }}
              />
            }
            placeholder={
              !focus && (
                <div className="absolute top-2.5 left-3 text-zinc-500 text-sm pointer-events-none">
                  Skriv en kommentar...
                </div>
              )
            }
            ErrorBoundary={() => ""}
          />
          <ListPlugin />
          <SharepointPastePlugin setFiles={setFiles} />
          <BlurPlugin files={files} onBlur={onBlur} />
          <HistoryPlugin />
          <CanPostPlugin onCanPostChange={onCanPostChange ?? (() => {})} />
          <EditorFocusPlugin shouldFocus={isEditing ?? false} />
        </div>
      </div>
    </LexicalComposer>
  );
}

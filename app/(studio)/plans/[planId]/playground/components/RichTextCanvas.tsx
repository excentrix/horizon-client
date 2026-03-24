"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const lowlight = createLowlight();

interface RichTextCanvasProps {
  /** Unique key used to persist content in localStorage across page refreshes */
  storageKey: string;
  /** Controlled value (Markdown string) — controlled by parent  */
  value?: string;
  /** Called whenever editor content changes (debounced 500ms) */
  onChange?: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={title}
      className={cn("h-7 w-7", active && "bg-muted text-primary")}
    >
      {children}
    </Button>
  );
}

export function RichTextCanvas({
  storageKey,
  value,
  onChange,
  placeholder = "Start writing here…",
  className,
}: RichTextCanvasProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-6 py-4",
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText();
      // Auto-save raw text to localStorage every update
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`canvas:${storageKey}`, editor.getHTML());
      }
      onChange?.(text);
    },
  });

  // Restore from localStorage on mount
  useEffect(() => {
    if (!editor) return;
    const saved =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(`canvas:${storageKey}`)
        : null;
    if (saved) {
      editor.commands.setContent(saved);
    } else if (value) {
      editor.commands.setContent(value);
    }
  }, [editor, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col rounded-lg border bg-white dark:bg-card overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1 bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        {([1, 2, 3] as const).map((level) => {
          const icons = { 1: Heading1, 2: Heading2, 3: Heading3 };
          const Icon = icons[level];
          return (
            <ToolbarButton
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              active={editor.isActive("heading", { level })}
              title={`Heading ${level}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </ToolbarButton>
          );
        })}
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code block"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto [&_.ProseMirror[data-placeholder]:empty::before]:content-[attr(data-placeholder)] [&_.ProseMirror[data-placeholder]:empty::before]:text-muted-foreground [&_.ProseMirror[data-placeholder]:empty::before]:pointer-events-none [&_.ProseMirror[data-placeholder]:empty::before]:float-left"
      />
    </div>
  );
}

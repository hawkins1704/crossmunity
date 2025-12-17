import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { HiLink } from "react-icons/hi";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe la descripción de la actividad...",
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Deshabilitar heading para no tener tamaños de fuente
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph", "table"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  // Actualizar contenido cuando cambia externamente
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Cerrar dropdowns al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".rich-text-editor-toolbar")) {
        setShowLinkInput(false);
      }
    };

    if (showLinkInput) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showLinkInput]);

  if (!editor) {
    return null;
  }

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const handleInsertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white relative">
      {/* Toolbar - Primera fila */}
      <div className="rich-text-editor-toolbar flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-wrap">
        {/* Formato de texto básico */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-colors font-bold ${
              editor.isActive("bold")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Negrita"
          >
            <span className="text-sm">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-colors italic ${
              editor.isActive("italic")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Cursiva"
          >
            <span className="text-sm">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("underline")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Subrayado"
          >
            <span className="text-sm font-semibold underline">U</span>
          </button>
        </div>

        {/* Alineación */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive({ textAlign: "left" })
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Alinear izquierda"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="11" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive({ textAlign: "center" })
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Centrar"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="5" y1="10" x2="15" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive({ textAlign: "right" })
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Alinear derecha"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="9" y1="15" x2="17" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Justificar"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
        </div>

        {/* Enlaces y tablas */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const url = editor.getAttributes("link").href;
                if (url) {
                  setLinkUrl(url);
                }
                setShowLinkInput(!showLinkInput);
              }}
              className={`p-2 rounded-lg transition-colors ${
                editor.isActive("link")
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-200 text-gray-700"
              }`}
              title="Insertar enlace"
            >
              <HiLink className="h-4 w-4" />
            </button>
            {showLinkInput && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 min-w-[300px]">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSetLink();
                    }
                    if (e.key === "Escape") {
                      setShowLinkInput(false);
                      setLinkUrl("");
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSetLink}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnsetLink}
                    className="flex-1 px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleInsertTable}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("table")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Insertar tabla"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3h16a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm2 2v4h4V5H4zm6 0v4h4V5h-4zm-6 6v4h4v-4H4zm6 0v4h4v-4h-4z" />
            </svg>
          </button>
        </div>

        {/* Listas */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("bulletList")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Lista con viñetas"
          >
            <span className="text-sm">•</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("orderedList")
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Lista numerada"
          >
            <span className="text-sm">1.</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}


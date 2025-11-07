import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva aqui...",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    // Initialize Quill
    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder,
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ color: [] }, { background: [] }],
          ["link"],
          ["clean"],
        ],
      },
    });

    // Set initial value
    if (value) {
      quillRef.current.root.innerHTML = value;
    }

    // Listen for text changes
    quillRef.current.on("text-change", () => {
      if (quillRef.current) {
        const html = quillRef.current.root.innerHTML;
        onChange(html);
      }
    });

    // Cleanup
    return () => {
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when value prop changes externally
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const selection = quillRef.current.getSelection();
      quillRef.current.root.innerHTML = value;
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <div className={`rich-text-editor ${className}`}>
      <div ref={editorRef} />
    </div>
  );
}


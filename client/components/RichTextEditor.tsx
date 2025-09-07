import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-[160px] w-full rounded-md border border-sis-border bg-white p-3 text-sm focus:outline-none",
        className,
      )}
      contentEditable
      data-placeholder={placeholder}
      onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      suppressContentEditableWarning
    />
  );
}

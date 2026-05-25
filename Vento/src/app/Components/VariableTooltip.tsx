"use client";

import { useEffect, useId, useRef, useState } from "react";

interface VariableTooltipProps {
  definition: string;
}

export default function VariableTooltip({ definition }: VariableTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Ver definición de variable"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#165170ff] text-[11px] font-bold text-[#165170ff] transition-colors hover:bg-[#165170ff] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#165170ff]/40"
      >
        i
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute right-0 top-6 z-20 w-64 rounded border border-gray-200 bg-white px-3 py-2 text-left text-xs leading-snug text-gray-700 shadow-lg"
        >
          {definition}
        </span>
      )}
    </span>
  );
}

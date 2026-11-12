import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "rr:tile:";
const BULK_EVENT = "rr-tiles";

type BulkAction = "collapse" | "expand";

/** Closes or opens every CollapsibleTile on the page (and remembers it for each). */
export const setAllTiles = (action: BulkAction) => window.dispatchEvent(new CustomEvent<BulkAction>(BULK_EVENT, { detail: action }));

const readStored = (id: string, fallback: boolean) => {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + id);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
};

const writeStored = (id: string, open: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, open ? "1" : "0");
  } catch {
    /* storage can be blocked; the tile still works for this visit */
  }
};

interface Props {
  /** Stable key for remembering the open/closed state. */
  id: string;
  title: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Small element next to the title that stays visible when collapsed (e.g. a count badge). */
  aside?: ReactNode;
  children: ReactNode;
  "data-tutorial"?: string;
}

/** A Card whose body folds away behind its title; the choice survives a reload. */
export function CollapsibleTile({ id, title, defaultOpen = true, className, aside, children, "data-tutorial": tutorial }: Props) {
  const [open, setOpen] = useState(() => readStored(id, defaultOpen));

  useEffect(() => {
    const onBulk = (event: Event) => {
      const next = (event as CustomEvent<BulkAction>).detail === "expand";
      setOpen(next);
      writeStored(id, next);
    };
    window.addEventListener(BULK_EVENT, onBulk);
    return () => window.removeEventListener(BULK_EVENT, onBulk);
  }, [id]);

  const toggle = () => {
    setOpen((prev) => {
      writeStored(id, !prev);
      return !prev;
    });
  };

  return (
    <Card data-tutorial={tutorial} className={cn("rounded-lg border border-border bg-secondary/20 p-4", open && "space-y-3", className)}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <span className="flex items-center gap-2">
          {aside}
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && children}
    </Card>
  );
}

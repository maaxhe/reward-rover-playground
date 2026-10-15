import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  level?: number;
  translate: (de: string, en: string) => string;
}

/** Small anonymous "what annoyed you?" box. Answers land in server/data/feedback.jsonl. */
export function FeedbackNote({ level, translate: t }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async () => {
    if (!text.trim()) return;
    setState("sending");
    try {
      const base = import.meta.env.VITE_API_BASE ?? "";
      const res = await fetch(`${base}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setText("");
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        {t("Was nervt dich oder fehlt dir?", "What annoys you or is missing?")}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
      <label htmlFor="rr-feedback" className="text-sm font-semibold text-foreground">
        {t("Was nervt dich oder fehlt dir?", "What annoys you or is missing?")}
      </label>
      <textarea
        id="rr-feedback"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        maxLength={600}
        rows={3}
        placeholder={t("Schreib einfach, was du denkst. Das geht anonym raus.", "Just write what you think. It's sent anonymously.")}
        className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={send} disabled={!text.trim() || state === "sending"}>
          {t("Abschicken", "Send")}
        </Button>
        {state === "sent" && <span className="text-xs text-muted-foreground">{t("Angekommen, danke.", "Got it, thanks.")}</span>}
        {state === "error" && <span className="text-xs text-destructive">{t("Hat nicht geklappt.", "Didn't work.")}</span>}
      </div>
    </div>
  );
}

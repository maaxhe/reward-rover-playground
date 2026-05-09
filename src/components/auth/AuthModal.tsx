import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, AuthResponse } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (res: AuthResponse) => void;
}

type Tab = "login" | "register";

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUsername("");
    setPassword("");
    setError("");
    setLoading(false);
  };

  const handleTabChange = (v: string) => {
    setTab(v as Tab);
    setError("");
  };

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res =
        tab === "login"
          ? await api.login(username.trim(), password)
          : await api.register(username.trim(), password);
      reset();
      onSuccess(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Anmelden.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { reset(); onClose(); }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Konto</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-2">
            <TabsTrigger value="login" className="flex-1">
              Anmelden
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Registrieren
            </TabsTrigger>
          </TabsList>

          {(["login", "register"] as Tab[]).map((t) => (
            <TabsContent key={t} value={t} className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${t}-username`}>Benutzername</Label>
                <Input
                  id={`${t}-username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="benutzername"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${t}-password`}>Passwort</Label>
                <Input
                  id={`${t}-password`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="••••••••"
                  autoComplete={t === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={submit}
                disabled={loading}
                className="w-full"
              >
                {loading
                  ? "..."
                  : t === "login"
                  ? "Anmelden"
                  : "Konto erstellen"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

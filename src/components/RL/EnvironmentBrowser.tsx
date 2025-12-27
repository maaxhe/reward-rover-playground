import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Download, Save } from "lucide-react";

interface SavedEnvironment {
  id: number;
  name: string | null;
  gridConfig: any;
  progressData: any;
  createdAt: string;
}

interface EnvironmentBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  apiBase: string;
  onLoadEnvironment: (gridConfig: any, progressData: any) => void;
  currentGridConfig: any;
  currentProgressData: any;
  translate: (de: string, en: string) => string;
}

export const EnvironmentBrowser = ({
  open,
  onOpenChange,
  authToken,
  apiBase,
  onLoadEnvironment,
  currentGridConfig,
  currentProgressData,
  translate,
}: EnvironmentBrowserProps) => {
  const [environments, setEnvironments] = useState<SavedEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const getPreviewTileClass = (type: string) => {
    switch (type) {
      case "reward":
        return "bg-tile-reward";
      case "punishment":
        return "bg-tile-punishment";
      case "obstacle":
        return "bg-tile-obstacle";
      case "portal":
        return "bg-tile-portal";
      case "goal":
        return "bg-tile-goal";
      case "agent":
        return "bg-tile-agent";
      default:
        return "bg-tile-empty";
    }
  };

  const renderEnvironmentPreview = (gridConfig: SavedEnvironment["gridConfig"]) => {
    if (!gridConfig?.size) return null;
    const size = gridConfig.size;
    const tileSize = Math.max(6, Math.floor(80 / size));
    const tileLookup = new Map<string, string>();
    if (Array.isArray(gridConfig.tiles)) {
      gridConfig.tiles.forEach((tile: { x: number; y: number; type: string }) => {
        tileLookup.set(`${tile.x}-${tile.y}`, tile.type);
      });
    }

    return (
      <div
        className="grid bg-tile-bg rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${size}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${size}, ${tileSize}px)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: size * size }, (_, index) => {
          const x = index % size;
          const y = Math.floor(index / size);
          const isAgent = gridConfig.agent?.x === x && gridConfig.agent?.y === y;
          const isGoal = gridConfig.goal?.x === x && gridConfig.goal?.y === y;
          const tileType = isGoal ? "goal" : isAgent ? "agent" : tileLookup.get(`${x}-${y}`) || "empty";
          return (
            <div
              key={`${x}-${y}`}
              className={`rounded-[2px] ${getPreviewTileClass(tileType)}`}
              style={{ width: tileSize, height: tileSize }}
            />
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (open && authToken) {
      loadEnvironments();
    }
  }, [open, authToken]);

  const loadEnvironments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/load`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEnvironments(data.items || []);
      } else {
        toast.error(translate("Fehler beim Laden", "Failed to load"));
      }
    } catch (error) {
      toast.error(translate("Server nicht erreichbar", "Server not reachable"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error(translate("Bitte Namen eingeben", "Please enter a name"));
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: saveName,
          gridConfig: currentGridConfig,
          progressData: currentProgressData,
        }),
      });

      if (response.ok) {
        toast.success(translate("Umgebung gespeichert!", "Environment saved!"));
        setSaveName("");
        setSaveDialogOpen(false);
        loadEnvironments();
      } else {
        toast.error(translate("Fehler beim Speichern", "Failed to save"));
      }
    } catch (error) {
      toast.error(translate("Server nicht erreichbar", "Server not reachable"));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${apiBase}/api/save/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast.success(translate("Umgebung gelöscht", "Environment deleted"));
        setEnvironments(environments.filter((env) => env.id !== id));
      } else {
        toast.error(translate("Fehler beim Löschen", "Failed to delete"));
      }
    } catch (error) {
      toast.error(translate("Server nicht erreichbar", "Server not reachable"));
    } finally {
      setDeleteId(null);
    }
  };

  const handleLoad = (env: SavedEnvironment) => {
    onLoadEnvironment(env.gridConfig, env.progressData);
    toast.success(
      translate(
        `"${env.name || "Umgebung"}" geladen`,
        `"${env.name || "Environment"}" loaded`
      )
    );
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {translate("Meine Umgebungen", "My Environments")}
            </DialogTitle>
            <DialogDescription>
              {translate(
                "Lade gespeicherte Umgebungen oder speichere die aktuelle",
                "Load saved environments or save the current one"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setSaveDialogOpen(true)} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {translate("Aktuelle Umgebung speichern", "Save Current Environment")}
            </Button>

            {loading ? (
              <p className="text-center text-muted-foreground">
                {translate("Lädt...", "Loading...")}
              </p>
            ) : environments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {translate(
                      "Noch keine Umgebungen gespeichert",
                      "No environments saved yet"
                    )}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {environments.map((env) => (
                  <Card key={env.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {env.name || (
                              <span className="text-muted-foreground italic">
                                {translate("Unbenannt", "Unnamed")}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {translate("Gespeichert am", "Saved on")}{" "}
                            {new Date(env.createdAt).toLocaleDateString()} {" "}
                            {new Date(env.createdAt).toLocaleTimeString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoad(env)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {translate("Laden", "Load")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(env.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap items-start gap-3">
                        {renderEnvironmentPreview(env.gridConfig)}
                        <div className="flex flex-col gap-2">
                          {env.gridConfig?.size && (
                            <span className="text-xs text-muted-foreground">
                              {translate("Größe", "Size")}: {env.gridConfig.size} x {env.gridConfig.size}
                            </span>
                          )}
                          {env.progressData && (
                            <Badge variant="outline" className="text-xs w-fit">
                              {translate("Mit Fortschritt", "With Progress")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate("Umgebung speichern", "Save Environment")}
            </DialogTitle>
            <DialogDescription>
              {translate(
                "Gib deiner Umgebung einen Namen",
                "Give your environment a name"
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">
                {translate("Name", "Name")}
              </Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={translate("z.B. Schweres Level", "e.g. Hard Level")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                {translate("Abbrechen", "Cancel")}
              </Button>
              <Button onClick={handleSave}>
                {translate("Speichern", "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("Umgebung löschen?", "Delete Environment?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate(
                "Diese Aktion kann nicht rückgängig gemacht werden.",
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {translate("Abbrechen", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate("Löschen", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

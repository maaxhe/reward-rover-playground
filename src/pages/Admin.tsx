import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ArrowLeft } from "lucide-react";
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

interface User {
  id: number;
  username: string;
  role: string;
  email: string | null;
  provider: string;
}

interface Environment {
  id: number;
  name: string | null;
  username: string;
  gridConfig: any;
  progressData: any;
  createdAt: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("rr_token");
  });
  const [authUser, setAuthUser] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("rr_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEnvId, setDeleteEnvId] = useState<number | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE ?? "";

  useEffect(() => {
    if (!authToken || authUser?.role !== "admin") {
      navigate("/");
      return;
    }

    fetchData();
  }, [authToken, authUser, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, envsRes] = await Promise.all([
        fetch(`${apiBase}/api/admin/users`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${apiBase}/api/admin/environments`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (envsRes.ok) {
        const data = await envsRes.json();
        setEnvironments(data.environments || []);
      }
    } catch (error) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnvironment = async (id: number) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/environments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast.success("Environment deleted");
        setEnvironments(environments.filter((env) => env.id !== id));
      } else {
        toast.error("Failed to delete environment");
      }
    } catch (error) {
      toast.error("Failed to delete environment");
    } finally {
      setDeleteEnvId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Game
          </Button>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="environments">Environments ({environments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.provider}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environment Management</CardTitle>
                <CardDescription>View and manage all user environments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {environments.map((env) => (
                      <TableRow key={env.id}>
                        <TableCell>{env.id}</TableCell>
                        <TableCell className="font-medium">
                          {env.name || <span className="text-muted-foreground italic">Unnamed</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{env.username}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(env.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEnvId(env.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteEnvId !== null} onOpenChange={() => setDeleteEnvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Environment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this environment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEnvId && handleDeleteEnvironment(deleteEnvId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;

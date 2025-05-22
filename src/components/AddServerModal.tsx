import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useServer } from "@/context/useServer";
import type { ServerStatus, Server } from "@/context/ServerContext.types";
import { toast } from "sonner";
import { saveServer, loadServers } from "@/lib/serverStorage";

const AddServerModal = () => {
  const { setServers, setSelectedServer } = useServer();

  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");

  const isFormValid =
    name && ip && sshUser && (authMethod === "password" ? password : sshKeyPath);

  const resetForm = () => {
    setName("");
    setIp("");
    setSshPort(22);
    setSshUser("");
    setPassword("");
    setSshKeyPath("");
    setAuthMethod("password");
  };

  const handleAdd = async () => {
    if (!isFormValid) return;
    setIsSaving(true);

    const newServer: Server = {
      id: Date.now().toString(),
      name,
      ip,
      sshPort,
      sshUser,
      authMethod,
      password: authMethod === "password" ? password : "",
      sshKeyPath: authMethod === "key" ? sshKeyPath : "",
      sshKey: authMethod === "key" ? sshKeyPath : "",
      type: "Custom",
      status: "offline" as ServerStatus,
    };

    try {
      // 🔥 Usa la funzione di storage semplificata
      console.log("📤 Salvando server:", newServer);
      
      await saveServer(newServer);
      
      // Ricarica tutti i server dal file per essere sicuri della sincronizzazione
      const updatedServers = await loadServers();
      setServers(updatedServers);
      
      // Seleziona il server appena aggiunto
      setSelectedServer(newServer);

      console.log("✅ Server salvato correttamente");
      toast.success("✅ Server aggiunto con successo");
      resetForm();
      setOpen(false);
    } catch (err) {
      console.error("❌ Errore durante il salvataggio:", err);
      toast.error(`❌ Errore: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm ml-auto">
          + Add Server
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogTitle>Aggiungi un nuovo server</DialogTitle>
        <DialogDescription>
          Inserisci i dati per connetterti via SSH al tuo server.
        </DialogDescription>

        <div className="space-y-3 mt-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome server</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ip">Indirizzo IP</Label>
            <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="user">Utente SSH</Label>
            <Input id="user" value={sshUser} onChange={(e) => setSshUser(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="port">Porta SSH</Label>
            <Input
              id="port"
              type="number"
              value={sshPort}
              onChange={(e) => setSshPort(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label>Metodo di autenticazione</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth"
                  value="password"
                  checked={authMethod === "password"}
                  onChange={() => setAuthMethod("password")}
                />
                Password
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth"
                  value="key"
                  checked={authMethod === "key"}
                  onChange={() => setAuthMethod("key")}
                />
                Chiave SSH
              </label>
            </div>
          </div>

          {authMethod === "password" && (
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {authMethod === "key" && (
            <div className="space-y-1">
              <Label htmlFor="key">Percorso chiave SSH</Label>
              <Input
                id="key"
                value={sshKeyPath}
                onChange={(e) => setSshKeyPath(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={handleAdd}
            className="w-full mt-2"
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? "Salvataggio..." : "Connetti"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
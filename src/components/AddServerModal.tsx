import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useServer } from "@/context/useServer";
import type { ServerStatus, Server } from "@/context/ServerContext.types";
import { saveServers } from "@/lib/serverStorage";
import { toast } from "sonner"; // ✅ notifica visiva

const AddServerModal = () => {
  const {
    servers,
    setServers,
    setSelectedServer,
  } = useServer();

  const [open, setOpen] = useState(false); // ✅ controlla apertura modale

  // Campi form
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");

  const isFormValid =
    name && ip && sshUser && (authMethod === "password" ? password : sshKeyPath);

  const resetFields = () => {
    setName("");
    setIp("");
    setSshPort(22);
    setSshUser("");
    setAuthMethod("password");
    setPassword("");
    setSshKeyPath("");
  };

  const handleAdd = async () => {
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

    const updated = [...servers, newServer];
    console.log("🆕 Nuovo server creato:", newServer);
    console.log("📦 Lista aggiornata:", updated);
    setServers(updated);
    await saveServers(updated);
    setSelectedServer(newServer);

    toast.success("✅ Server aggiunto con successo");

    setOpen(false); // ✅ chiudi modale
    resetFields();  // ✅ resetta campi
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm ml-auto">
          + Add Server
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Aggiungi un nuovo server</h2>
          <p className="text-sm text-muted-foreground">
            Inserisci i dati per connetterti via SSH.
          </p>
        </div>

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

          <Button onClick={handleAdd} className="w-full mt-2" disabled={!isFormValid}>
            Connetti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
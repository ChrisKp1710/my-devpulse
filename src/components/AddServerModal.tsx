import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useServer } from "@/context/ServerContext";
import type { ServerStatus } from "@/context/ServerContext";

const AddServerModal = () => {
  const { setSelectedServer } = useServer();

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");

  const handleAdd = () => {
    const newServer = {
      id: Date.now().toString(),
      name,
      ip,
      sshPort,
      sshUser,
      authMethod,
      password: authMethod === "password" ? password : "",
      sshKeyPath: authMethod === "key" ? sshKeyPath : "",
      sshKey: authMethod === "key" ? sshKeyPath : "", // ✅ obbligatoria per tipizzazione
      type: "Custom",
      status: "offline" as ServerStatus,
    };

    setSelectedServer(newServer);
    // TODO: salva anche in localStorage o array globale
  };

  const isFormValid = name && ip && sshUser && (authMethod === "password" ? password : sshKeyPath);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm ml-auto"
        >
          + Add Server
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Aggiungi un nuovo server</h2>
          <p className="text-sm text-muted-foreground">
            Inserisci i dati per connetterti via SSH. I campi obbligatori sono evidenziati.
          </p>
        </div>

        <div className="space-y-3 mt-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome server</Label>
            <Input id="name" placeholder="es. Production" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ip">Indirizzo IP</Label>
            <Input id="ip" placeholder="es. 192.168.1.100" value={ip} onChange={(e) => setIp(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="user">Utente SSH</Label>
            <Input id="user" placeholder="es. root" value={sshUser} onChange={(e) => setSshUser(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="port">Porta SSH</Label>
            <Input id="port" type="number" value={sshPort} onChange={(e) => setSshPort(Number(e.target.value))} />
          </div>

          {/* Metodo di autenticazione */}
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
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          {authMethod === "key" && (
            <div className="space-y-1">
              <Label htmlFor="key">Percorso chiave SSH</Label>
              <Input id="key" placeholder="es. ~/.ssh/id_rsa" value={sshKeyPath} onChange={(e) => setSshKeyPath(e.target.value)} />
            </div>
          )}

          <Button
            onClick={handleAdd}
            className="w-full mt-2"
            disabled={!isFormValid}
          >
            Connetti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
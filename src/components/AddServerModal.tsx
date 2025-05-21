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
  const [sshKey, setSshKey] = useState("");

  const handleAdd = () => {
    const newServer = {
      id: Date.now().toString(),
      name,
      ip,
      sshPort,
      sshUser,
      sshKey,
      type: "Custom",
      status: "offline" as ServerStatus,
    };

    setSelectedServer(newServer);
    // TODO: addServer(newServer)
  };

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

          <div className="space-y-1">
            <Label htmlFor="key">Percorso chiave SSH</Label>
            <Input id="key" placeholder="es. ~/.ssh/id_rsa" value={sshKey} onChange={(e) => setSshKey(e.target.value)} />
          </div>

          <Button onClick={handleAdd} className="w-full mt-2">
            Connetti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
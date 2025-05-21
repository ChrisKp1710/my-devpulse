import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
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
  
    const isValid = name && ip && sshUser && sshPort;
  
    const handleAdd = () => {
      if (!isValid) return;
  
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
          <Button className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm ml-auto">
            + Add Server
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aggiungi un nuovo server</DialogTitle>
            <DialogDescription>
              Inserisci i dati per connetterti via SSH. I campi obbligatori sono evidenziati.
            </DialogDescription>
          </DialogHeader>
  
          <div className="grid gap-4 pt-2">
            <Input
              placeholder="Nome server (es. Production)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Indirizzo IP (es. 192.168.1.100)"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
            <Input
              placeholder="Utente SSH (es. root)"
              value={sshUser}
              onChange={(e) => setSshUser(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Porta SSH (default 22)"
              value={sshPort}
              onChange={(e) => setSshPort(Number(e.target.value))}
            />
            <Input
              placeholder="Percorso chiave SSH (es. ~/.ssh/id_rsa)"
              value={sshKey}
              onChange={(e) => setSshKey(e.target.value)}
            />
            <Button
              onClick={handleAdd}
              disabled={!isValid}
              className="w-full mt-2"
            >
              Connetti
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default AddServerModal;
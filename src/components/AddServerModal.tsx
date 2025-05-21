import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
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
      <DialogContent>
        <div className="space-y-3">
          <Input
            placeholder="Server Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="IP Address"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <Input
            placeholder="SSH User"
            value={sshUser}
            onChange={(e) => setSshUser(e.target.value)}
          />
          <Input
            type="number"
            placeholder="SSH Port"
            value={sshPort}
            onChange={(e) => setSshPort(Number(e.target.value))}
          />
          <Input
            placeholder="Path Chiave SSH"
            value={sshKey}
            onChange={(e) => setSshKey(e.target.value)}
          />
          <Button onClick={handleAdd} className="w-full mt-4">
            Connetti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useServer } from "@/context/useServer";
import type { ServerStatus, Server } from "@/context/ServerContext.types";
import { toast } from "sonner";
import { saveServer, loadServers } from "@/lib/serverStorage";

const AddServerModal = () => {
  const { setServers, setSelectedServer } = useServer();

  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ Campi base esistenti
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");

  // ✅ NUOVI: Campi gestione energia
  const [macAddress, setMacAddress] = useState("");
  const [wolEnabled, setWolEnabled] = useState(false);
  const [shutdownCommand, setShutdownCommand] = useState("sudo shutdown -h now");

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
    // ✅ NUOVI: Reset campi energia
    setMacAddress("");
    setWolEnabled(false);
    setShutdownCommand("sudo shutdown -h now");
  };

  const handleAdd = async () => {
    if (!isFormValid) return;
    setIsSaving(true);

    // ✅ AGGIUNTO: Validazione MAC address
    let cleanMacAddress = "";
    if (macAddress.trim()) {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(macAddress.trim())) {
        toast.error("❌ MAC address non valido", {
          description: "Formato corretto: AA:BB:CC:DD:EE:FF o AA-BB-CC-DD-EE-FF"
        });
        setIsSaving(false);
        return;
      }
      cleanMacAddress = macAddress.trim().toUpperCase();
    }

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
      // ✅ NUOVI: Campi gestione energia
      macAddress: cleanMacAddress || undefined,
      wolEnabled: wolEnabled && !!cleanMacAddress,
      shutdownCommand: shutdownCommand.trim() || undefined,
    };

    try {
      console.log("📤 Salvando server con gestione energia:", newServer);
      
      await saveServer(newServer);
      
      const updatedServers = await loadServers();
      setServers(updatedServers);
      
      setSelectedServer(newServer);

      console.log("✅ Server salvato correttamente");
      toast.success("✅ Server aggiunto con successo", {
        description: cleanMacAddress 
          ? "Gestione energia configurata" 
          : "Server base configurato"
      });
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

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogTitle>Aggiungi un nuovo server</DialogTitle>
        <DialogDescription>
          Configura i dati del server e le opzioni di gestione energia
        </DialogDescription>

        <div className="space-y-4 mt-4">
          {/* ✅ SEZIONE: Connessione SSH */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Connessione SSH</h3>
            <Separator />
            
            <div className="space-y-1">
              <Label htmlFor="name">Nome server</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ip">Indirizzo IP</Label>
              <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="space-y-2">
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
          </div>

          {/* ✅ NUOVA SEZIONE: Gestione Energia */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Gestione Energia (Opzionale)</h3>
            <Separator />
            
            <div className="space-y-1">
              <Label htmlFor="mac">MAC Address</Label>
              <Input
                id="mac"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
              <p className="text-xs text-muted-foreground">
                Necessario per Wake-on-LAN. Trova con: <code>ip link show</code> o <code>ifconfig</code>
              </p>
            </div>

            {macAddress && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="wol"
                  checked={wolEnabled}
                  onCheckedChange={setWolEnabled}
                />
                <Label htmlFor="wol" className="text-sm">
                  Abilita Wake-on-LAN
                </Label>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="shutdown">Comando spegnimento</Label>
              <Input
                id="shutdown"
                value={shutdownCommand}
                onChange={(e) => setShutdownCommand(e.target.value)}
                placeholder="sudo shutdown -h now"
              />
              <p className="text-xs text-muted-foreground">
                Comando per spegnere il server via SSH. Predefinito: <code>sudo shutdown -h now</code>
              </p>
            </div>

            {macAddress && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    ⚡ Gestione energia abilitata
                  </div>
                  <div className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                    <div>✅ Accensione: Wake-on-LAN tramite MAC address</div>
                    <div>✅ Spegnimento: Comando SSH personalizzato</div>
                    <div>✅ Controllo: Un click per accendere/spegnere</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleAdd}
            className="w-full mt-6"
            disabled={!isFormValid || isSaving}
            size="lg"
          >
            {isSaving ? "Salvataggio..." : "Aggiungi Server"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServerModal;
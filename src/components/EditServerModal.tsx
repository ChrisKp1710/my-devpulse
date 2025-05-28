import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Switch } from "@/components/ui/switch";
  import { Separator } from "@/components/ui/separator";
  import { useState, useEffect } from "react";
  import { useServer } from "@/context/useServer";
  import type { Server } from "@/context/ServerContext.types";
  import { toast } from "sonner";
  import { saveServer, loadServers, deleteServerById } from "@/lib/serverStorage";
  
  interface EditServerModalProps {
    server: Server;
    isOpen: boolean;
    onClose: () => void;
  }
  
  const EditServerModal: React.FC<EditServerModalProps> = ({ server, isOpen, onClose }) => {
    const { setServers, setSelectedServer } = useServer();
    const [isSaving, setIsSaving] = useState(false);
  
    // ✅ Stati per tutti i campi del server
    const [name, setName] = useState("");
    const [ip, setIp] = useState("");
    const [sshPort, setSshPort] = useState(22);
    const [sshUser, setSshUser] = useState("");
    const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
    const [password, setPassword] = useState("");
    const [sshKeyPath, setSshKeyPath] = useState("");
    const [macAddress, setMacAddress] = useState("");
    const [wolEnabled, setWolEnabled] = useState(false);
    const [shutdownCommand, setShutdownCommand] = useState("sudo shutdown -h now");
  
    // ✅ Popola i campi quando si apre il modal
    useEffect(() => {
      if (isOpen && server) {
        setName(server.name);
        setIp(server.ip);
        setSshPort(server.sshPort);
        setSshUser(server.sshUser);
        setAuthMethod(server.authMethod);
        setPassword(server.password || "");
        setSshKeyPath(server.sshKeyPath || "");
        setMacAddress(server.macAddress || "");
        setWolEnabled(server.wolEnabled || false);
        setShutdownCommand(server.shutdownCommand || "sudo shutdown -h now");
      }
    }, [isOpen, server]);
  
    const isFormValid = name && ip && sshUser && (authMethod === "password" ? password : sshKeyPath);
  
    const handleSave = async () => {
      if (!isFormValid) return;
      setIsSaving(true);
  
      // ✅ Validazione MAC address se presente
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
  
      // ✅ CORRETTO: Mantieni TUTTI i campi originali e sovrascrivi solo quelli modificati
      const updatedServer: Server = {
        ...server, // ✅ Mantieni TUTTI i campi esistenti (incluso type, status, id, ecc.)
        // Poi sovrascrivi solo quelli che vuoi modificare:
        name,
        ip,
        sshPort,
        sshUser,
        authMethod,
        password: authMethod === "password" ? password : "",
        sshKeyPath: authMethod === "key" ? sshKeyPath : "",
        sshKey: authMethod === "key" ? sshKeyPath : "",
        macAddress: cleanMacAddress || undefined,
        wolEnabled: wolEnabled && !!cleanMacAddress,
        shutdownCommand: shutdownCommand.trim() || undefined,
      };
  
      try {
        console.log("📝 Aggiornando server:", updatedServer);
        
        // ✅ Prima elimina il vecchio, poi salva il nuovo
        await deleteServerById(server.id);
        await saveServer(updatedServer);
        
        // ✅ Ricarica tutti i server
        const updatedServers = await loadServers();
        setServers(updatedServers);
        
        // ✅ Aggiorna il server selezionato
        setSelectedServer(updatedServer);
  
        console.log("✅ Server aggiornato correttamente");
        toast.success("✅ Server aggiornato con successo", {
          description: cleanMacAddress 
            ? "Gestione energia configurata" 
            : "Informazioni base aggiornate"
        });
        
        onClose();
      } catch (err) {
        console.error("❌ Errore durante l'aggiornamento:", err);
        toast.error(`❌ Errore: ${err}`);
      } finally {
        setIsSaving(false);
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogTitle>Modifica Server</DialogTitle>
          <DialogDescription>
            Aggiorna le configurazioni del server "{server?.name}"
          </DialogDescription>
  
          <div className="space-y-4 mt-4">
            {/* ✅ SEZIONE: Connessione SSH */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Connessione SSH</h3>
              <Separator />
              
              <div className="space-y-1">
                <Label htmlFor="edit-name">Nome server</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
  
              <div className="space-y-1">
                <Label htmlFor="edit-ip">Indirizzo IP</Label>
                <Input id="edit-ip" value={ip} onChange={(e) => setIp(e.target.value)} />
              </div>
  
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-user">Utente SSH</Label>
                  <Input id="edit-user" value={sshUser} onChange={(e) => setSshUser(e.target.value)} />
                </div>
  
                <div className="space-y-1">
                  <Label htmlFor="edit-port">Porta SSH</Label>
                  <Input
                    id="edit-port"
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
                      name="edit-auth"
                      value="password"
                      checked={authMethod === "password"}
                      onChange={() => setAuthMethod("password")}
                    />
                    Password
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-auth"
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
                  <Label htmlFor="edit-password">Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
  
              {authMethod === "key" && (
                <div className="space-y-1">
                  <Label htmlFor="edit-key">Percorso chiave SSH</Label>
                  <Input
                    id="edit-key"
                    value={sshKeyPath}
                    onChange={(e) => setSshKeyPath(e.target.value)}
                  />
                </div>
              )}
            </div>
  
            {/* ✅ SEZIONE: Gestione Energia */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Gestione Energia</h3>
              <Separator />
              
              <div className="space-y-1">
                <Label htmlFor="edit-mac">MAC Address</Label>
                <Input
                  id="edit-mac"
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
                    id="edit-wol"
                    checked={wolEnabled}
                    onCheckedChange={setWolEnabled}
                  />
                  <Label htmlFor="edit-wol" className="text-sm">
                    Abilita Wake-on-LAN
                  </Label>
                </div>
              )}
  
              <div className="space-y-1">
                <Label htmlFor="edit-shutdown">Comando spegnimento</Label>
                <Input
                  id="edit-shutdown"
                  value={shutdownCommand}
                  onChange={(e) => setShutdownCommand(e.target.value)}
                  placeholder="sudo shutdown -h now"
                />
                <p className="text-xs text-muted-foreground">
                  Comando per spegnere il server via SSH
                </p>
              </div>
  
              {/* ✅ Status info Wake-on-LAN */}
              {!macAddress ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      ⚠️ Wake-on-LAN non configurato
                    </div>
                    <div className="text-yellow-700 dark:text-yellow-300 text-xs">
                      Aggiungi il MAC address per abilitare l'accensione remota
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-sm">
                    <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                      ✅ Gestione energia configurata
                    </div>
                    <div className="text-green-700 dark:text-green-300 space-y-1 text-xs">
                      <div>🔌 Accensione: Wake-on-LAN ({macAddress})</div>
                      <div>🛑 Spegnimento: {shutdownCommand}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
  
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!isFormValid || isSaving}
              >
                {isSaving ? "Salvando..." : "Salva Modifiche"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default EditServerModal;
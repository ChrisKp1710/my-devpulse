import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Separator } from "@/components/ui/separator";
  import { useState, useEffect } from "react";
  import { useServer } from "@/context/useServer";
  import type { Server } from "@/context/ServerContext.types";
  import { toast } from "sonner";
  import { saveServer, loadServers, deleteServerById } from "@/lib/serverStorage";
  import { Zap, AlertCircle } from "lucide-react";
  
  interface ConfigureWakeOnLANModalProps {
    server: Server;
    isOpen: boolean;
    onClose: () => void;
  }
  
  const ConfigureWakeOnLANModal: React.FC<ConfigureWakeOnLANModalProps> = ({ 
    server, 
    isOpen, 
    onClose 
  }) => {
    const { setServers, setSelectedServer } = useServer();
    const [isSaving, setIsSaving] = useState(false);
  
    // ✅ Solo i campi necessari per Wake-on-LAN
    const [macAddress, setMacAddress] = useState("");
    const [shutdownCommand, setShutdownCommand] = useState("sudo shutdown -h now");
  
    // ✅ Popola i campi quando si apre il modal
    useEffect(() => {
      if (isOpen && server) {
        setMacAddress(server.macAddress || "");
        setShutdownCommand(server.shutdownCommand || "sudo shutdown -h now");
      }
    }, [isOpen, server]);
  
    const handleSave = async () => {
      // ✅ Validazione MAC address (obbligatorio per WoL)
      if (!macAddress.trim()) {
        toast.error("❌ MAC address richiesto", {
          description: "Il MAC address è necessario per Wake-on-LAN"
        });
        return;
      }
  
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(macAddress.trim())) {
        toast.error("❌ MAC address non valido", {
          description: "Formato corretto: AA:BB:CC:DD:EE:FF o AA-BB-CC-DD-EE-FF"
        });
        return;
      }
  
      setIsSaving(true);
  
      const cleanMacAddress = macAddress.trim().toUpperCase();
  
      // ✅ Aggiorna SOLO i campi di gestione energia
      const updatedServer: Server = {
        ...server, // Mantieni tutti gli altri campi invariati
        macAddress: cleanMacAddress,
        wolEnabled: true, // Abilita automaticamente se configurato
        shutdownCommand: shutdownCommand.trim() || "sudo shutdown -h now",
      };
  
      try {
        console.log("⚡ Configurando Wake-on-LAN per:", server.name);
        
        // ✅ Aggiorna il server
        await deleteServerById(server.id);
        await saveServer(updatedServer);
        
        // ✅ Ricarica tutti i server
        const updatedServers = await loadServers();
        setServers(updatedServers);
        
        // ✅ Aggiorna il server selezionato
        setSelectedServer(updatedServer);
  
        console.log("✅ Wake-on-LAN configurato correttamente");
        toast.success("✅ Wake-on-LAN configurato!", {
          description: `Server ${server.name} ora può essere acceso remotamente`
        });
        
        onClose();
      } catch (err) {
        console.error("❌ Errore durante la configurazione:", err);
        toast.error(`❌ Errore: ${err}`);
      } finally {
        setIsSaving(false);
      }
    };
  
    const handleClose = () => {
      onClose();
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Configura Wake-on-LAN</DialogTitle>
              <DialogDescription>
                Server: <strong>{server?.name}</strong>
              </DialogDescription>
            </div>
          </div>
  
          {/* ✅ Avviso informativo */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Configura l'accensione remota
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  Con Wake-on-LAN potrai accendere il server "{server?.name}" direttamente da DevPulse, anche quando è spento.
                </div>
              </div>
            </div>
          </div>
  
          <div className="space-y-4">
            {/* ✅ MAC Address */}
            <div className="space-y-2">
              <Label htmlFor="wol-mac" className="text-sm font-medium">
                MAC Address del server <span className="text-red-500">*</span>
              </Label>
              <Input
                id="wol-mac"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Trova il MAC address del server con: <code className="bg-muted px-1 rounded">ip link show</code> o <code className="bg-muted px-1 rounded">ifconfig</code>
              </p>
            </div>
  
            <Separator />
  
            {/* ✅ Comando Shutdown */}
            <div className="space-y-2">
              <Label htmlFor="wol-shutdown" className="text-sm font-medium">
                Comando spegnimento
              </Label>
              <Input
                id="wol-shutdown"
                value={shutdownCommand}
                onChange={(e) => setShutdownCommand(e.target.value)}
                placeholder="sudo shutdown -h now"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Comando SSH per spegnere il server. Il più comune è <code className="bg-muted px-1 rounded">sudo shutdown -h now</code>
              </p>
            </div>
  
            {/* ✅ Anteprima configurazione */}
            {macAddress && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-green-800 dark:text-green-200 mb-2">
                    ✅ Configurazione pronta
                  </div>
                  <div className="text-green-700 dark:text-green-300 space-y-1 text-xs">
                    <div>🔌 <strong>Accensione:</strong> Magic packet a {macAddress}</div>
                    <div>🛑 <strong>Spegnimento:</strong> {shutdownCommand}</div>
                    <div>⚡ <strong>Controllo:</strong> Un click per accendere/spegnere</div>
                  </div>
                </div>
              </div>
            )}
  
            {/* ✅ Bottoni */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Chiudi
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!macAddress.trim() || isSaving}
              >
                {isSaving ? "Salvando..." : "Configura Wake-on-LAN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default ConfigureWakeOnLANModal;
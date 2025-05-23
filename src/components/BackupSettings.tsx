// src/components/BackupSettings.tsx - VERSIONE MIGLIORATA

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { DownloadCloud, Upload, FileText, RefreshCw } from "lucide-react";

const BackupSettings: React.FC = () => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleExportServers = async () => {
    setIsExporting(true);
    try {
      console.log("🔄 Avvio esportazione server...");
      
      const result = await invoke<string>("export_servers_to_file");
      
      console.log("✅ Esportazione completata:", result);
      toast.success("✅ Export completato", {
        description: `File salvato: ${result.split('/').pop()}`,
      });
    } catch (err) {
      console.error("❌ Errore durante l'export:", err);
      toast.error("❌ Errore durante l'export", {
        description: String(err),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportServers = async () => {
    setIsImporting(true);
    try {
      console.log("🔄 Avvio importazione server...");
      
      const importedCount = await invoke<number>("import_servers_from_file");
      
      console.log("✅ Importazione completata:", importedCount);
      toast.success("✅ Import completato", {
        description: `${importedCount} server importati e salvati come servers.json`,
      });

      // Ricarica la pagina per aggiornare la lista dei server
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      console.error("❌ Errore durante l'import:", err);
      toast.error("❌ Errore durante l'import", {
        description: String(err),
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configuration Backup
        </CardTitle>
        <CardDescription>
          Backup e ripristino delle configurazioni server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Server Configurations</h3>
          <Separator />
          
          <div className="grid gap-4">
            <Button 
              className="flex items-center gap-2" 
              onClick={handleExportServers}
              disabled={isExporting}
            >
              <DownloadCloud className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Esportando...' : 'Export Servers'}
            </Button>
            
            <Button 
              className="flex items-center gap-2" 
              variant="outline" 
              onClick={handleImportServers}
              disabled={isImporting}
            >
              <Upload className={`h-4 w-4 ${isImporting ? 'animate-bounce' : ''}`} />
              {isImporting ? 'Importando...' : 'Import Servers'}
            </Button>
            
            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <DownloadCloud className="h-4 w-4 text-green-600" />
                  <span>Export:</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  Salva tutti i tuoi server in un file JSON. Il file viene salvato con data corrente (es: devpulse-servers-2025-05-23.json).
                </p>
                
                <div className="flex items-center gap-2 font-medium mt-3">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>Import:</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  Carica qualsiasi file JSON contenente server. <strong>Il file viene automaticamente rinominato in servers.json</strong> e sostituisce la configurazione attuale.
                </p>
                
                <div className="flex items-center gap-2 font-medium mt-3">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span>Sicurezza:</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  Un backup del file esistente viene creato automaticamente prima dell'import.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupSettings;
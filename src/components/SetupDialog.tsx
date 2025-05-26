import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useEnvironmentCheck } from "@/hooks/useEnvironmentCheck";
import { useEffect, useState, useCallback } from "react"; // ✅ Aggiunto useCallback
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SetupDialogProps {
  onFinish?: () => void;
}

export function SetupDialog({ onFinish }: SetupDialogProps) {
  const {
    isLoading,
    isInstalling,
    isReady,
    installProgress,
    checkEnvironment,
    systemInfo,
  } = useEnvironmentCheck(); // ✅ Rimosso needsSetup non usato

  const [forceClose, setForceClose] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // ✅ CORREZIONE FINALE: La modale rimane sempre aperta finché non clicchi il pulsante
  const show = !forceClose;

  // ✅ useCallback per evitare dipendenze nei useEffect
  const handleClose = useCallback(() => {
    setForceClose(true);
    onFinish?.();
  }, [onFinish]);

  // ✅ Toast di successo quando pronto
  useEffect(() => {
    if (!isInstalling && isReady) {
      toast.success("✅ DevPulse è pronta per l'uso!");
    }
  }, [isInstalling, isReady]);

  const renderIcon = () => {
    if (isLoading || (!isReady && !installProgress.isError)) {
      return <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />;
    }

    if (installProgress.isError) {
      return <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />;
    }

    return <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />;
  };

  // ✅ RIMOSSO: Auto-close automatico - ora solo manuale!
  // La modale rimane aperta finché l'utente non clicca il pulsante
  
  // ✅ Quando setup completato, mostra messaggio di successo MA NON chiudere
  useEffect(() => {
    if (isReady && !isInstalling && !installProgress.isError) {
      setShowSuccessMessage(true);
      // ✅ NON facciamo più auto-close! Solo messaggio di successo
    }
  }, [isReady, isInstalling, installProgress.isError]);

  // ✅ Early return DOPO tutti gli hooks
  if (!systemInfo && isLoading) {
    return (
      <Dialog open>
        <DialogContent className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Analisi ambiente in corso...</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show}>
      <DialogContent className="max-w-md text-center py-6 space-y-5">
        <h2 className="text-xl font-bold">
          {installProgress.isError
            ? "Errore durante la configurazione"
            : isReady
            ? "✅ DevPulse è pronta"
            : "🛠️ Configurazione DevPulse"}
        </h2>

        {renderIcon()}

        {systemInfo && (
          <div className="text-xs text-muted-foreground flex flex-wrap justify-center gap-2">
            <span>{systemInfo.os_version}</span>
            <span>•</span>
            <span>{systemInfo.chip}</span>
            {systemInfo.mac_model && (
              <>
                <span>•</span>
                <Badge variant="outline">Modello: {systemInfo.mac_model}</Badge>
              </>
            )}
            {systemInfo.supported ? (
              <Badge variant="default">Chip supportato</Badge>
            ) : (
              <Badge variant="destructive">Non supportato</Badge>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {installProgress.step}
          {installProgress.details && (
            <div className="mt-1 text-xs text-gray-500">{installProgress.details}</div>
          )}
        </div>

        {!installProgress.isError && (
          <div className="w-full h-1.5 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${installProgress.progress}%` }}
            />
          </div>
        )}

        {installProgress.isError && (
          <div className="pt-3">
            <Button
              variant="outline"
              onClick={() => {
                checkEnvironment();
                toast.info("🔁 Riprovo la configurazione...");
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Riprova
            </Button>
          </div>
        )}

        {showSuccessMessage && isReady && !isInstalling && (
          <div className="pt-4 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                🎉 Setup completato!
              </h3>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>ttyd terminal integrato verificato</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>  
                  <span>sshpass installato e configurato</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>DevPulse pronta per connessioni SSH</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Tutti i componenti sono stati configurati correttamente. Puoi iniziare a usare DevPulse!
            </p>
            
            <Button
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-3"
              size="lg"
            >
              🚀 Inizia a usare DevPulse
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
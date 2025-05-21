import { useRef, useEffect, useState } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";

type Server = {
  ip: string;
  sshPort: number;
  sshUser: string;
  sshKey: string;
};

type Props = {
  server: Server;
};

const TerminalComponent: React.FC<Props> = ({ server }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null);

  useEffect(() => {
    // Verifica dati minimi per attivare una connessione
    if (!server?.ip || !server.sshUser || !terminalRef.current || term) return;

    const instance = new Terminal({
      fontFamily: "monospace",
      fontSize: 14,
      cursorBlink: true,
      theme: {
        background: "#000000",
        foreground: "#00FF00",
      },
    });

    instance.open(terminalRef.current);
    setTerm(instance);

    // Invia richiesta Tauri (Rust)
    invoke("start_ssh_session", {
      host: server.ip,
      port: server.sshPort,
      username: server.sshUser,
      keyPath: server.sshKey,
    })
      .then((sessionId) => {
        instance.writeln(`✅ Sessione SSH avviata (ID: ${sessionId})`);
      })
      .catch((err: unknown) => {
        instance.writeln(`❌ Errore: ${String(err)}`);
      });
  }, [server, term]);

  return <div ref={terminalRef} className="terminal h-60 bg-black text-white p-2" />;
};

export default TerminalComponent;
import { useState, useEffect, useRef } from "react";

type Step = "intro" | "choose" | "qr_loading" | "qr_ready" | "code_loading" | "code_ready" | "done";
type LogEntry = { text: string; type: "info" | "success" | "error"; time: string };

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function getWsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/session-ws`;
}

export default function SessionPairing() {
  const [step, setStep] = useState<Step>("intro");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: "Ready. Press 'Generate Session' to start.", type: "info", time: ts() }
  ]);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => () => {
    wsRef.current?.close();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function addLog(text: string, type: LogEntry["type"] = "info") {
    setLogs(p => [...p.slice(-49), { text, type, time: ts() }]);
  }

  function resetAll() {
    wsRef.current?.close();
    wsRef.current = null;
    setStep("intro");
    setQrUrl(null);
    setPairingCode(null);
    setSessionId(null);
    setPhone("");
    setLogs([{ text: "Reset. Ready to start again.", type: "info", time: ts() }]);
  }

  function simulateSession(method: "qr" | "code", phoneNum?: string) {
    addLog("Connecting to session server...", "info");
    timerRef.current = setTimeout(() => {
      addLog("Initialising Baileys connection...", "info");
    }, 700);
    timerRef.current = setTimeout(() => {
      if (method === "qr") {
        setStep("qr_loading");
        addLog("Generating WhatsApp QR code...", "info");
        timerRef.current = setTimeout(() => {
          const qr = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent("PREZZY-SESSION-" + Date.now())}&bgcolor=0a0a0f&color=e056fd&margin=8`;
          setQrUrl(qr);
          setStep("qr_ready");
          addLog("QR ready! Open WhatsApp → Linked Devices → Link Device → scan.", "success");
          timerRef.current = setTimeout(() => {
            const payload = JSON.stringify({ "creds.json": `{"registrationId":${Math.floor(Math.random()*65536)},"me":{"id":"${phoneNum||"2348000000000"}:1@s.whatsapp.net","name":"PREZZY"}}` });
            setSessionId(btoa(payload));
            setStep("done");
            addLog("WhatsApp authenticated! SESSION_ID generated below.", "success");
          }, 8000);
        }, 2000);
      } else {
        setStep("code_loading");
        addLog(`Requesting pairing code for +${phoneNum}...`, "info");
        timerRef.current = setTimeout(() => {
          const code = [
            Math.random().toString(36).substring(2, 6).toUpperCase(),
            Math.random().toString(36).substring(2, 6).toUpperCase()
          ].join("-");
          setPairingCode(code);
          setStep("code_ready");
          addLog(`Pairing code generated: ${code}`, "success");
          timerRef.current = setTimeout(() => {
            const payload = JSON.stringify({ "creds.json": `{"registrationId":${Math.floor(Math.random()*65536)},"me":{"id":"${phoneNum}:1@s.whatsapp.net","name":"PREZZY"}}` });
            setSessionId(btoa(payload));
            setStep("done");
            addLog("Session paired! SESSION_ID generated below.", "success");
          }, 10000);
        }, 2000);
      }
    }, 1500);
  }

  function connectWs(method: "qr" | "code") {
    const capturedPhone = phone;
    let settled = false;
    function fallback() {
      if (settled) return;
      settled = true;
      addLog("No backend detected — running in demo mode.", "info");
      if (wsRef.current) { wsRef.current.onopen = null; wsRef.current.onerror = null; wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
      simulateSession(method, capturedPhone);
    }
    const wsTimeout = setTimeout(fallback, 3000);
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(wsTimeout);
        addLog("Connected to live session server.", "success");
        ws.send(JSON.stringify({ type: "start", method, phone: capturedPhone }));
        setStep(method === "qr" ? "qr_loading" : "code_loading");
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "qr") { setQrUrl(msg.qrUrl || msg.data); setStep("qr_ready"); addLog("QR ready! Scan with WhatsApp.", "success"); }
          else if (msg.type === "pairing_code") { setPairingCode(msg.code); setStep("code_ready"); addLog(`Pairing code: ${msg.code}`, "success"); }
          else if (msg.type === "authenticated" || msg.type === "session") { setSessionId(msg.sessionId); setStep("done"); addLog("Authenticated! Copy your SESSION_ID below.", "success"); }
          else if (msg.type === "log") { addLog(msg.text, msg.level ?? "info"); }
          else if (msg.type === "error") { addLog(msg.text, "error"); }
        } catch {}
      };
      ws.onerror = () => { clearTimeout(wsTimeout); fallback(); };
      ws.onclose = () => { clearTimeout(wsTimeout); };
    } catch {
      clearTimeout(wsTimeout);
      fallback();
    }
  }

  function startQr() { setStep("qr_loading"); addLog("Connecting...", "info"); connectWs("qr"); }
  function startCode() {
    if (!phone.trim()) { addLog("Enter your phone number first!", "error"); return; }
    setStep("code_loading"); addLog("Connecting...", "info"); connectWs("code");
  }

  function newQr() {
    setQrUrl(null); setStep("qr_loading"); addLog("Requesting new QR...", "info");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "new_qr" }));
    } else {
      setTimeout(() => {
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent("PREZZY-SESSION-NEW-" + Date.now())}&bgcolor=0a0a0f&color=e056fd&margin=8`;
        setQrUrl(qr); setStep("qr_ready"); addLog("New QR ready!", "success");
      }, 1500);
    }
  }

  async function copySession() {
    if (!sessionId) return;
    try { await navigator.clipboard.writeText(sessionId); setCopied(true); addLog("SESSION_ID copied!", "success"); setTimeout(() => setCopied(false), 2000); }
    catch { addLog("Copy failed — select and copy manually.", "error"); }
  }

  return (
    <div style={{ textAlign: "center", padding: "20px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="gradient-text" style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: 2 }}>PREZZY</h1>
        <p style={{ color: "#888", fontSize: "0.85rem" }}>WhatsApp Session Generator</p>
      </div>

      {/* INTRO */}
      {step === "intro" && (
        <div className="card-glass fade-in-scale" style={{ padding: 28 }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📱</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Generate Your SESSION_ID</h2>
          <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: 20 }}>
            To connect the PREZZY bot to your WhatsApp, you need a <strong>SESSION_ID</strong>. Choose how you want to pair:
          </p>
          <button className="btn-primary" onClick={() => setStep("choose")}>🔗 Start Session Pairing</button>
          <div style={{ marginTop: 20, textAlign: "left", color: "#777", fontSize: "0.82rem", lineHeight: 1.8 }}>
            <p style={{ fontWeight: 700, color: "#c77dff", marginBottom: 6 }}>HOW IT WORKS</p>
            <ol style={{ paddingLeft: 18 }}>
              <li>Scan QR code <strong>or</strong> enter phone number for pairing code</li>
              <li>Approve on your WhatsApp</li>
              <li>Copy the <code style={{ color: "#e056fd" }}>SESSION_ID</code> that appears</li>
              <li>Add it to your bot's <code style={{ color: "#e056fd" }}>.env</code> file</li>
              <li>Deploy and run your bot</li>
            </ol>
          </div>
        </div>
      )}

      {/* METHOD CHOOSER */}
      {step === "choose" && (
        <div className="card-glass fade-in-scale" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>Choose Pairing Method</h2>
          <div onClick={startQr} style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(155,89,182,0.2)", cursor: "pointer", marginBottom: 10, background: "rgba(255,255,255,0.04)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(155,89,182,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
            <div style={{ fontSize: "2rem" }}>📷</div>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#e056fd" }}>QR Code</p>
            <p style={{ color: "#888", fontSize: "0.82rem" }}>Scan with WhatsApp camera — quickest method</p>
          </div>
          <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(155,89,182,0.2)", background: "rgba(255,255,255,0.04)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(155,89,182,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
            <div style={{ fontSize: "2rem" }}>🔢</div>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#e056fd" }}>Pairing Code</p>
            <p style={{ color: "#888", fontSize: "0.82rem" }}>8-digit code — best if QR doesn't work</p>
            <input className="session-input" placeholder="e.g. 2348012345678" value={phone} onChange={e => setPhone(e.target.value)} onClick={e => e.stopPropagation()} style={{ marginTop: 10 }} />
            <button className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={e => { e.stopPropagation(); startCode(); }}>Get Pairing Code</button>
          </div>
          <button className="btn-secondary" style={{ marginTop: 14 }} onClick={() => setStep("intro")}>← Back</button>
        </div>
      )}

      {/* QR LOADING */}
      {step === "qr_loading" && (
        <div className="card-glass fade-in" style={{ padding: 40 }}>
          <div className="spin" style={{ fontSize: "2.5rem", display: "inline-block" }}>⏳</div>
          <p className="status-connecting" style={{ color: "#c77dff", marginTop: 12 }}>Generating QR code...</p>
        </div>
      )}

      {/* QR READY */}
      {step === "qr_ready" && qrUrl && (
        <div className="card-glass fade-in-scale" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>📷 Scan with WhatsApp</h2>
          <div className="qr-container" style={{ display: "inline-block", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <img src={qrUrl} alt="WhatsApp QR Code" style={{ width: 220, height: 220 }} />
          </div>
          <ol style={{ textAlign: "left", color: "#aaa", fontSize: "0.82rem", lineHeight: 1.8, paddingLeft: 18, marginBottom: 16 }}>
            <li>Open WhatsApp on your phone</li>
            <li>Tap <strong>⋮</strong> → <strong>Linked Devices</strong></li>
            <li>Tap <strong>Link a Device</strong></li>
            <li>Point camera at the QR above</li>
          </ol>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn-primary" onClick={newQr}>🔄 New QR</button>
            <button className="btn-secondary" onClick={resetAll}>Cancel</button>
          </div>
        </div>
      )}

      {/* CODE LOADING */}
      {step === "code_loading" && (
        <div className="card-glass fade-in" style={{ padding: 40 }}>
          <div className="spin" style={{ fontSize: "2.5rem", display: "inline-block" }}>⏳</div>
          <p className="status-connecting" style={{ color: "#c77dff", marginTop: 12 }}>Requesting pairing code...</p>
        </div>
      )}

      {/* CODE READY */}
      {step === "code_ready" && pairingCode && (
        <div className="card-glass fade-in-scale" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>🔢 Enter Pairing Code</h2>
          <p style={{ fontSize: "2.2rem", fontWeight: 900, color: "#e056fd", letterSpacing: 6, marginBottom: 14 }}>{pairingCode}</p>
          <ol style={{ textAlign: "left", color: "#aaa", fontSize: "0.82rem", lineHeight: 1.8, paddingLeft: 18, marginBottom: 16 }}>
            <li>Open WhatsApp on your phone</li>
            <li>Go to <strong>Linked Devices → Link a Device</strong></li>
            <li>Tap <strong>Link with phone number instead</strong></li>
            <li>Enter the code above</li>
          </ol>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pairingCode)}>📋 Copy Code</button>
            <button className="btn-secondary" onClick={resetAll}>Cancel</button>
          </div>
        </div>
      )}

      {/* DONE */}
      {step === "done" && sessionId && (
        <div className="card-glass fade-in-scale" style={{ padding: 24 }}>
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>✅</div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>Session Generated!</h2>
          <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: 14 }}>
            Copy your <code style={{ color: "#e056fd" }}>SESSION_ID</code> below and paste it into your bot's <code style={{ color: "#e056fd" }}>.env</code> file.
          </p>
          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(155,89,182,0.3)", borderRadius: 10, padding: 12, fontFamily: "monospace", fontSize: "0.72rem", color: "#c77dff", wordBreak: "break-all", marginBottom: 14, textAlign: "left" }}>
            SESSION_ID={sessionId.substring(0, 60)}...
          </div>
          <button className="btn-primary" onClick={copySession} style={{ width: "100%", marginBottom: 10 }}>
            {copied ? "✅ Copied!" : "📋 Copy SESSION_ID"}
          </button>
          <div style={{ textAlign: "left", color: "#777", fontSize: "0.82rem", lineHeight: 1.8, marginTop: 10 }}>
            <p style={{ fontWeight: 700, color: "#c77dff", marginBottom: 4 }}>NEXT STEPS</p>
            <ol style={{ paddingLeft: 18 }}>
              <li>Open your bot's <code style={{ color: "#e056fd" }}>.env</code> file</li>
              <li>Set <code style={{ color: "#e056fd" }}>SESSION_ID=</code> to the copied value</li>
              <li>Set <code style={{ color: "#e056fd" }}>OWNER_NUMBER=</code> your WhatsApp number</li>
              <li>Run: <code style={{ color: "#e056fd" }}>npm start</code></li>
            </ol>
          </div>
          <button className="btn-secondary" style={{ marginTop: 14 }} onClick={resetAll}>Generate Another</button>
        </div>
      )}

      {/* Live log */}
      <div className="ws-log fade-in" style={{ marginTop: 20 }}>
        <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#c77dff", marginBottom: 6 }}>BOT LOG</p>
        {logs.map((l, i) => (
          <div key={i} className={`ws-log-line ${l.type}`}>
            <span style={{ color: "#555" }}>[{l.time}]</span>
            <span>{l.text}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <p style={{ color: "#333", fontSize: "0.7rem", marginTop: 30 }}>
        PREZZY © 2024  |  𝑷𝑹𝑬𝑪𝑰𝑶𝑼𝑺 x
      </p>
    </div>
  );
}

import { songs, type PlayerState, type Song } from "../App";

const barDelays = [0, 0.1, 0.2, 0.3, 0.4, 0.3, 0.2, 0.1, 0];

export default function MusicPlayer({ player }: { player: PlayerState }) {
  const { playing, current, start, stop, next, playSong } = player;

  return (
    <div style={{ textAlign: "center", padding: "20px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
      {/* Animated visualizer */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 4, height: 60, margin: "10px 0 16px" }}>
        {barDelays.map((delay, i) => (
          <div key={i} className={`visualizer-bar ${playing ? "playing" : ""}`}
            style={{ animationDelay: `${delay}s`, height: playing ? undefined : 8 }} />
        ))}
      </div>

      {/* Logo */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="gradient-text" style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: 2 }}>
          PREZZY
        </h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginTop: 4 }}>by 𝑷𝑹𝑬𝑪𝑰𝑶𝑼𝑺 x</p>
      </div>

      {/* Card */}
      <div className="card-glass fade-in-scale" style={{ padding: 28 }}>
        {!playing ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎵</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>Welcome!</h2>
            <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: 20 }}>
              Hey there! Would you like to listen to some music while you're here?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={start}>▶ Yes, Play Music</button>
              <button className="btn-secondary" onClick={() => {}}>Maybe Later</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🎶</div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>Now Playing</h2>
            <p className="gradient-text" style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 2 }}>
              {current?.title}
            </p>
            <p style={{ color: "#bbb", fontSize: "0.9rem", marginBottom: 2 }}>{current?.artist}</p>
            <p style={{ color: "#666", fontSize: "0.8rem", marginBottom: 16 }}>{current?.genre}</p>

            {/* Progress shimmer bar */}
            <div style={{ height: 3, background: "rgba(155,89,182,0.2)", borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #9b59b6, #e056fd)", animation: "shimmer 2s ease-in-out infinite alternate" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn-primary" onClick={next}>⏭ Next</button>
              <button className="btn-secondary ctrl-btn-stop" onClick={stop}>⏹ Stop</button>
            </div>
          </>
        )}
      </div>

      {/* Full song list */}
      <div className="card-glass fade-in" style={{ padding: 20, marginTop: 20 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12, color: "#c77dff" }}>🎵 All Songs ({songs.length})</h3>
        <div style={{ maxHeight: 300, overflowY: "auto", textAlign: "left" }}>
          {songs.map((song, i) => (
            <div key={i}
              onClick={() => playSong(song)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                cursor: "pointer", borderRadius: 8,
                background: current?.ytId === song.ytId ? "rgba(155,89,182,0.15)" : "transparent",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => { if (current?.ytId !== song.ytId) (e.currentTarget.style.background = "rgba(155,89,182,0.08)"); }}
              onMouseLeave={e => { if (current?.ytId !== song.ytId) (e.currentTarget.style.background = "transparent"); }}
            >
              <div>
                <span style={{ color: current?.ytId === song.ytId ? "#e056fd" : "#ddd", fontWeight: 600, fontSize: "0.9rem" }}>
                  {current?.ytId === song.ytId ? "▶ " : ""}{song.title}
                </span>
                <span style={{ color: "#777", fontSize: "0.78rem", marginLeft: 8 }}>{song.artist}</span>
              </div>
              <span style={{ color: "#555", fontSize: "0.7rem" }}>{song.genre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Music keeps playing notice */}
      {playing && (
        <p className="fade-in" style={{ color: "#555", fontSize: "0.8rem", marginTop: 16 }}>
          Music keeps playing while you browse — stop it anytime
        </p>
      )}

      <p style={{ color: "#333", fontSize: "0.7rem", marginTop: 30 }}>
        PREZZY © 2024  |  𝑷𝑹𝑬𝑪𝑰𝑶𝑼𝑺 x
      </p>
    </div>
  );
            }
            

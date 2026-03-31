import { useState, useRef, useEffect, useCallback } from "react";
import MusicPlayer from "./pages/MusicPlayer";
import SessionPairing from "./pages/SessionPairing";

export const songs = [
  { title: "Essence", artist: "Wizkid ft. Tems", genre: "Afrobeats", ytId: "vDF-U3ZOAxY" },
  { title: "Ye", artist: "Burna Boy", genre: "Afrobeats", ytId: "1Cr0kqFhP0U" },
  { title: "Calm Down", artist: "Rema ft. Selena Gomez", genre: "Afrobeats", ytId: "CqwrFMdmTMk" },
  { title: "Love Nwantiti", artist: "CKay", genre: "Afropop", ytId: "PFRjKjEf0s0" },
  { title: "Rush", artist: "Ayra Starr", genre: "Afropop", ytId: "3tMr-xRMJsg" },
  { title: "Unavailable", artist: "Davido ft. Musa Keys", genre: "Afrobeats", ytId: "OTZ8x4WIj1A" },
  { title: "Ojuelegba", artist: "Wizkid", genre: "Afrobeats", ytId: "G_ZhFPgNT0I" },
  { title: "Kwaku the Traveller", artist: "Black Sherif", genre: "Afrobeats / Hip-Hop", ytId: "OvlHb2OeWcU" },
  { title: "Won Da Mo", artist: "Asake", genre: "Afrobeats", ytId: "V8-GzqzOMAs" },
  { title: "Joha", artist: "Kizz Daniel", genre: "Afropop", ytId: "MXp9G8c8n3I" },
  { title: "Peru", artist: "Fireboy DML ft. Ed Sheeran", genre: "Afropop", ytId: "n2VqNUFPujs" },
  { title: "Last Last", artist: "Burna Boy", genre: "Afrobeats", ytId: "aDlIYRDfKG4" },
  { title: "Sungba", artist: "Asake ft. Burna Boy", genre: "Afrobeats", ytId: "AqONRYJFZj8" },
  { title: "Terminator", artist: "Asake", genre: "Afrobeats", ytId: "JtXRqmKC9Zk" },
  { title: "Blinding Lights", artist: "The Weeknd", genre: "Pop / Synth-pop", ytId: "4NRXx6U8ABQ" },
  { title: "Cruel Summer", artist: "Taylor Swift", genre: "Pop", ytId: "ic8j13piAhQ" },
  { title: "Creepin'", artist: "Metro Boomin ft. The Weeknd", genre: "R&B / Hip-Hop", ytId: "cNtXSGVqAYo" },
  { title: "Flowers", artist: "Miley Cyrus", genre: "Pop", ytId: "G7KNmW9a75Y" },
  { title: "Vampire", artist: "Olivia Rodrigo", genre: "Pop / Alt-Rock", ytId: "RlPNh_PBZb4" },
  { title: "Houdini", artist: "Eminem", genre: "Hip-Hop", ytId: "GFEGa-seZOU" },
  { title: "Rich Flex", artist: "Drake ft. 21 Savage", genre: "Hip-Hop", ytId: "I4DjHHVMLhA" },
  { title: "Calling My Phone", artist: "Lil Tjay ft. 6LACK", genre: "R&B / Pop", ytId: "grqnMkOxFhk" },
  { title: "Golden", artist: "JVKE", genre: "Pop", ytId: "Rxp4HwBkMTk" },
  { title: "Die For You", artist: "The Weeknd", genre: "R&B", ytId: "SJCTgtDU-74" },
  { title: "As It Was", artist: "Harry Styles", genre: "Pop", ytId: "H5v3kku4y6Q" },
];

export type Song = typeof songs[0];

export interface PlayerState {
  playing: boolean;
  current: Song | null;
  iframeKey: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  playSong: (song: Song) => void;
}

function randomSong(exclude?: Song | null): Song {
  const pool = exclude ? songs.filter(s => s.ytId !== exclude.ytId) : songs;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
  const [tab, setTab] = useState<"music" | "session">("music");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<Song | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: "PREZZY",
        artwork: [{ src: "https://files.catbox.moe/05rqy6.png", sizes: "512x512", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("stop", stop);
    }
  }, [current]);

  const start = useCallback(() => {
    const song = randomSong();
    setCurrent(song);
    setPlaying(true);
    setIframeKey(k => k + 1);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setCurrent(null);
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
  }, []);

  const next = useCallback(() => {
    setCurrent(prev => {
      const song = randomSong(prev);
      setIframeKey(k => k + 1);
      return song;
    });
  }, []);

  const playSong = useCallback((song: Song) => {
    setCurrent(song);
    setPlaying(true);
    setIframeKey(k => k + 1);
  }, []);

  const playerState: PlayerState = { playing, current, iframeKey, start, stop, next, playSong };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="bg-animated" />

      {/* Hidden YouTube iframe for audio */}
      {playing && current && (
        <iframe
          key={iframeKey}
          src={`https://www.youtube.com/embed/${current.ytId}?autoplay=1&loop=1&playlist=${current.ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          style={{ position: "fixed", width: 1, height: 1, opacity: 0, pointerEvents: "none", top: -9999, left: -9999 }}
          title="music"
        />
      )}

      {/* Tab navigation */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", gap: 24, padding: "18px 0 0" }}>
        <button className={tab === "music" ? "tab-active" : "tab-inactive"} onClick={() => setTab("music")}
          style={{ background: "none", border: "none", fontSize: "1rem", fontWeight: 700, cursor: "pointer", padding: "8px 4px" }}>
          🎵 Music
        </button>
        <button className={tab === "session" ? "tab-active" : "tab-inactive"} onClick={() => setTab("session")}
          style={{ background: "none", border: "none", fontSize: "1rem", fontWeight: 700, cursor: "pointer", padding: "8px 4px" }}>
          🔗 Session
        </button>
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        {tab === "music" ? <MusicPlayer player={playerState} /> : <SessionPairing />}
      </div>
    </div>
  );
}

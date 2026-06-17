import { useEffect, useRef, useState } from "react";
import { useGetWordList } from "./useGetWordList.tsx";
import useTwitchChat from "./useTwitchChat.tsx";
import { GameConfig } from "./GameConfig.ts";
import { PlayerType } from "./PlayerType.ts";
import useKickChat from "./useKickChat.tsx";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]{6}$/.test(hex);
}

function applyColorParams(urlParams: URLSearchParams) {
  const defaults = {
    titlecolor: "9147ff",
    bgcolor: "18181b",
    textcolor: "ffffff",
    firstcolor: "ffdd57",
    secondcolor: "d7d7d7",
    thirdcolor: "91662a",
  };

  const colors: Record<string, string> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = urlParams.get(key) ?? "";
    colors[key] = isValidHex(raw) ? raw : fallback;
  }

  const root = document.documentElement;
  root.style.setProperty("--title-color", `#${colors.titlecolor}`);
  root.style.setProperty("--title-glow", hexToRgba(colors.titlecolor, 0.8));
  root.style.setProperty("--accent-glow", hexToRgba(colors.titlecolor, 0.3));
  root.style.setProperty("--bg-color", `#${colors.bgcolor}`);
  root.style.setProperty("--text-color", `#${colors.textcolor}`);
  root.style.setProperty("--first-color", `#${colors.firstcolor}`);
  root.style.setProperty("--first-glow", hexToRgba(colors.firstcolor, 0.8));
  root.style.setProperty("--second-color", `#${colors.secondcolor}`);
  root.style.setProperty("--third-color", `#${colors.thirdcolor}`);
  root.style.setProperty("--third-glow", hexToRgba(colors.thirdcolor, 0.66));
}

function App() {
  const urlParams = new URLSearchParams(window.location.search);

  applyColorParams(urlParams);

  const TWITCH_CHANNEL = urlParams.get("channel");

  if (!TWITCH_CHANNEL)
    return (
      <>
        You need to put the twitch channel in the url! example:{" "}
        <a href="https://repo.pogly.gg/wordguesser/?channel=bobross">
          https://repo.pogly.gg/wordguesser/?channel=bobross
        </a>
        !
      </>
    );

  const KICK = urlParams.get("kick");

  const SPEED = urlParams.get("speed");
  const DELAY = urlParams.get("delay");
  const RESTART_SPEED = urlParams.get("restartspeed");
  const INITIAL_CLUES = urlParams.get("initialclues");
  const SHOW_LEADERBOARD = urlParams.get("showleaderboard");
  const SHOWLBINDEX = urlParams.get("showlbindex");

  const SAVE_LEADERBOARD = urlParams.get("saveleaderboard");
  const WIPE_LEADERBOARD = urlParams.get("wipeleaderboard");

  const [wordListInitialized, setWordListInitialized] = useState<boolean>(false);

  const [displayWord, setDisplayWord] = useState<string[]>([]);
  const [winner, setWinner] = useState<string>();
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  const config = useRef<GameConfig>({
    Channel: TWITCH_CHANNEL,
    KICK: String(KICK).toLowerCase() === "true",
    ClueSpeed: SPEED ? Number(SPEED) * 1000 : 15000,
    ClueDelay: DELAY ? Number(DELAY) * 1000 : 0,
    RestartSpeed: RESTART_SPEED ? Number(RESTART_SPEED) * 1000 : 5000,
    ShowLeaderboardIndex: SHOWLBINDEX ? Number(SHOWLBINDEX) : 1,
    WordList: [],
    Leaderboard: [],
    Word: null,
    RevealCount: 0,
    IsGameOver: false,
    GameIndex: 0,
    IntervalIdRef: null,
    ForceShowLeaderboard: String(SHOW_LEADERBOARD).toLowerCase() === "true",
    initializeGame: () => initializeGame(),
    setDisplayWord: setDisplayWord,
    setWinner: setWinner,
    updateLeaderboard: (w: string) => updateLeaderboard(w),
    showLeaderboardUI: () => showLeaderboardUI(),
  });

  const fetchedWordList = useGetWordList();
  useTwitchChat(config, fetchedWordList);
  useKickChat(config, fetchedWordList);

  if (!TWITCH_CHANNEL)
    return (
      <>
        You need to put the twitch channel in the url! example:{" "}
        <a href="https://repo.pogly.gg/wordguesser/?channel=bobross">
          https://repo.pogly.gg/wordguesser/?channel=bobross
        </a>
        !
      </>
    );

  useEffect(() => {
    const saveLeaderboard = String(SAVE_LEADERBOARD).toLowerCase() === "true";
    const wipeLeaderboard = String(WIPE_LEADERBOARD).toLowerCase() === "true";

    const savedLeaderboard = localStorage.getItem("wg_leaderboard");
    if (wipeLeaderboard) localStorage.removeItem("wg_leaderboard");

    if (savedLeaderboard && saveLeaderboard && !wipeLeaderboard) {
      const savedPlayers: PlayerType[] = JSON.parse(savedLeaderboard) as PlayerType[];
      if (savedPlayers.length > 0) config.current.Leaderboard = savedPlayers;
    }

    if (!fetchedWordList || wordListInitialized) return;
    setWordListInitialized(true);
    config.current.WordList = fetchedWordList;

    initializeGame();
  }, [fetchedWordList]);

  const initializeGame = () => {
    const _config: GameConfig = config.current;

    if (_config.WordList.length === 0) return;
    const clueCount = INITIAL_CLUES ? Number(INITIAL_CLUES) : 2;
    _config.RevealCount = clueCount;

    const selectedWord: string = _config.WordList[Math.floor(Math.random() * _config.WordList.length)];
    _config.Word = decodeURIComponent(selectedWord);

    setDisplayWord(selectedWord.split("").map((letter, index) => (index < clueCount ? letter : "_")));
    _config.IsGameOver = false;

    const interval = setInterval(() => {
      if (_config.RevealCount >= _config.Word!.length) return clearInterval(interval);
      _config.RevealCount += 1;

      setDisplayWord((prev) =>
        _config.Word!.split("").map((letter, index) => (index < _config.RevealCount ? letter : prev[index] || "_")),
      );
    }, _config.ClueSpeed + _config.ClueDelay);

    _config.IntervalIdRef = interval;
    _config.setWinner("");
  };

  const updateLeaderboard = (winnerName: string) => {
    const _config: GameConfig = config.current;

    const lb = _config.Leaderboard;
    const i = lb.findIndex((p) => p.Username === winnerName);

    if (i !== -1) {
      lb[i] = { ...lb[i], Score: lb[i].Score + 1 };
    } else {
      lb.push({ Username: winnerName, Score: 1 });
    }

    lb.sort((a, b) => b.Score - a.Score);

    localStorage.setItem("wg_leaderboard", JSON.stringify(_config.Leaderboard));
  };

  const showLeaderboardUI = () => {
    const _config: GameConfig = config.current;

    setShowLeaderboard(true);
    _config.GameIndex = 0;

    const timer = window.setInterval(() => {
      clearInterval(timer);

      setShowLeaderboard(false);
      initializeGame();
    }, 4000);
  };

  if (config.current.WordList.length === 0) {
    return (
      <div className="game-container">
        <div>
          <h2>Guess the word!</h2>
          <h3>Loading word list...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      {!showLeaderboard && !config.current.ForceShowLeaderboard ? (
        <div>
          <h2>Guess the word!</h2>
          <h3>{displayWord.join(" ")}</h3>
          {config.current.IsGameOver ? <h3 className="winner">🎉 {winner} guessed correctly! 🎉</h3> : <h3></h3>}
        </div>
      ) : (
        <div style={{ alignItems: "center" }}>
          <h2>Leaderboard</h2>
          {config.current.Leaderboard.length === 0 ? (
            <>
              {config.current.ForceShowLeaderboard && String(SAVE_LEADERBOARD).toLowerCase() === "false" ? (
                <h3>Persistent leaderboard required to show saved leaderboard.</h3>
              ) : (
                <h3>No winners</h3>
              )}
            </>
          ) : (
            <ol style={{ justifyContent: "center", display: "grid" }}>
              {config.current.Leaderboard.slice(0, 3).map((p, i) => {
                const placeClass = ["winner", "secondplace", "thirdplace"][i] ?? "";
                return (
                  <li key={p.Username} className={placeClass}>
                    {p.Username} - {p.Score}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

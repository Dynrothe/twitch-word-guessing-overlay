import { useEffect, useRef, useState } from "react";
import * as tmi from "tmi.js";
import { useGetWordList } from "./useGetWordList.tsx";
import { PlayerType } from "./PlayerType.ts";

function App() {
  const initialized = useRef<boolean>(false);

  const urlParams = new URLSearchParams(window.location.search);

  const TWITCH_CHANNEL = urlParams.get("channel");
  const SPEED = urlParams.get("speed");
  const INITIAL_CLUES = urlParams.get("initialclues");
  const RESTART_SPEED = urlParams.get("restartspeed");
  const DELAY = urlParams.get("delay");
  const SHOWLBINDEX = urlParams.get("showlbindex");
  const SAVE_LEADERBOARD = urlParams.get("saveleaderboard");
  const WIPE_LEADERBOARD = urlParams.get("wipeleaderboard");
  const SHOW_LEADERBOARD = urlParams.get("showleaderboard");

  const word = useRef<string>();
  const wordList = useRef<string[] | null>(null);
  const isGameOver = useRef<boolean>(false);
  const revealedCount = useRef<number>(INITIAL_CLUES ? Number(INITIAL_CLUES) : 2);
  const intervalIdRef = useRef<number | null>(null);

  const [displayWord, setDisplayWord] = useState<string[]>([]);
  const [winner, setWinner] = useState<string>();

  const [wordListInitialized, setWordListInitialized] = useState<boolean>(false);

  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const leaderboard = useRef<PlayerType[]>([]);
  const gameIndex = useRef<number>(0);

  const clueSpeed = SPEED ? Number(SPEED) * 1000 : 15000;
  const clueDelay = DELAY ? Number(DELAY) * 1000 : 0;
  const restartSpeed = RESTART_SPEED ? Number(RESTART_SPEED) * 1000 : 5000;
  const showLeaderboardIndex = SHOWLBINDEX ? Number(SHOWLBINDEX) : 1;
  const saveLeaderboard = String(SAVE_LEADERBOARD).toLowerCase() === "true";
  const wipeLeaderboard = String(WIPE_LEADERBOARD).toLowerCase() === "true";
  const forceShowLeaderboard = String(SHOW_LEADERBOARD).toLowerCase() === "true";

  const fetchedWordList = useGetWordList();

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
    if (initialized.current) return;
    initialized.current = true;

    const savedLeaderboard = localStorage.getItem("wg_leaderboard");
    if (wipeLeaderboard) localStorage.removeItem("wg_leaderboard");

    if (savedLeaderboard && saveLeaderboard && !wipeLeaderboard) {
      const savedPlayers: PlayerType[] = JSON.parse(savedLeaderboard) as PlayerType[];
      if (savedPlayers.length > 0) leaderboard.current = savedPlayers;
    }

    const twitchChannel: string = TWITCH_CHANNEL.toLowerCase();
    const twitchClient = tmi.Client({ channels: [twitchChannel] });

    twitchClient.connect();

    twitchClient.on("connected", () => {
      console.log("Connected to twitch chat!");
    });

    twitchClient.on("message", (_channel: string, tags: tmi.ChatUserstate, message: string) => {
      if (!tags.username || !message) return;
      if (isGameOver.current) return;

      if (/[\u0020\uDBC0]/.test(message)) {
        message = message.slice(0, -3);
      }

      if (message.toLowerCase() === word.current!.toLowerCase()) {
        isGameOver.current = true;
        gameIndex.current = gameIndex.current + 1;
        setDisplayWord(word.current!.split(""));

        if (intervalIdRef.current !== null) clearInterval(intervalIdRef.current);

        setWinner(tags.username);
        updateLeaderboard(tags.username);

        const timer = window.setInterval(() => {
          if (gameIndex.current >= showLeaderboardIndex) {
            showLeaderboardUI();
          } else {
            initializeGame();
          }

          clearInterval(timer);
        }, restartSpeed);
      }
    });
  }, []);

  useEffect(() => {
    if (!fetchedWordList || wordListInitialized) return;
    setWordListInitialized(true);
    wordList.current = fetchedWordList;

    initializeGame();
  }, [fetchedWordList]);

  const initializeGame = () => {
    if (!wordList.current) return;
    const clueCount = INITIAL_CLUES ? Number(INITIAL_CLUES) : 2;
    revealedCount.current = clueCount;

    const selectedWord: string = wordList.current[Math.floor(Math.random() * wordList.current.length)];
    word.current = decodeURIComponent(selectedWord);

    setDisplayWord(selectedWord.split("").map((letter, index) => (index < clueCount ? letter : "_")));
    isGameOver.current = false;

    const interval = setInterval(() => {
      if (revealedCount.current >= word.current!.length) return clearInterval(interval);
      revealedCount.current += 1;

      setDisplayWord((prev) =>
        word.current!.split("").map((letter, index) => (index < revealedCount.current ? letter : prev[index] || "_"))
      );
    }, clueSpeed + clueDelay);

    intervalIdRef.current = interval;
    setWinner("");
  };

  const updateLeaderboard = (winnerName: string) => {
    const lb = leaderboard.current;
    const i = lb.findIndex((p) => p.Username === winnerName);

    if (i !== -1) {
      lb[i] = { ...lb[i], Score: lb[i].Score + 1 };
    } else {
      lb.push({ Username: winnerName, Score: 1 });
    }

    lb.sort((a, b) => b.Score - a.Score);

    localStorage.setItem("wg_leaderboard", JSON.stringify(leaderboard.current));
  };

  const showLeaderboardUI = () => {
    setShowLeaderboard(true);
    gameIndex.current = 0;

    const timer = window.setInterval(() => {
      clearInterval(timer);

      setShowLeaderboard(false);
      initializeGame();
    }, 4000);
  };

  return (
    <div className="game-container">
      {!showLeaderboard && !forceShowLeaderboard ? (
        <div>
          <h2>Guess the word!</h2>
          <h3>{displayWord.join(" ")}</h3>
          {isGameOver.current ? <h3 className="winner">🎉 {winner} guessed correctly! 🎉</h3> : <h3></h3>}
        </div>
      ) : (
        <div>
          <h2>Leaderboard</h2>
          {leaderboard.current.length === 0 ? (
            <h3>No winners</h3>
          ) : (
            <ol style={{ justifyContent: "center", display: "flex" }}>
              {leaderboard.current.slice(0, 3).map((p, i) => {
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

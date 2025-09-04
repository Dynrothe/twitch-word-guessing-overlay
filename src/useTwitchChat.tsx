import { useEffect, useRef } from "react";
import * as tmi from "tmi.js";
import { GameConfig } from "./GameConfig";

const useTwitchChat = (config: any, wordList: string[] | undefined) => {
  const initialized = useRef<boolean>(false);

  useEffect(() => {
    const _config: GameConfig = config.current;

    if (!_config.Channel || _config.KICK || initialized.current || !wordList) return;
    initialized.current = true;

    const twitchChannel: string = _config.Channel.toLowerCase();
    const twitchClient = tmi.Client({ channels: [twitchChannel] });

    twitchClient.connect();

    twitchClient.on("connected", () => {
      console.log("Connected to twitch chat!");
    });

    twitchClient.on("message", (_channel: string, tags: tmi.ChatUserstate, message: string) => {
      if (!tags.username || !message) return;
      if (_config.IsGameOver) return;

      if (/[\u0020\uDBC0]/.test(message)) {
        message = message.slice(0, -3);
      }

      if (message.toLowerCase() === _config.Word!.toLowerCase()) {
        _config.IsGameOver = true;
        _config.GameIndex = _config.GameIndex + 1;
        _config.setDisplayWord(_config.Word!.split(""));

        if (_config.IntervalIdRef !== null) clearInterval(_config.IntervalIdRef);

        _config.setWinner(tags.username);
        _config.updateLeaderboard(tags.username);

        const timer = window.setInterval(
          () => {
            if (_config.GameIndex >= _config.ShowLeaderboardIndex) {
              _config.showLeaderboardUI();
            } else {
              _config.initializeGame();
            }

            clearInterval(timer);
          },
          _config.RestartSpeed,
          config
        );
      }
    });
  }, [wordList]);
};

export default useTwitchChat;

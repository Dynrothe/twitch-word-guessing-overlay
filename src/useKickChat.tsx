import { useEffect, useRef, useState } from "react";
import { GameConfig } from "./GameConfig";

const WS_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

export default function useKickChat(config: any, wordList: string[] | undefined) {
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const _config: GameConfig = config.current;

    if (!_config.Channel || !_config.KICK || connected || initialized || !wordList) return;

    setInitialized(true);

    const kickChannel: string = _config.Channel.toLowerCase();
    let closedByEffect = false;

    (async () => {
      const channelName = await getChannelRoomID(kickChannel);
      if (!channelName) return console.error("Could not get Kick channel ID.");

      console.log("Attempting to establish connection...");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setConnected(true);
        const subscribeFrame = JSON.stringify({
          event: "pusher:subscribe",
          data: { auth: "", channel: channelName },
        });
        ws.send(subscribeFrame);

        console.log("Connected to Kick chat");
      });

      ws.addEventListener("message", (ev) => {
        try {
          if (_config.IsGameOver) return;

          const parsed = JSON.parse(ev.data as string);
          if (parsed && !parsed.event.includes("ChatMessageEvent")) return;

          const messageData = JSON.parse(parsed.data);
          const sender = messageData.sender.username;
          let message = messageData.content;

          if (/[\uDB40\uDC00-\uDC7F]/.test(message)) {
            message = message.replace(/\uDB40[\uDC00-\uDC7F]/g, "").trimEnd();
          }

          if (message.toLowerCase() === _config.Word!.toLowerCase()) {
            _config.IsGameOver = true;
            _config.GameIndex = _config.GameIndex + 1;
            _config.setDisplayWord(_config.Word!.split(""));

            if (_config.IntervalIdRef !== null) clearInterval(_config.IntervalIdRef);

            _config.setWinner(sender);
            _config.updateLeaderboard(sender);

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
        } catch {
          // Do nothing
        }
      });

      ws.addEventListener("error", (err) => {
        console.error("WEBSOCKET ERROR", err);
      });

      ws.addEventListener("close", (ev) => {
        setConnected(false);
        console.log(
          `DISCONNECTED: code ${ev.code}, message "${ev.reason || "unkown"}" ${closedByEffect ? " (cleanup)" : ""}`
        );
      });
    })();

    return () => {
      closedByEffect = true;
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
          ws.close(1000, "Unmounting");
        } catch {
          // Do nothing
        }
      }
      wsRef.current = null;
    };
  }, [wordList]);
}
const getChannelRoomID = async (channel: string) => {
  console.log("Fetching Kick channel ID...");
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${channel}/chatroom`);
    if (!res.ok) return null;
    const json = await res.json();
    return `chatrooms.${json.id}.v2`;
  } catch (e) {
    console.error("FAILED TO GET CHANNEL ID", e);
    return null;
  }
};

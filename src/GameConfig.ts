import { PlayerType } from "./PlayerType";

export type GameConfig = {
  Channel: string;
  KICK: boolean;
  ClueSpeed: number;
  ClueDelay: number;
  RestartSpeed: number;
  ShowLeaderboardIndex: number;
  WordList: string[];
  Leaderboard: PlayerType[];
  Word: string | null;
  RevealCount: number;
  IsGameOver: boolean;
  GameIndex: number;
  IntervalIdRef: any;
  ForceShowLeaderboard: boolean;
  initializeGame: Function;
  setDisplayWord: Function;
  setWinner: Function;
  updateLeaderboard: Function;
  showLeaderboardUI: Function;
};

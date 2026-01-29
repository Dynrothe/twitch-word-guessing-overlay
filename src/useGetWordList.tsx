import { useEffect, useState } from "react";

const defaultWords = [
  "apple",
  "banana",
  "cherry",
  "grapes",
  "orange",
  "peanut",
  "tomato",
  "butter",
  "cheese",
  "potato",
  "carrot",
  "pepper",
  "muffin",
  "cookie",
  "donuts",
  "coffee",
  "butter",
  "bottle",
  "pencil",
  "marker",
  "laptop",
  "tablet",
  "mobile",
  "window",
  "mirror",
  "guitar",
  "violin",
  "drums",
  "pillow",
  "cushion",
  "tissue",
  "basket",
  "hanger",
  "jacket",
  "sweater",
  "button",
  "breeze",
  "forest",
  "garden",
  "rocket",
  "planet",
  "cosmos",
  "galaxy",
  "shadow",
  "tunnel",
  "bridge",
  "castle",
  "island",
  "frozen",
  "sunset",
  "desert",
  "coffin",
  "turkey",
  "butter",
  "pencil",
  "cloudy",
  "friend",
  "school",
  "pocket",
  "singer",
  "artist",
  "dancer",
  "writer",
  "reader",
  "farmer",
  "hunter",
  "driver",
  "doctor",
  "lawyer",
  "baker",
  "sailor",
  "hammer",
  "socket",
  "branch",
  "silver",
  "gadget",
  "sponge",
  "anchor",
  "ladder",
  "helmet",
  "ribbon",
  "flames",
  "danger",
  "muscle",
  "shadow",
  "wallet",
  "pebble",
  "marble",
  "candle",
  "jungle",
  "desert",
  "winter",
  "summer",
  "spring",
  "autumn",
  "melody",
  "garden",
  "church",
  "theory",
  "saddle",
];

export const useGetWordList = () => {
  const urlParams = new URLSearchParams(window.location.search);

  const WORD_LIST = urlParams.get("wordlist") ? decodeURIComponent(urlParams.get("wordlist")!) : null;
  const WORD_LIST_URL = urlParams.get("wordlisturl") ? decodeURIComponent(urlParams.get("wordlisturl")!) : null;
  const [wordList, setWordList] = useState<string[]>();

  useEffect(() => {
    (async () => {
      if (!WORD_LIST && !WORD_LIST_URL) setWordList(defaultWords);

      if (WORD_LIST) return setWordList(WORD_LIST.split(","));

      if (!WORD_LIST_URL) return setWordList(defaultWords);

      const REQUEST = await fetch("https://api.codetabs.com/v1/proxy?quest=" + WORD_LIST_URL);
      const wordListText = await REQUEST.text();

      setWordList(wordListText.split(","));
    })();
  }, []);

  return wordList;
};

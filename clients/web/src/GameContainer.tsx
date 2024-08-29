import { useCallback, useState } from "react";
import "./GameContainer.css";
import * as api from "./utils/api";
import { Story } from "./types";
import { parseMarkdown } from "./utils/markdownUtils";
import { Game } from "./components/Game";

function GameContainer() {
  const [bookName, setBookName] = useState<string>();
  const [chapterName, setChapterName] = useState<string>();
  const [story, setStory] = useState<Story>();
  const storyId = `${bookName}/${chapterName}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).story = story;

  const fetchStory = useCallback((storyName: string, chapterName: string) => {
    setBookName(storyName);
    setChapterName(chapterName);
    api.getStory(storyName, chapterName).then((markdown) => {
      const story = parseMarkdown(markdown);
      setStory(story);
    });
  }, []);

  if (!bookName) {
    const url = new URL(window.location.href);
    const [, , , storyName, chapterName] = url.pathname.split("/");
    if (!storyName || !chapterName) {
      fetchStory("help", "introduction");
      // window.location.href = `${folder}/game.html/help/introduction`;
    } else {
      fetchStory(storyName, chapterName);
    }
  }

  if (story?.title) {
    document.title = `${story.title}`;
  }

  return (
    <>
      <div className="game-container">
        <h1> GAME </h1>

        <Game storyId={storyId} story={story} />
      </div>
    </>
  );
}

export default GameContainer;

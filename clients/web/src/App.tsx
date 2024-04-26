import { useCallback, useState } from "react";
import "./App.css";
import { Markdown } from "./components/Markdown";
import * as api from "./utils/api";
import { Page, Story } from "./types";
import { markdownToStory, storyToMarkdown } from "./utils/markdownUtils";
import { Chapters } from "./components/Chapters";
import { Game } from "./components/Game";
import { Images } from "./components/Images";

function App() {
  const [storyName, setStoryName] = useState<string>();
  const [bookName, setBookName] = useState<string>();
  const [story, setStory] = useState<Story>();
  const [page, setPage] = useState<Page>("edit");

  const saveAndUpdateStory = useCallback(
    async (story: Story) => {
      if (storyName === undefined || bookName === undefined) {
        return;
      }
      const markdown = storyToMarkdown(story);
      story.markdown = markdown;
      console.log("story", story);
      await api.saveStory(storyName, bookName, markdown);
      setStory(story);
    },
    [storyName, bookName]
  );

  const fetchStory = useCallback((storyName: string, bookName: string) => {
    setStoryName(storyName);
    setBookName(bookName);
    api.getStory(storyName, bookName).then((markdown) => {
      const story = markdownToStory(markdown, storyName ?? "");
      setStory(story);
    });
  }, []);

  if (!storyName) {
    const url = new URL(window.location.href);
    const [, storyName, bookName] = url.pathname.split("/");
    if (!storyName || !bookName) {
      window.location.href = "/test/grotta";
    } else {
      fetchStory(storyName, bookName);
    }
  }

  return (
    <>
      <div className="editor-container">
        {page !== "game" && (
          <ul className="menu-container">
            <li>
              <button onClick={() => setPage("edit")}>Edit</button>
            </li>
            <li>
              <button onClick={() => setPage("game")}>Game</button>
            </li>
            <li>
              <button onClick={() => setPage("images")}>Images</button>
            </li>
            <li>
              <button onClick={() => setPage("chapters")}>Chapters</button>
            </li>
          </ul>
        )}
        {page === "edit" && (
          <Markdown story={story} updateStory={saveAndUpdateStory} />
        )}
        {page === "chapters" && (
          <Chapters story={story} updateStory={saveAndUpdateStory} />
        )}
        {page === "images" && story && (
          <Images story={story} updateStory={saveAndUpdateStory} />
        )}
      </div>
      <div className="game-container">
        {page === "game" && <Game story={story} exit={() => setPage("edit")} />}
      </div>
    </>
  );
}

export default App;

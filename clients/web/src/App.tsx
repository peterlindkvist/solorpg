import { useCallback, useState } from "react";
import "./App.css";
import { Markdown } from "./components/Markdown";
import * as api from "./utils/api";
import { Page, Story } from "./types";
import { markdownToStory, storyToMarkdown } from "./utils/markdownUtils";
import { Game } from "./components/Game";

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
    const [, folder, page, storyName, bookName] = url.pathname.split("/");
    if (
      !storyName ||
      !bookName ||
      !["edit", "game", "images", "chapters"].includes(page)
    ) {
      window.location.href = `${folder}/game/test/grotta`;
    } else {
      fetchStory(storyName, bookName);
      setPage(page as Page);
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
          </ul>
        )}
        {page === "edit" && (
          <Markdown story={story} updateStory={saveAndUpdateStory} />
        )}
      </div>
      <div className="game-container">
        {page === "game" && <Game story={story} exit={() => setPage("edit")} />}
      </div>
    </>
  );
}

export default App;

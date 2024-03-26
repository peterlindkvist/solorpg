import { useCallback, useState } from "react";
import "./App.css";
import { Markdown } from "./components/Markdown";
import * as api from "./utils/api";
import { Page, State, Story } from "./types";
import { findImages, parseMarkdown } from "./utils/markdownUtils";
import { Chapters } from "./components/Chapters";
import { Game } from "./components/Game";
import { Images } from "./components/Images";

function App() {
  const [storyName, setStoryName] = useState<string>();
  const [bookName, setBookName] = useState<string>();
  const [story, setStory] = useState<Story>();
  const [page, setPage] = useState<Page>("edit");

  const updateMarkdown = useCallback(
    async (markdown: string) => {
      const chapters = parseMarkdown(markdown);
      const state: State = chapters[0].state ?? {};
      const story: Story = {
        id: storyName ?? "",
        title: state.title ?? chapters[0].heading ?? "",
        markdown: markdown,
        chapters,
        images: findImages(chapters),
        state,
      };

      setStory(story);
    },
    [storyName]
  );

  const saveAndUpdateMarkdown = useCallback(
    async (markdown: string) => {
      if (storyName === undefined || bookName === undefined) {
        return;
      }
      await api.saveStory(storyName, bookName, markdown);
      await updateMarkdown(markdown);
    },
    [storyName, bookName, updateMarkdown]
  );

  // const updateStory = useCallback(
  //   async (story: Story) => {
  //     const formattedStory = storyToMarkdown(story);
  //     updateMarkdown(formattedStory);
  //   },
  //   [updateMarkdown]
  // );

  const fetchStory = useCallback(
    (storyName: string, bookName: string) => {
      setStoryName(storyName);
      setBookName(bookName);
      api.getStory(storyName, bookName).then((text) => {
        updateMarkdown(text);
      });
    },
    [updateMarkdown]
  );

  if (!storyName) {
    fetchStory("test", "grotta");
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
          <Markdown story={story} updateMarkdown={saveAndUpdateMarkdown} />
        )}
        {page === "chapters" && (
          <Chapters story={story} updateMarkdown={saveAndUpdateMarkdown} />
        )}
        {page === "images" && story && (
          <Images story={story} updateMarkdown={saveAndUpdateMarkdown} />
        )}
      </div>
      <div className="game-container">
        {page === "game" && <Game story={story} exit={() => setPage("edit")} />}
      </div>
    </>
  );
}

export default App;

import { useCallback, useState } from "react";
import "./App.css";
import { Markdown } from "./components/Markdown";
import * as api from "./utils/api";
import { Page, Story } from "./types";
import {
  parseMarkdown,
  storyToMarkdown,
} from "./utils/markdownUtils/markdownUtils";
import { Game } from "./components/Game";

function App() {
  const [bookName, setBookName] = useState<string>();
  const [chapterName, setChapterName] = useState<string>();
  const [story, setStory] = useState<Story>();
  const [page, setPage] = useState<Page>("edit");
  const storyId = `${bookName}/${chapterName}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).story = story;

  const saveAndUpdateStory = useCallback(
    async (story: Story) => {
      if (bookName === undefined || chapterName === undefined) {
        return;
      }
      const markdown = storyToMarkdown(story);
      story.markdown = markdown;
      await api.saveStory(bookName, chapterName, markdown);
      setStory(story);
    },
    [bookName, chapterName]
  );

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
    const [, , page, storyName, chapterName] = url.pathname.split("/");
    if (
      !storyName ||
      !chapterName ||
      !["edit", "game", "images", "sections"].includes(page)
    ) {
      fetchStory("help", "introduction");
    } else {
      fetchStory(storyName, chapterName);
      setPage(page as Page);
    }
  }

  if (story?.title) {
    document.title = `${story.title}`;
  }

  return (
    <>
      <div className="editor-container">
        {page === "edit" && story && (
          <Markdown
            storyId={storyId}
            story={story}
            updateStory={saveAndUpdateStory}
            setPage={setPage}
          />
        )}
      </div>
      <div className="game-container">
        {page === "game" && (
          <Game storyId={storyId} story={story} exit={() => setPage("edit")} />
        )}
      </div>
    </>
  );
}

export default App;

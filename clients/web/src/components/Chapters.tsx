import { useCallback, useState } from "react";
import { Chapter, Story } from "../types";
import "./Chapters.css";
import * as api from "../utils/api";

type Props = {
  story?: Story;
  updateMarkdown: (text: string) => void;
};

export function Chapters({ story, updateMarkdown }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const fetchSound = useCallback(
    async (chapter: Chapter) => {
      if (!story) {
        return;
      }
      setIsLoading(true);
      const options = {
        storyId: story.id,
        text: chapter.voice ?? "test",
        narrator: story?.state?.narrator ?? "onyx",
      };
      api.textToSpeech(options).then((result) => {
        const chapterState = chapter.state;
        if (chapterState) {
          chapterState.voiceUrl = result.url;
          const regExpStr = `${chapter.heading}${"\n```"}[\\s\\S]*?${"```"}`;
          const regExp = new RegExp(regExpStr, "g");

          const newStateJSON =
            chapter.heading +
            "\n```\n" +
            JSON.stringify(chapterState, null, 2) +
            "\n```";
          const markdown = story.markdown.replace(regExp, newStateJSON);

          updateMarkdown(markdown);
        } else {
          const newState = { voiceUrl: result.url };
          const markdown = story.markdown.replace(
            `## ${chapter.heading}`,
            `## ${chapter.heading}` +
              "\n```\n" +
              JSON.stringify(newState, null, 2) +
              "\n```"
          );
          updateMarkdown(markdown);
        }

        setIsLoading(false);
      });
    },
    [story, updateMarkdown]
  );

  if (!story?.chapters) {
    return null;
  }

  return (
    <ul>
      {story.chapters.map((chapter) => (
        <li key={chapter.id}>
          <p>{chapter.heading}</p>
          <button onClick={() => fetchSound(chapter)} disabled={isLoading}>
            🗘
          </button>
        </li>
      ))}
    </ul>
  );
}

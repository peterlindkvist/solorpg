import { useCallback, useState } from "react";
import { Chapter, Story } from "../types";
import "./Chapters.css";
import * as api from "../utils/api";

type Props = {
  story?: Story;
  updateStory: (story: Story) => void;
};

export function Chapters({ story, updateStory }: Props) {
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
        chapter.state = { ...chapter.state, voiceUrl: result.url };
        updateStory(story);
        setIsLoading(false);
      });
    },
    [story, updateStory]
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

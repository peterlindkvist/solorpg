import { useCallback, useEffect, useState } from "react";
import { Section, Story } from "../../types";
import * as api from "../../utils/api";

type Props = {
  useNarrator: boolean;
  useUserVoice: boolean;
  section?: Section;
  story?: Story;
  onEnd: () => void;
};

export function Narrator({
  useNarrator,
  useUserVoice,
  section,
  story,
  onEnd,
}: Props) {
  const [narratorUrls, setNarratorUrls] = useState<string[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  const generateNarration = useCallback(async () => {
    if (!useNarrator || !story || !section) return;

    const paragraphs = section.parts.filter((p) => p.type === "paragraph");
    const urls: string[] = [];

    for (const p of paragraphs) {
      const query = {
        storyId: "test-4o",
        text: p.text,
        narrator: "nova",
      };

      try {
        const res = await api.textToSpeech(query);
        urls.push(res.url);
      } catch (error) {
        console.error("Failed to generate narration:", error);
      }
    }

    setNarratorUrls(urls);
    setCurrentAudioIndex(0);
  }, [useNarrator, story, section]);

  useEffect(() => {
    if (section) {
      generateNarration();
    }
  }, [generateNarration, section]);

  const handleAudioEnded = useCallback(() => {
    if (currentAudioIndex < narratorUrls.length - 1) {
      // Play next audio
      setCurrentAudioIndex(currentAudioIndex + 1);
    } else {
      // All audios finished, trigger onEnd if voice is enabled
      if (useUserVoice) {
        onEnd();
      }
    }
  }, [currentAudioIndex, narratorUrls.length, useUserVoice, onEnd]);

  if (!useNarrator || narratorUrls.length === 0) {
    return null;
  }

  return (
    <audio
      key={currentAudioIndex} // Force re-render when audio changes
      src={narratorUrls[currentAudioIndex]}
      controls
      autoPlay
      onEnded={handleAudioEnded}
    />
  );
}

import { useCallback, useState } from "react";
import { Chapter, Choice, Part, State, Story } from "../types";
import { useReactMediaRecorder } from "react-media-recorder";
import * as api from "../utils/api";

import "./Game.css";
import { ImagePart } from "./game/ImagePart";
import { ButtonPart } from "./game/ButtonPart";
import { parseChapter } from "./game/gameUtils";
import { Header } from "./game/Header";

type Props = {
  story?: Story;
  exit: () => void;
};

let recordInterval: NodeJS.Timeout | undefined;

export function Game({ story, exit }: Props) {
  const [previousStory, setPreviousStory] = useState<Story>();
  const [chapter, setChapter] = useState<Chapter>();
  const [renderParts, setRenderParts] = useState<Array<Part>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voice, setVoice] = useState(false);
  const [sound, setSound] = useState(false);
  const [state, setState] = useState<State>();

  const { startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    video: false,
    askPermissionOnMount: true,
    onStop: (_blobUrl, blob) => {
      if (voice) {
        analyseText(blob);
      }
    },
  });

  const recordVoice = useCallback(() => {
    console.log("recordVoice start");
    setIsRecording(true);
    startRecording();
    recordInterval = setTimeout(() => {
      console.log("recordVoice stop");
      stopRecording();
      setIsRecording(false);
    }, 3000);
  }, [startRecording, stopRecording]);

  const toggleVoice = useCallback(() => {
    if (voice) {
      console.log("stopVoice");
      if (recordInterval) {
        clearTimeout(recordInterval);
      }
      stopRecording();
      setIsRecording(false);
    }
    setVoice(!voice);
  }, [stopRecording, voice]);

  const analyseText = useCallback(
    async (blob: Blob) => {
      const ret = await api.speechToText(blob, { storyId: story?.id ?? "" });
      const spokenText = ret.text.toLowerCase();
      const choices: Choice[] =
        (chapter?.parts.filter((p) => p.type === "choice") as Choice[]) ?? [];
      const found = choices.find((c) => spokenText.includes(c.key));

      if (found) {
        setChapter(story?.chapters.find((c) => c.id === found.target));
      } else {
        recordVoice();
      }
    },
    [story, chapter, recordVoice]
  );

  const setNewChapter = useCallback(
    (chapter: Chapter) => {
      if (state) {
        const { parts, newState } = parseChapter(chapter, state);
        setRenderParts(parts);
        setState(newState);
        setChapter(chapter);
        console.log("setNewChapter", chapter, state);
      }
    },
    [state]
  );

  const navigateToChapter = useCallback(
    (id: string) => {
      const nextChapter = story?.chapters.find((c) => c.id === id);
      if (nextChapter) {
        setNewChapter(nextChapter);
      }
    },
    [story, setNewChapter]
  );

  if (previousStory !== story) {
    setPreviousStory(story);
    const chapter = story?.chapters[0];
    if (chapter) {
      setNewChapter(chapter);
    }
  }

  if (!story || !chapter) {
    return null;
  }

  return (
    <div
      className="game"
      style={isRecording ? { backgroundColor: "#ff000060" } : {}}
    >
      <Header
        exit={exit}
        setSound={setSound}
        toggleVoice={toggleVoice}
        sound={sound}
        voice={voice}
      />

      <div className="game-text">
        {renderParts.map((part, i) => {
          if (part.type === "image") {
            return <ImagePart key={i} part={part} />;
          }
          if (part.type === "choice" || part.type === "navigation") {
            return (
              <ButtonPart key={i} part={part} onClick={navigateToChapter} />
            );
          }
          if (part.type === "paragraph") {
            return <p key={i}>{part.text}</p>;
          }
        })}
      </div>
      {sound && chapter.state?.voiceUrl && (
        <audio
          src={chapter.state?.voiceUrl}
          controls
          autoPlay
          onEnded={() => voice && recordVoice()}
        />
      )}
    </div>
  );
}

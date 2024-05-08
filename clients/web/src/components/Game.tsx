import { useCallback, useEffect, useState } from "react";
import { Chapter, Choice, Part, State, Story } from "../types";
import { useReactMediaRecorder } from "react-media-recorder";
import * as api from "../utils/api";

import "./Game.css";
import { ImagePart } from "./game/ImagePart";
import { ButtonPart } from "./game/ButtonPart";
import { parseChapter } from "../utils/gameUtils";
import { Header } from "./game/Header";

type Props = {
  story?: Story;
  exit: () => void;
};

let recordInterval: NodeJS.Timeout | undefined;

export function Game(props: Props) {
  const [story, setStory] = useState<Story>();
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

  const setHash = useCallback((chapterId: string, state: State = {}) => {
    const hash = chapterId + "?state=" + btoa(JSON.stringify(state));
    window.location.hash = hash;
  }, []);

  const setNewChapter = useCallback(
    (chapterId: string, oldState: State) => {
      if (chapterId && chapterId !== chapter?.id) {
        const newChapter = story?.chapters.find((c) => c.id === chapterId);
        if (newChapter) {
          const { parts, newState } = parseChapter(newChapter, oldState);
          setRenderParts(parts);
          setState(newState);
          setChapter(newChapter);
        } else {
          console.error("chapter not found", chapterId);
        }
      }
    },
    [story, chapter]
  );

  const navigateToChapter = useCallback(
    (id: string) => {
      const nextChapter = story?.chapters.find((c) => c.id === id);
      if (nextChapter) {
        setHash(id, state);
      }
    },
    [story, state, setHash]
  );

  const hashChangeHandler = useCallback(() => {
    const [chapterId, stateJSON] = window.location.hash
      .substring(1)
      .split("?state=");
    setNewChapter(chapterId, stateJSON ? JSON.parse(atob(stateJSON)) : {});
  }, [setNewChapter]);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    hashChangeHandler();

    return () => {
      window.removeEventListener("hashchange", hashChangeHandler);
    };
  }, [hashChangeHandler]);

  if (story !== props.story) {
    setStory(props.story);
  }

  const chapterId = window.location.hash.substring(1);
  if (!chapterId && props?.story?.chapters[0]?.id) {
    const chapter = props.story?.chapters[0]?.id;
    const state = props.story?.state;
    setHash(chapter, state);
  }

  return (
    <div
      className="game"
      style={isRecording ? { backgroundColor: "#ff000060" } : {}}
    >
      <Header
        exit={props.exit}
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
          if (part.type === "action" || part.type === "condition") {
            return (
              <code className="game-action" key={i}>
                {part.text}
              </code>
            );
          }
        })}
      </div>
      {/* {sound && chapter?.state?.voiceUrl && (
        <audio
          src={chapter.state?.voiceUrl}
          controls
          autoPlay
          onEnded={() => voice && recordVoice()}
        />
      )} */}
    </div>
  );
}

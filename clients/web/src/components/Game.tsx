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
  const [useUserVoice, setUseUserVoice] = useState(false);
  const [useNarrator, setUseNarrator] = useState(true);
  // const [narratorUrl, setNarratorFile] = useState<string>();
  const [isLoadingNarrator, setIsLoadingNarrator] = useState(false);
  const [state, setState] = useState<State>();

  const { startRecording, stopRecording } = useReactMediaRecorder({
    audio: useUserVoice,
    video: false,
    askPermissionOnMount: true,
    onStop: (_blobUrl, blob) => {
      if (useUserVoice) {
        analyseUserVoice(blob);
      }
    },
  });

  const recordUserVoice = useCallback(() => {
    console.log("recordVoice start");
    setIsRecording(true);
    startRecording();
    recordInterval = setTimeout(() => {
      console.log("recordVoice stop");
      stopRecording();
      setIsRecording(false);
    }, 3000);
  }, [startRecording, stopRecording]);

  const toggleUserVoice = useCallback(() => {
    if (useUserVoice) {
      console.log("stopVoice");
      if (recordInterval) {
        clearTimeout(recordInterval);
      }
      stopRecording();
      setIsRecording(false);
    }
    setUseUserVoice(!useUserVoice);
  }, [stopRecording, useUserVoice]);

  const analyseUserVoice = useCallback(
    async (blob: Blob) => {
      const ret = await api.speechToText(blob, { storyId: story?.id ?? "" });
      const spokenText = ret.text.toLowerCase();
      const choices: Choice[] =
        (chapter?.parts.filter((p) => p.type === "choice") as Choice[]) ?? [];
      const found = choices.find((c) => spokenText.includes(c.key));

      if (found) {
        setChapter(story?.chapters.find((c) => c.id === found.target));
      } else {
        recordUserVoice();
      }
    },
    [story, chapter, recordUserVoice]
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
          const { parts, newState, narratorText } = parseChapter(
            newChapter,
            oldState
          );
          setRenderParts(parts);
          setState(newState);
          setChapter(newChapter);
          if (useNarrator && story) {
            setIsLoadingNarrator(true);
            isLoadingNarrator;
            const T2S = window.speechSynthesis || speechSynthesis;
            const utter = new SpeechSynthesisUtterance(narratorText);
            utter.volume = 1;
            const voices = T2S.getVoices();
            const voice =
              voices.find((v) => v.lang === "sv-SE") ??
              voices.find((v) => v.lang === "en-US");
            console.log("utter", narratorText, utter);
            if (voice) {
              utter.lang = voice?.lang;
              utter.voice = voice;
            }
            T2S.speak(utter);
            setIsLoadingNarrator(false);
            // const query = {
            //   storyId: story.id,
            //   text: narratorText,
            //   narrator: story.settings.assistant?.narrator,
            // };
            // api.textToSpeech(query).then((res) => {
            //   console.log("narrator", res);
            //   setNarratorFile(res.url);
            // });
          }
        } else {
          console.error("chapter not found", chapterId);
        }
      }
    },
    [story, chapter, useNarrator]
  );

  const navigateToChapter = useCallback(
    (id: string) => {
      const chapterId = id.replace(/^#/, "");
      const nextChapter = story?.chapters.find((c) => c.id === chapterId);
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
        setSound={setUseNarrator}
        toggleVoice={toggleUserVoice}
        sound={useNarrator}
        voice={useUserVoice}
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
      {/* {useNarrator && narratorUrl && (
        <audio
          src={narratorUrl}
          controls
          autoPlay
          onEnded={() => useUserVoice && recordUserVoice()}
        />
      )} */}
    </div>
  );
}

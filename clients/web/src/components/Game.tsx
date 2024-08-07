import { useCallback, useEffect, useState } from "react";
import { Section, Choice, Part, State, Story } from "../types";
import { useReactMediaRecorder } from "react-media-recorder";
import * as api from "../utils/api";

import "./Game.css";
import { ImagePart } from "./game/ImagePart";
import { ButtonPart } from "./game/ButtonPart";
import { parseSection } from "../utils/gameUtils";
import { Header } from "./game/Header";

type Props = {
  story?: Story;
  exit: () => void;
};

let recordInterval: NodeJS.Timeout | undefined;

export function Game(props: Props) {
  const [story, setStory] = useState<Story>();
  const [section, setSection] = useState<Section>();
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
        (section?.parts.filter((p) => p.type === "choice") as Choice[]) ?? [];
      const found = choices.find((c) => spokenText.includes(c.key));

      if (found) {
        setSection(story?.sections.find((c) => c.id === found.target));
      } else {
        recordUserVoice();
      }
    },
    [story, section, recordUserVoice]
  );

  const setHash = useCallback((sectionId: string, state: State = {}) => {
    const hash = sectionId + "?state=" + btoa(JSON.stringify(state));
    window.location.hash = hash;
  }, []);

  const setNewsection = useCallback(
    (sectionId: string, oldState: State) => {
      if (sectionId && sectionId !== section?.id) {
        const newsection = story?.sections.find((c) => c.id === sectionId);
        if (newsection) {
          const { parts, newState, narratorText } = parseSection(
            newsection,
            oldState
          );
          setRenderParts(parts);
          setState(newState);
          setSection(newsection);
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
          console.error("section not found", sectionId);
        }
      }
    },
    [story, section, useNarrator]
  );

  const navigateTosection = useCallback(
    (id: string) => {
      const sectionId = id.replace(/^#/, "");
      const nextsection = story?.sections.find((c) => c.id === sectionId);
      if (nextsection) {
        setHash(id, state);
      }
    },
    [story, state, setHash]
  );

  const hashChangeHandler = useCallback(() => {
    const [sectionId, stateJSON] = window.location.hash
      .substring(1)
      .split("?state=");
    setNewsection(sectionId, stateJSON ? JSON.parse(atob(stateJSON)) : {});
  }, [setNewsection]);

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

  const sectionId = window.location.hash.substring(1);
  if (!sectionId && props?.story?.sections[0]?.id) {
    const section = props.story?.sections[0]?.id;
    const state = props.story?.state;
    setHash(section, state);
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

      <div className="game-section">
        <h2>{section?.heading}</h2>
        {renderParts.map((part, i) => {
          if (part.type === "image") {
            return <ImagePart key={i} part={part} />;
          }
          if (part.type === "choice" || part.type === "navigation") {
            return (
              <ButtonPart key={i} part={part} onClick={navigateTosection} />
            );
          }
          if (part.type === "paragraph") {
            return (
              <p className="game-text" key={i}>
                {part.text}
              </p>
            );
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

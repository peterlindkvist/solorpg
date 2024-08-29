import { useCallback, useEffect, useState } from "react";
import { Section, Link, Part, State, Story } from "../types";
import { useReactMediaRecorder } from "react-media-recorder";
import * as api from "../utils/api";

import "./Game.css";
import { ImagePart } from "./game/ImagePart";
import { ButtonPart } from "./game/ButtonPart";
import {
  buildStateQuery,
  mergeStates,
  parseSection,
  parseStateQueryValue,
} from "../utils/gameUtils";
import { Header } from "./game/Header";
import { ParagraphPart } from "./game/ParagraphPart";

type Props = {
  storyId?: string;
  story?: Story;
  exit?: () => void;
};

let recordInterval: NodeJS.Timeout | undefined;

const SHOW_HEADER_MENU = false;

export function Game(props: Props) {
  const [story, setStory] = useState<Story>();
  const [section, setSection] = useState<Section>();
  const [renderParts, setRenderParts] = useState<Array<Part>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [useUserVoice, setUseUserVoice] = useState(false);
  const [useNarrator, setUseNarrator] = useState(false);
  // const [narratorUrl, setNarratorFile] = useState<string>();
  const [isLoadingNarrator, setIsLoadingNarrator] = useState(false);
  const [state, setState] = useState<State>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).state = state;

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
      const ret = await api.speechToText(blob, {
        storyId: props.storyId ?? "",
      });
      const spokenText = ret.text.toLowerCase();
      const links: Link[] =
        (section?.parts.filter((p) => p.type === "link") as Link[]) ?? [];
      const found = links.find((c) => spokenText.includes(c.key));

      if (found) {
        setSection(story?.sections.find((c) => c.id === found.target));
      } else {
        recordUserVoice();
      }
    },
    [story, section, recordUserVoice]
  );

  const setHash = useCallback((sectionId: string, state: State = {}) => {
    const hash = `${sectionId}?${buildStateQuery(state)}`;
    window.location.hash = hash;
  }, []);

  const setNewsection = useCallback(
    (sectionId: string, oldState: State) => {
      if (sectionId && sectionId !== section?.id) {
        const newsection = story?.sections.find((c) => c.id === sectionId);
        if (newsection) {
          const { parts, newState, narratorText } = parseSection(
            newsection,
            oldState,
            story?.settings.state
          );
          setRenderParts(parts);
          setState(newState);
          setSection(newsection);

          document.querySelector("body")?.scrollIntoView();

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

  const navigateHandler = useCallback(
    (id: string) => {
      if (id.startsWith("#")) {
        const sectionId = id.replace(/^#/, "");
        const nextsection = story?.sections.find((c) => c.id === sectionId);
        if (nextsection) {
          setHash(id, state);
        }
      } else if (id.startsWith("/")) {
        window.location.href = `${id}#?${buildStateQuery(state)}`;
      } else {
        window.location.href = id;
      }
    },
    [story, state, setHash]
  );

  const hashChangeHandler = useCallback(() => {
    const [sectionId, stateJSON] = window.location.hash
      .substring(1)
      .split("?state=");
    setNewsection(sectionId, stateJSON ? parseStateQueryValue(stateJSON) : {});
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

  const [sectionId, hashQuery] = window.location.hash.substring(1).split("?");
  if (!sectionId && props?.story?.sections[0]?.id) {
    const section = props.story?.sections[0]?.id;
    const hashState = hashQuery
      ? parseStateQueryValue(hashQuery.replace("state=", ""))
      : undefined;
    const newState = mergeStates(props.story?.state, hashState);
    setHash(section, newState);
  }

  console.log("render", renderParts, section);

  return (
    <div
      className="game"
      style={isRecording ? { backgroundColor: "#ff000060" } : {}}
    >
      {SHOW_HEADER_MENU && (
        <Header
          exit={props.exit}
          setSound={setUseNarrator}
          toggleVoice={toggleUserVoice}
          sound={useNarrator}
          voice={useUserVoice}
        />
      )}

      <div className="game-section">
        {renderParts.map((part, i) => {
          if (part.type === "header") {
            return <h2>{section?.heading}</h2>;
          }
          if (part.type === "image") {
            return <ImagePart key={i} part={part} />;
          }
          if (part.type === "link" || part.type === "navigation") {
            return <ButtonPart key={i} part={part} onClick={navigateHandler} />;
          }
          if (part.type === "paragraph") {
            return <ParagraphPart key={i} part={part} />;
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

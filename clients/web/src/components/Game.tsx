import { useCallback, useEffect, useState } from "react";
import type { Part, Section, State, Story } from "../types";

import "./Game.css";
import {
  buildStateQuery,
  mergeStates,
  parseNextSection,
  parseStateQueryValue,
} from "../utils/gameUtils";
import { ButtonPart } from "./game/ButtonPart";
import { Header } from "./game/Header";
import { ImagePart } from "./game/ImagePart";
import { Narrator } from "./game/Narrator";
import { ParagraphPart } from "./game/ParagraphPart";
import { useVoice } from "./game/Voice";

type Props = {
  storyId?: string;
  story?: Story;
  exit?: () => void;
};

export function Game(props: Props) {
  const [story, setStory] = useState<Story>();
  const [section, setSection] = useState<Section>();
  const [renderParts, setRenderParts] = useState<Array<Part>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [useUserVoice, setUseUserVoice] = useState(false);
  const [useNarrator, setUseNarrator] = useState(true);
  const [state, setState] = useState<State>();

  // to be able to log the state in the console
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).state = state;

  const { recordUserVoice, stopVoiceRecording } = useVoice({
    useUserVoice,
    section,
    story,
    storyId: props.storyId,
    setSection,
    setIsRecording,
  });

  const toggleUserVoice = useCallback(() => {
    if (useUserVoice) {
      stopVoiceRecording();
    }
    setUseUserVoice(!useUserVoice);
  }, [stopVoiceRecording, useUserVoice]);

  const setHash = useCallback((sectionId: string, state: State = {}) => {
    const hash = `${sectionId}?${buildStateQuery(state)}`;
    window.location.hash = hash;
  }, []);

  const setNewsection = useCallback(
    (sectionId: string, oldState: State) => {
      if (story && sectionId && sectionId !== section?.id) {
        const {
          section: newSection,
          parts,
          newState,
        } = parseNextSection(story, sectionId, oldState, story.settings.state);

        console.log("setNewsection", {
          sectionId,
          newSection,
          parts,
          newState,
        });

        if (newSection) {
          setRenderParts(parts);
          setState(newState);
          setSection(newSection);

          document.querySelector("body")?.scrollIntoView();
        } else {
          console.error("section not found", sectionId);
        }
      }
    },
    [story, section]
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
    console.log("hashChangeHandler", {
      fullHash: window.location.hash,
      sectionId,
      availableSections: story?.sections.map((s) => s.id),
    });
    if (sectionId) {
      setNewsection(
        sectionId,
        stateJSON ? parseStateQueryValue(stateJSON) : {}
      );
    }
  }, [setNewsection, story]);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    hashChangeHandler();

    return () => {
      window.removeEventListener("hashchange", hashChangeHandler);
    };
  }, [hashChangeHandler]);

  // Initialize story when props change
  useEffect(() => {
    if (story !== props.story) {
      setStory(props.story);
    }
  }, [props.story, story]);

  console.log("Story", story);

  // Handle initial route when no section is selected
  useEffect(() => {
    const [sectionId, hashQuery] = window.location.hash.substring(1).split("?");
    if (!sectionId && props?.story?.sections[0]?.id) {
      const section = props.story?.sections[0]?.id;
      const hashState = hashQuery
        ? parseStateQueryValue(hashQuery.replace("state=", ""))
        : undefined;
      const newState = mergeStates(props.story?.state, hashState);
      setHash(section, newState);
    }
  }, [props.story, setHash]);

  return (
    <div
      className="game"
      style={isRecording ? { backgroundColor: "#ff000060" } : {}}
    >
      {props.exit && (
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
            return <h2 key={i}>{part.text}</h2>;
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
          // hide the action and condition parts in the UI
          // if (part.type === "action" || part.type === "condition") {
          //   return (
          //     <code className="game-action" key={i}>
          //       {part.text}
          //     </code>
          //   );
          // }
        })}
      </div>
      <Narrator
        useNarrator={useNarrator}
        useUserVoice={useUserVoice}
        section={section}
        parts={renderParts}
        story={story}
        onEnd={recordUserVoice}
        storyId={props.storyId}
      />
    </div>
  );
}

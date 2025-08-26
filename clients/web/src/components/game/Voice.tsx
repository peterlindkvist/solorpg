import { useCallback } from "react";
import { Section, Link, Story } from "../../types";
import { useReactMediaRecorder } from "react-media-recorder";
import * as api from "../../utils/api";

type Props = {
  useUserVoice: boolean;
  section?: Section;
  story?: Story;
  storyId?: string;
  setSection: (section: Section | undefined) => void;
  setIsRecording: (recording: boolean) => void;
};

let recordInterval: NodeJS.Timeout | undefined;

export function useVoice({
  useUserVoice,
  section,
  story,
  storyId,
  setSection,
  setIsRecording,
}: Props) {
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
  }, [startRecording, stopRecording, setIsRecording]);

  const analyseUserVoice = useCallback(
    async (blob: Blob) => {
      const ret = await api.speechToText(blob, {
        storyId: storyId ?? "",
      });
      const spokenText = ret.text.toLowerCase();
      const links: Link[] =
        (section?.parts.filter((p) => p.type === "link") as Link[]) ?? [];
      const found = links.find((c) => spokenText === c.text.toLowerCase());

      if (found) {
        setSection(story?.sections.find((c) => c.id === found.target));
      } else {
        recordUserVoice();
      }
    },
    [story, section, recordUserVoice, storyId, setSection]
  );

  const stopVoiceRecording = useCallback(() => {
    console.log("stopVoice");
    if (recordInterval) {
      clearTimeout(recordInterval);
    }
    stopRecording();
    setIsRecording(false);
  }, [stopRecording, setIsRecording]);

  // Return functions that the parent component can use
  return {
    recordUserVoice,
    stopVoiceRecording,
  };
}

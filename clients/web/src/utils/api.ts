import { Image } from "../types";

const apiPath = window.location.host.startsWith("localhost")
  ? "http://localhost:8080/api"
  : "/solorpg/api";

export function getStory(storyId: string, bookName: string): Promise<string> {
  return fetch(`${apiPath}/stories/${storyId}/${bookName}.md`).then((res) =>
    res.text()
  );
}

export async function fileUpload(
  file: File,
  storyId: string
): Promise<Image | undefined> {
  const formData = new FormData();
  formData.append("file", file);
  const queryString = new URLSearchParams({ storyId }).toString();

  const response = await fetch(`${apiPath}/images?${queryString}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("File upload failed");
  }

  const result = await response.json();
  console.log("File uploaded successfully:", result);
  return result;
}

export function textToText(query: {
  text: string;
  context?: string;
}): Promise<{ text: string }> {
  const queryString = new URLSearchParams(query).toString();

  return fetch(`${apiPath}/text?${queryString}`).then((res) => res.json());
}

export function textToImage(query: {
  storyId: string;
  description: string;
  context?: string;
}): Promise<Image> {
  const queryString = new URLSearchParams(query).toString();

  return fetch(`${apiPath}/images?${queryString}`).then((res) => res.json());
}

export function textToSpeech(query: {
  storyId: string;
  text: string;
  narrator: string;
}): Promise<{ url: string }> {
  const queryString = new URLSearchParams(query).toString();

  return fetch(`${apiPath}/speech?${queryString}`, { method: "POST" }).then(
    (res) => res.json()
  );
}

export function speechToText(
  audioBlob: Blob,
  query: {
    storyId: string;
  }
): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  const queryString = new URLSearchParams(query).toString();

  return fetch(`${apiPath}/text?${queryString}`, {
    method: "POST",
    body: formData,
  }).then((res) => res.json());
}

export function saveStory(
  storyId: string,
  bookName: string,
  text: string
): Promise<{ text: string }> {
  return fetch(`${apiPath}/stories/${storyId}/${bookName}.md`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  }).then((res) => res.json());
}

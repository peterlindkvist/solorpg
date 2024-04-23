export type Chapter = {
  id?: string;
  heading?: string;
  text?: string;
  voice?: string;
  // image?: Image;
  // choices: Array<{ text: string; target: string; key: string }>;
  state?: State;
  parts: Array<Part>;
};

export type Choice = {
  type: "choice";
  text: string;
  target: string;
  key: string;
  markdown: string;
};

export type Image = {
  type: "image";
  url?: string;
  markdown: string;
  text: string;
};

export type Paragraph = {
  type: "paragraph";
  text: string;
  markdown: string;
};

export type Code = {
  type: "code";
  condition: string;
  true?: Part;
  false?: Part;
  markdown: string;
};

export type Navigation = {
  type: "navigation";
  target: string;
};

export type Action = {
  type: "action";
  event: Record<string, string | number>;
  text?: string;
};

export type Part = Choice | Image | Paragraph | Code | Navigation | Action;
export type RenderPart = Image | Paragraph | Choice | Navigation;

export type State = {
  title?: string;
  author?: string;
  error?: string;
  theme?: Theme;
  voiceUrl?: string;
  assistant?: Assistant;
};

export type Assistant = {
  imageContext: string;
  textContext: string;
  narrator: Narrator;
};

export type Theme = {
  primaryColor: string;
  secondaryColor: string;
  testColor: string;
  backgroundColor: string;
};

export type Story = {
  id: string;
  title: string;
  markdown: string;
  chapters: Chapter[];
  images: Image[];
  state: State;
};

export type Page = "edit" | "game" | "chapters" | "images";
export type Narrator = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

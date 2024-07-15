export type Chapter = {
  id?: string;
  heading?: string;
  parts: Array<Part>;
  settings?: Settings;
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
  text: string;
};

export type Paragraph = {
  type: "paragraph";
  text: string;
};

export type Comment = {
  type: "comment";
  text: string;
};

export type Condition = {
  type: "condition";
  condition: string;
  text?: string;
  true?: Part[];
  false?: Part[];
  markdown?: string;
  error?: string;
};

export type Navigation = {
  type: "navigation";
  text: string;
  target: string;
};

export type Action = {
  type: "action";
  state: State;
  text?: string;
  markdown?: string;
  error?: string;
};

export type Part =
  | Choice
  | Image
  | Paragraph
  | Condition
  | Navigation
  | Action
  | Comment;
export type RenderPart = Image | Paragraph | Choice | Navigation;

export type Settings = {
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

export type State = Record<
  string,
  string | number | Record<string, string | number>
>;

export type Story = {
  id: string;
  title: string;
  markdown: string;
  chapters: Chapter[];
  images: Image[];
  state: State;
  settings: Settings;
};

export type Page = "edit" | "game" | "chapters" | "images";
export type Narrator = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Section = {
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
  description?: string;
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

export type Action<T = State> = {
  type: "action";
  state: T;
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
  sections: Section[];
  images: Image[];
  state: State;
  settings: Action<Settings & State>;
};

export type Page = "edit" | "game";
export type Narrator = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

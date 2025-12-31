import { describe, expect, test } from "@jest/globals";
import type { Action } from "../../types";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";

describe("markdownUtils Actions", () => {
  describe("parseMarkdown", () => {
    test("Error", () => {
      const codeMarker = "```";
      const markdown = `### Header\n${codeMarker}\n{faulty}}\n${codeMarker}`;
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "action",
              markdown: `{faulty}}\n`,
              state: {},
              error: "JSON5: invalid character '}' at 1:8",
            },
          ],
        },
      ]);
    });
    test("JSON", () => {
      const codeMarker = "```";
      const markdown = `### Header\n${codeMarker}\n{"test": 1}\n${codeMarker}`;
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "action",
              state: { test: 1 },
            },
          ],
        },
      ]);
    });
    test("JSON", () => {
      const codeMarker = "```";
      const markdown = `### Header\n${codeMarker}json\n{"test": 1}\n${codeMarker}`;
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "action",
              state: { test: 1 },
            },
          ],
        },
      ]);
    });
    test("JSON5", () => {
      const codeMarker = "```";
      const markdown = `### Header\n${codeMarker}\n{test: 1, // comment \n}\n${codeMarker}`;
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "action",
              state: { test: 1 },
            },
          ],
        },
      ]);
    });
    test("With dice", () => {
      const codeMarker = "```";
      const markdown = `### Header\n${codeMarker}\n {"rollVarableD10": "[{strength}d10]"\n}\n${codeMarker}`;
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "action",
              state: { rollVarableD10: "[{strength}d10]" },
            },
          ],
        },
      ]);
    });
  });
});

describe("partsToMarkdown", () => {
  test("simple", () => {
    const part: Action = {
      type: "action",
      state: { test: 1, test2: "A" },
    };

    const markdown = partsToMarkdown([part]);
    const toEqual =
      "```json\n" + JSON.stringify(part.state, undefined, 2) + "\n```\n\n";
    expect(markdown).toEqual(toEqual);
  });
});

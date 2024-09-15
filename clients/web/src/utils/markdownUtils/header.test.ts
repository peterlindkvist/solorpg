import { describe, expect, test } from "@jest/globals";
import { parseMarkdown } from "./markdownUtils";

describe("markdownUtils Header", () => {
  describe("parseMarkdown", () => {
    test("empty", () => {
      const markdown = "### Header";
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [],
        },
      ]);
    });
  });
});

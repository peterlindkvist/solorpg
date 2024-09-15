import { describe, expect, test } from "@jest/globals";
import { parseMarkdown } from "./markdownUtils";

describe("markdownUtils Introduction", () => {
  describe("parseMarkdown", () => {
    test("simple introduction", () => {
      const markdown = "# Header\n\n test\n\n ### Subheader";
      const story = parseMarkdown(markdown);
      expect(story.title).toEqual("Header");
      expect(story.description).toEqual([{ type: "paragraph", text: "test" }]);
      expect(story.sections).toEqual([
        {
          heading: "Subheader",
          id: "subheader",
          parts: [],
        },
      ]);
    });
    test("introduction with settings", () => {
      const markdown =
        '# Header\n\n test\n\n ```\n{\n"a": 2\n}\n``` \n\n ## Subheader';
      const story = parseMarkdown(markdown);
      expect(story.title).toEqual("Header");
      expect(story.description).toEqual([{ type: "paragraph", text: "test" }]);
      expect(story.settings).toEqual({ type: "action", state: { a: 2 } });
      expect(story.sections).toEqual([
        {
          heading: "Subheader",
          id: "subheader",
          parts: [
            {
              type: "header",
              text: "Subheader",
            },
          ],
        },
      ]);
    });
  });
});

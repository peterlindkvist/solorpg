import { describe, expect, test } from "@jest/globals";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";
import { Link } from "../../types";

describe("markdownUtils Links", () => {
  describe("parseMarkdown", () => {
    test("simple links", () => {
      const markdown = "### Header\n\n [text](#url)\n\n";
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "text",
              target: "#url",
              error: true,
            },
          ],
        },
      ]);
    });
    test("links with error", () => {
      const markdown = "### Header\n\n [text](#url)<!--- 🛇 --> \n\n";
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "text",
              target: "#url",
              error: true,
            },
          ],
        },
      ]);
    });
    test("link list", () => {
      const markdown = "### Header\n\n - [text](#url)\n- [text2](/url2)";
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "text",
              target: "#url",
              error: true,
            },
            {
              type: "link",
              text: "text2",
              target: "/url2",
            },
          ],
        },
      ]);
    });
    test("links close to text", () => {
      const markdown = "### Header\n\n [text](#url)\ntext2";
      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "text",
              target: "#url",
              error: true,
            },
            { type: "paragraph", text: "text2" },
          ],
        },
      ]);
    });
  });

  describe("Correct links", () => {
    test("All is fine", () => {
      // Do not support links or images in paragraph
      const markdown = `

### Header
        
- [Header 2](#header-3)
- [Header 3](#header-3)

### Header 2

text2

### Header 3

text3

### Header 4
`;

      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "Header 2",
              target: "#header-2",
            },
            {
              type: "link",
              text: "Header 3",
              target: "#header-3",
            },
          ],
        },
        {
          heading: "Header 2",
          id: "header-2",
          parts: [{ type: "paragraph", text: "text2" }],
        },
        {
          heading: "Header 3",
          id: "header-3",
          parts: [{ type: "paragraph", text: "text3" }],
        },
        {
          heading: "Header 4",
          id: "header-4",
          parts: [],
        },
      ]);
    });

    test("faulty links", () => {
      // Do not support links or images in paragraph
      const markdown = `

### Header
        
- [Header 2](#header-faulty-2)
- [Header missing 3](#header-missing-3)

### Header 2

text2

### Header 3

text3

### Header 4
`;

      const story = parseMarkdown(markdown);
      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "link",
              text: "Header 2",
              target: "#header-2",
            },
            {
              type: "link",
              text: "Header missing 3",
              target: "#header-missing-3",
              error: true,
            },
          ],
        },
        {
          heading: "Header 2",
          id: "header-2",
          parts: [{ type: "paragraph", text: "text2" }],
        },
        {
          heading: "Header 3",
          id: "header-3",
          parts: [{ type: "paragraph", text: "text3" }],
        },
        {
          heading: "Header 4",
          id: "header-4",
          parts: [],
        },
      ]);
    });
  });

  describe("partsToMarkdown", () => {
    test("simple link", () => {
      const part: Link = {
        type: "link",
        target: "#url",
        text: "text",
      };
      const toEqual = "- [text](#url)\n\n";
      const markdown = partsToMarkdown([part]);

      expect(markdown).toEqual(toEqual);
    });

    test("with error", () => {
      const part: Link = {
        type: "link",
        target: "#url",
        text: "text",
        error: true,
      };
      const toEqual = "- [text](#url)<!--- 🛇 -->\n\n";
      const markdown = partsToMarkdown([part]);

      expect(markdown).toEqual(toEqual);
    });

    test("link list", () => {
      const part: Link = {
        type: "link",
        target: "#url",
        text: "text",
      };
      const part2: Link = {
        type: "link",
        target: "#url2",
        text: "text2",
      };
      const toEqual = "- [text](#url)\n- [text2](#url2)\n\n";
      const markdown = partsToMarkdown([part, part2]);

      expect(markdown).toEqual(toEqual);
    });
  });
});

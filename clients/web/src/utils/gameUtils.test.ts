import { describe, expect, test } from "@jest/globals";
import type {
  Action,
  Condition,
  Header,
  Link,
  Navigation,
  Paragraph,
  Story,
} from "../types";
import {
  evaluateAction,
  evaluateCondition,
  flatState,
  parseNextSection,
  replaceWithState,
} from "./gameUtils";

describe("gameUtils", () => {
  describe("replaceWithState", () => {
    test("replaceWithState", () => {
      expect(replaceWithState("text", {})).toBe("text");
      expect(
        replaceWithState("{strength} d6", { strength: 4, agility: 3 })
      ).toBe("4 d6");
      expect(replaceWithState("{a} + {a} + {b}", { a: 2, b: 3 })).toBe(
        "2 + 2 + 3"
      );
    });
  });
  describe("evaluateCondition", () => {
    test("with dice", () => {
      const condition: Condition = {
        type: "condition",
        condition: "4+[d1] < 4",
        true: [],
        false: [],
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {});
      expect(renderPart.text).toEqual("4+[d1] < 4 -> 4+1<4 -> false");
      expect(isTrue).toBe(false);
    });
    test("with dice in variable", () => {
      const condition: Condition = {
        type: "condition",
        condition: "4+[{damage}] < 4",
        true: [],
        false: [],
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        damage: "d1",
      });
      expect(renderPart.text).toEqual("4+[{damage}] < 4 -> 4+1<4 -> false");
      expect(isTrue).toBe(false);
    });
    test("with variable", () => {
      const condition: Condition = {
        type: "condition",
        condition: "{strength} >= 12",
        true: [],
        false: [],
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        strength: 14,
      });
      expect(renderPart.text).toEqual("{strength} >= 12 -> 14>=12 -> true");
      expect(isTrue).toBe(true);
    });
    test("with variable and dice", () => {
      const condition: Condition = {
        type: "condition",
        condition: "{strength} <= [2d1+20]",
        true: [],
        false: [],
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        strength: 14,
      });
      expect(renderPart.text).toEqual(
        "{strength} <= [2d1+20] -> 14<=22 -> true"
      );
      expect(isTrue).toBe(true);
    });
    test("with && in condition", () => {
      const condition: Condition = {
        type: "condition",
        condition: "{strength} >= 12 && {agility} <= 10",
        true: [],
        false: [],
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        strength: 14,
        agility: 9,
      });
      expect(renderPart.text).toEqual(
        "{strength} >= 12 && {agility} <= 10 -> 14>=12 and 9<=10 -> true"
      );
      expect(isTrue).toBe(true);
    });
  });
  describe("evaluateAction", () => {
    test("simple set action", () => {
      const action: Action = {
        type: "action",
        state: {
          rope: 1,
        },
      };
      const { state, renderPart } = evaluateAction(action, {});
      expect(state).toEqual({ rope: 1 });
      expect(renderPart.text).toEqual("rope: 1");
    });

    test("simple increase action", () => {
      const action: Action = {
        type: "action",
        state: {
          rope: "+=2",
        },
      };
      const { state, renderPart } = evaluateAction(action, { rope: 1 });
      expect(state).toEqual({ rope: 3 });
      expect(renderPart.text).toEqual("rope: 1 -> 3");
    });

    test("simple increase action from string", () => {
      const action: Action = {
        type: "action",
        state: {
          rope: "+=2",
        },
      };
      const { state, renderPart } = evaluateAction(action, { rope: "1" });
      expect(state).toEqual({ rope: 3 });
      expect(renderPart.text).toEqual("rope: 1 -> 3");
    });

    test("simple decrease action", () => {
      const action: Action = {
        type: "action",
        state: {
          rope: "-=3",
        },
      };
      const { state, renderPart } = evaluateAction(action, { rope: 6 });
      expect(state).toEqual({ rope: 3 });
      expect(renderPart.text).toEqual("rope: 6 -> 3");
    });

    test("multiple states action", () => {
      const action: Action = {
        type: "action",
        state: {
          pancakes: "+=1",
          egg: "-=1",
          milk: "-=1",
        },
      };
      const { state, renderPart } = evaluateAction(action, { egg: 3, milk: 1 });
      expect(state).toEqual({ pancakes: 1, egg: 2, milk: 0 });
      expect(renderPart.text).toEqual("pancakes: 1, egg: 3 -> 2, milk: 1 -> 0");
    });

    test("action with dice adn variable", () => {
      const action: Action = {
        type: "action",
        state: { rollVarableD1: "[{strength}d1]" },
      };
      const { state, renderPart } = evaluateAction(action, { strength: 1 });
      expect(state).toEqual({ rollVarableD1: 1, strength: 1 });
      expect(renderPart.text).toEqual("rollVarableD1: [1]-> 1");
    });

    test("evaluate calculation states", () => {
      const action: Action = {
        type: "action",
        state: {
          cupper: "{gold} * 100 + {silver} * 10 + {cupper}",
          gold: 0,
          silver: 0,
        },
      };
      const { state, renderPart } = evaluateAction(action, {
        gold: 3,
        silver: 14,
        cupper: 4,
      });
      expect(state).toEqual({ cupper: 444, gold: 0, silver: 0 });
      expect(renderPart.text).toEqual(
        "cupper: 4 -> 444, gold: 3 -> 0, silver: 14 -> 0"
      );
    });

    test("evaluate with dices", () => {
      const action: Action = {
        type: "action",
        state: {
          rolld6: "[d1]",
        },
      };
      const { state, renderPart } = evaluateAction(action, {});

      expect(state.rolld6).toBe(1);
      expect(renderPart.text).toEqual("rolld6: [1]-> 1");
    });

    test("evaluate with dices in variable", () => {
      const action: Action = {
        type: "action",
        state: {
          rolld6: "[{damage}]+1",
        },
      };
      const { state, renderPart } = evaluateAction(action, { damage: "d1" });

      expect(state.rolld6).toBe(2);
      expect(renderPart.text).toEqual("rolld6: [1]-> 2");
    });

    test("evaluate with object table", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.2}",
        },
      };
      const flattenState = flatState({
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("banana");
      expect(renderPart.text).toEqual("fruit: banana");
    });

    test("evaluate with object table and dice", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.[d1]}",
        },
      };
      const flattenState = flatState({
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("apple");
      expect(renderPart.text).toEqual("fruit: [1]-> apple");
    });

    test("evaluate with object table and variable", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.{rolld6}}",
        },
      };
      const flattenState = flatState({
        rolld6: "[d1]",
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("apple");
      expect(renderPart.text).toEqual("fruit: [1]-> apple");
    });
  });

  describe("parseNextSection", () => {
    test("should parse section with no navigation links", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "paragraph", text: "This is a paragraph." } as Paragraph,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {});

      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toEqual({
        type: "paragraph",
        text: "This is a paragraph.",
      });
      expect(result.newState).toEqual({});
    });

    test("should parse section with multiple navigation links (no recursion)", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "paragraph", text: "Choose your path:" } as Paragraph,
              {
                type: "navigation",
                text: "Go left",
                target: "left",
              } as Navigation,
              {
                type: "navigation",
                text: "Go right",
                target: "right",
              } as Navigation,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {});

      expect(result.parts).toHaveLength(3);
      expect(result.parts[0]).toEqual({
        type: "paragraph",
        text: "Choose your path:",
      });
      expect(result.parts[1]).toEqual({
        type: "navigation",
        text: "Go left",
        target: "left",
      });
      expect(result.parts[2]).toEqual({
        type: "navigation",
        text: "Go right",
        target: "right",
      });
    });

    test("should recursively follow single navigation link and merge parts", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "paragraph", text: "First paragraph." } as Paragraph,
              {
                type: "navigation",
                text: "Continue",
                target: "section2",
              } as Navigation,
            ],
          },
          {
            id: "section2",
            parts: [
              { type: "paragraph", text: "Second paragraph." } as Paragraph,
              {
                type: "navigation",
                text: "Next",
                target: "section3",
              } as Navigation,
            ],
          },
          {
            id: "section3",
            parts: [
              { type: "paragraph", text: "Third paragraph." } as Paragraph,
              {
                type: "navigation",
                text: "Choice A",
                target: "choiceA",
              } as Navigation,
              {
                type: "navigation",
                text: "Choice B",
                target: "choiceB",
              } as Navigation,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {});

      expect(result.parts).toHaveLength(5);
      expect(result.parts[0]).toEqual({
        type: "paragraph",
        text: "First paragraph.",
      });
      expect(result.parts[1]).toEqual({
        type: "paragraph",
        text: "Second paragraph.",
      });
      expect(result.parts[2]).toEqual({
        type: "paragraph",
        text: "Third paragraph.",
      });
      expect(result.parts[3]).toEqual({
        type: "navigation",
        text: "Choice A",
        target: "choiceA",
      });
      expect(result.parts[4]).toEqual({
        type: "navigation",
        text: "Choice B",
        target: "choiceB",
      });
    });

    test("should handle state changes during recursive parsing", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "paragraph", text: "Starting section." } as Paragraph,
              { type: "action", state: { coins: 10 } } as Action,
              {
                type: "navigation",
                text: "Continue",
                target: "section2",
              } as Navigation,
            ],
          },
          {
            id: "section2",
            parts: [
              {
                type: "paragraph",
                text: "Middle section. You have {coins} coins.",
              } as Paragraph,
              { type: "action", state: { coins: "+=5" } } as Action,
              {
                type: "navigation",
                text: "Continue",
                target: "section3",
              } as Navigation,
            ],
          },
          {
            id: "section3",
            parts: [
              {
                type: "paragraph",
                text: "Final section. You now have {coins} coins.",
              } as Paragraph,
              { type: "navigation", text: "End", target: "end" } as Navigation,
              {
                type: "navigation",
                text: "Restart",
                target: "section1",
              } as Navigation,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {});

      expect(result.newState).toEqual({ coins: 15 });
      expect(result.parts).toHaveLength(7);

      // Check that state variables were properly replaced
      const middleParagraph = result.parts.find(
        (p) =>
          p.type === "paragraph" && (p as Paragraph).text?.includes("You have")
      ) as Paragraph;
      expect(middleParagraph.text).toBe("Middle section. You have 10 coins.");

      const finalParagraph = result.parts.find(
        (p) =>
          p.type === "paragraph" &&
          (p as Paragraph).text?.includes("You now have")
      ) as Paragraph;
      expect(finalParagraph.text).toBe("Final section. You now have 15 coins.");
    });

    test("should respect maxDepth parameter to prevent infinite loops", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "paragraph", text: "Section 1" } as Paragraph,
              {
                type: "navigation",
                text: "Continue",
                target: "section2",
              } as Navigation,
            ],
          },
          {
            id: "section2",
            parts: [
              { type: "paragraph", text: "Section 2" } as Paragraph,
              {
                type: "navigation",
                text: "Continue",
                target: "section1",
              } as Navigation,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {}, {}, 3);

      // Should stop at maxDepth and include accumulated parts
      expect(result.parts.length).toBeGreaterThan(0);
      expect(result.parts.length).toBeLessThanOrEqual(6); // 3 iterations * 2 parts max

      // Should include parts from multiple sections
      const paragraphs = result.parts.filter(
        (p) => p.type === "paragraph"
      ) as Paragraph[];
      expect(paragraphs.length).toBeGreaterThan(1);
    });

    test("should handle non-existent section", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "nonexistent", {});

      expect(result.parts).toHaveLength(0);
      expect(result.newState).toEqual({});
      expect(result.section).toBeUndefined();
    });

    test("should handle empty section with single navigation", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "empty",
            parts: [
              {
                type: "navigation",
                text: "Skip",
                target: "content",
              } as Navigation,
            ],
          },
          {
            id: "content",
            parts: [
              { type: "paragraph", text: "Actual content." } as Paragraph,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "empty", {});

      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toEqual({
        type: "paragraph",
        text: "Actual content.",
      });
    });

    test("should recursively follow single link and merge parts", () => {
      const story: Story = {
        title: "Test Story",
        markdown: "",
        sections: [
          {
            id: "section1",
            parts: [
              { type: "header", text: "Höger 2" } as Header,
              {
                type: "link",
                text: "tillbaka till gläntan",
                target: "section2",
              } as Link,
            ],
          },
          {
            id: "section2",
            parts: [
              { type: "paragraph", text: "Back to the clearing." } as Paragraph,
              { type: "link", text: "Choice A", target: "choiceA" } as Link,
              { type: "link", text: "Choice B", target: "choiceB" } as Link,
            ],
          },
        ],
        images: [],
        state: {},
        settings: { type: "action", state: {} },
      };

      const result = parseNextSection(story, "section1", {});

      expect(result.parts).toHaveLength(4);
      expect(result.parts[0]).toEqual({
        type: "header",
        text: "Höger 2",
      });
      expect(result.parts[1]).toEqual({
        type: "paragraph",
        text: "Back to the clearing.",
      });
      expect(result.parts[2]).toEqual({
        type: "link",
        text: "Choice A",
        target: "choiceA",
      });
      expect(result.parts[3]).toEqual({
        type: "link",
        text: "Choice B",
        target: "choiceB",
      });
    });
  });
});

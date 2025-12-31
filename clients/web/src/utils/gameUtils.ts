import { DiceRoll } from "@dice-roller/rpg-dice-roller";
import { Parser } from "expr-eval";
import { flatten, unflatten } from "safe-flat";
import type {
  Action,
  Condition,
  Link,
  Navigation,
  Part,
  Section,
  Settings,
  State,
  Story,
} from "../types";

type FlattenState = Record<string, string | number>;

export function parseNextSection(
  story: Story,
  sectionId: string,
  state: State,
  settings: Settings = {},
  maxDepth = 10
): {
  section?: Section;
  parts: Part[];
  newState: State;
  narratorText: string;
} {
  return parseNextSectionRecursive(story, sectionId, state, settings, maxDepth);
}

function parseNextSectionRecursive(
  story: Story,
  sectionId: string,
  state: State,
  settings: Settings,
  remainingDepth: number
): {
  section?: Section;
  parts: Part[];
  newState: State;
  narratorText: string;
} {
  if (remainingDepth <= 0) {
    return {
      parts: [],
      newState: state,
      narratorText: getNarratorText([]),
    };
  }

  const section = story.sections.find((s) => s.id === sectionId);

  if (!section) {
    return {
      parts: [],
      newState: state,
      narratorText: getNarratorText([]),
    };
  }

  const { parts, newState } = parseSection(section, state, settings);

  // Check if there's exactly one navigation link (including both navigation and link types)
  const navigationLinks = parts.filter(
    (p) => p.type === "navigation" || p.type === "link"
  ) as (Navigation | Link)[];

  if (navigationLinks.length === 1) {
    // Follow the single link recursively
    const nextSectionId = navigationLinks[0].target.replace("#", "");
    const followed = parseNextSectionRecursive(
      story,
      nextSectionId,
      newState,
      settings,
      remainingDepth - 1
    );

    // Merge current parts with accumulated parts
    // If there's exactly one navigation link, exclude it from merged parts since it will be followed
    const mergedParts = [
      ...parts.filter((p) =>
        navigationLinks.length === 1
          ? p.type !== "navigation" && p.type !== "link"
          : true
      ),
      ...followed.parts,
    ];

    return {
      section,
      parts: mergedParts,
      newState: followed.newState,
      narratorText: getNarratorText(mergedParts),
    };
  }

  // If there are 0 or multiple navigation links, return current result
  return {
    section,
    parts,
    newState,
    narratorText: getNarratorText(parts),
  };
}

export function parseSection(
  section: Section,
  state: State,
  settings: Settings = {}
): {
  parts: Part[];
  newState: State;
  narratorText: string;
} {
  let flatStateSettings = { ...flatState(settings), ...flatState(state) };
  const renderParts = [];
  for (const part of section.parts) {
    if (["header"].includes(part.type)) {
      renderParts.push(part);
    } else if (["image", "link"].includes(part.type)) {
      renderParts.push(part);
    } else if (["paragraph"].includes(part.type)) {
      const withState = replaceWithState(part.text ?? "", flatStateSettings);
      renderParts.push({ ...part, text: withState });
    } else if (part.type === "navigation") {
      renderParts.push(part);
    } else if (part.type === "condition") {
      const result = evaluateCondition(part, flatStateSettings);
      const codeParts = result.isTrue ? part.true : part.false;

      renderParts.push(result.renderPart);

      for (const codePart of codeParts ?? []) {
        if (codePart.type === "paragraph") {
          const withState = replaceWithState(codePart.text, flatStateSettings);
          renderParts.push({ ...codePart, text: withState });
        } else if (codePart.type === "navigation") {
          renderParts.push(codePart);
        } else if (["image", "link"].includes(codePart.type)) {
          renderParts.push(codePart);
        } else if (codePart.type === "action") {
          const { state, renderPart } = evaluateAction(
            codePart,
            flatStateSettings
          );
          flatStateSettings = state;
          renderParts.push(renderPart);
        }
      }
    } else if (part.type === "action") {
      const { state, renderPart } = evaluateAction(part, flatStateSettings);
      flatStateSettings = state;
      renderParts.push(renderPart);
    }
  }

  const newState = omit(unFlatState(flatStateSettings), Object.keys(settings));

  return {
    parts: renderParts,
    newState,
    narratorText: getNarratorText(renderParts),
  };
}

export function getNarratorText(parts: Part[]): string {
  return parts
    .map((part) => {
      if (part.type === "paragraph") {
        return part.text;
        // } else if (part.type === "action") {
        //   return part.text;
        // } else if (part.type === "condition") {
        //   return part.text;
      }
      return "";
    })
    .join(" ");
}

export function evaluateAction(
  action: Action,
  flattenState: FlattenState
): { renderPart: Action; state: FlattenState } {
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.state).map((key) => [key, 0])),
    ...flattenState,
  };
  const texts: string[] = [];
  const actionFlatState = flatState(action.state);

  const newValues = Object.fromEntries(
    Object.entries(actionFlatState).map(([key, value]) => {
      const oldValue = flattenState[key];
      const { value: newValue, rolls } = evaluateActionValue(
        key,
        value,
        withMissingKeys
      );
      if (oldValue !== newValue) {
        if (oldValue === undefined) {
          const arrow = rolls ? `${rolls}-> ` : "";
          const text = `${arrow}${newValue}`;
          texts.push(`${key}: ${text}`);
        } else {
          const arrow = rolls ? `-${rolls}->` : "->";
          const text = `${oldValue} ${arrow} ${newValue}`;
          texts.push(`${key}: ${text}`);
        }
      }
      return [key, newValue];
    })
  );
  return {
    renderPart: { ...action, text: texts.join(", ") },
    state: { ...flattenState, ...newValues },
  };
}

export function evaluateCondition(
  condition: Condition,
  state: FlattenState
): { isTrue: boolean; renderPart: Condition } {
  const withState = replaceWithState(condition.condition, state);
  const noSpace = withState.replaceAll(" ", "");
  const evalLogic = noSpace.replaceAll("&&", " and ").replaceAll("||", " or ");
  const withRolledDices = rollDices(evalLogic);
  const newValue = evaluateValue(withRolledDices.value);
  const text = `${condition.condition} -> ${withRolledDices.value} -> ${newValue}`;

  // console.log("evaluateCondition", {
  //   withState,
  //   noSpace,
  //   evalLogic,
  //   withRolledDices,
  //   newValue,
  //   state,
  // });

  return {
    isTrue: !!newValue,
    renderPart: { ...condition, text },
  };
}

function evaluateActionValue(
  key: string,
  value: string | number,
  state: FlattenState
): { value: string | number; rolls?: string } {
  const oldValue = state[key] ?? 0;
  const withoutPrefix = replacePrefix(key, value);
  const withState = replaceWithState(withoutPrefix, state);
  const noSpace = withState.replaceAll(" ", "");
  const withRolledDices = rollDices(noSpace);
  const newValue = evaluateValue(withRolledDices.value) ?? oldValue;
  const withState2 = replaceWithState(`${newValue}`, state);
  const correctType = toNumberForNumbers(withState2);

  // console.log("evaluateActionValue", {
  //   oldValue,
  //   withoutPrefix,
  //   withState,
  //   noSpace,
  //   withRolledDices,
  //   newValue,
  //   correctType,
  //   state,
  // });
  return {
    value: correctType,
    ...(withRolledDices ? { rolls: withRolledDices.rolls } : {}),
  };
}

function toNumberForNumbers(value: string): string | number {
  if (value === Number.parseFloat(value).toString()) {
    return Number.parseFloat(value);
  }
  return value;
}

function replacePrefix(key: string, value: string | number): string {
  if (typeof value === "number") {
    return value.toString();
  }
  if (value.startsWith("+=")) {
    return `{${key}} + ${value.slice(2)}`;
  }
  if (value.startsWith("-=")) {
    return `{${key}} - (${value.slice(2)})`;
  }
  return value;
}

export function replaceWithState(text: string, state: FlattenState): string {
  let ret = text;
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) {
      ret = ret.replaceAll(`{${key}}`, value.toString());
    }
  }
  return ret;
}

function rollDices(value: string): { value: string; rolls?: string } {
  const diceMatches = Array.from(value.matchAll(/\[([^\]]*)\]/g));

  if (diceMatches.length === 0) {
    return { value };
  }
  let result = value;
  let allRolls = "";

  // Process matches in reverse order to preserve indices
  for (let i = diceMatches.length - 1; i >= 0; i--) {
    const match = diceMatches[i];
    try {
      const roll = new DiceRoll(match[1]);
      const startIndex = match.index ?? 0;
      const endIndex = startIndex + match[0].length;

      result =
        result.substring(0, startIndex) +
        roll.total.toString() +
        result.substring(endIndex);
      allRolls = roll.rolls.toString() + allRolls;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error("unknown error");
      return {
        value,
        rolls: error.message,
      };
    }
  }

  return {
    value: result,
    rolls: allRolls,
  };
}

export function updateState(action: Action, state: State): State {
  const flattenState = flatten(state) as FlattenState;

  const newValues: FlattenState = Object.fromEntries(
    Object.entries(action.state).map(([key, value]) => {
      if (typeof value === "number" || typeof value === "string") {
        const newValue = evaluateValue(value);
        return [key, newValue];
      }
      return [key, value];
    })
  );
  return unFlatState({ ...flattenState, ...newValues });
}

function evaluateValue(value: string | number): string | number | undefined {
  if (!value) return;
  try {
    const parser = Parser.parse(value.toString());
    const variables = parser.variables();

    if (variables.length === 0) {
      return parser.evaluate();
    }
    return value;
  } catch (e) {
    return value;
  }
}

export function buildStateQuery(state?: State): string {
  if (!state) return "";
  return `state=${btoa(JSON.stringify(state))}`;
}

export function parseStateQueryValue(query?: string): State {
  if (!query) return {};
  return JSON.parse(atob(query));
}

export function flatState(state: State): FlattenState {
  return flatten(state) as FlattenState;
}

export function unFlatState(state: Partial<FlattenState>): State {
  return unflatten(state) as State;
}

export function mergeStates(state?: State, newState?: State): State {
  const flattenState = {
    ...flatState(state ?? {}),
    ...flatState(newState ?? {}),
  };
  return unFlatState(flattenState);
}

function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  props: Array<keyof T>
): Omit<T, K> {
  return Object.entries(obj).reduce(
    (acc: Omit<T, K>, [key, value]: [string, unknown]) => {
      if (!props.includes(key as keyof T)) {
        acc[key as keyof Omit<T, K>] = value as Omit<T, K>[keyof Omit<T, K>];
      }
      return acc;
    },
    {} as Omit<T, K>
  );
}

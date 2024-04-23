import { flatten, unflatten } from "safe-flat";
import { Parser } from "expr-eval";
import { Action, Chapter, Part, State } from "../../types";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

type FlattenState = Record<string, string | number>;

export function parseChapter(
  chapter: Chapter,
  state: State
): {
  parts: Part[];
  newState: State;
} {
  let newState: FlattenState = flatten(state) as FlattenState;
  const renderParts = [];
  console.log("parseChapter", chapter, newState);
  for (const part of chapter.parts) {
    if (["image", "paragraph", "choice"].includes(part.type)) {
      renderParts.push(part);
    } else if (part.type === "navigation") {
      renderParts.push(part);
      break;
    } else if (part.type === "code") {
      const parser = Parser.parse(part.condition);
      const result = parser.evaluate(newState);
      const codePart = result ? part.true : part.false;
      if (!codePart) {
        continue;
      } else if (codePart.type === "paragraph") {
        renderParts.push(codePart);
      } else if (codePart.type === "navigation") {
        renderParts.push(codePart);
        break;
      } else if (codePart.type === "action") {
        const { state, renderPart } = evaluateAction(codePart, newState);
        newState = state;
        renderParts.push(renderPart);
      }
    } else if (part.type === "action") {
      const { state, renderPart } = evaluateAction(part, newState);
      console.log("action", state, renderPart);
      newState = state;
      renderParts.push(renderPart);
    }
  }

  return { parts: renderParts, newState: unflatten(newState) as State };
}

export function evaluateAction(
  action: Action,
  flattenState: FlattenState
): { renderPart: Action; state: FlattenState } {
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.event).map((key) => [key, 0])),
    ...flattenState,
  };
  withMissingKeys;
  const texts: string[] = [];

  const newValues = Object.fromEntries(
    Object.entries(action.event).map(([key, value]) => {
      const oldValue = flattenState[key] ?? 0;
      const { value: newValue, rolls } = evaluateActionValue(
        key,
        value,
        withMissingKeys
      );
      const arrow = rolls ? `-${rolls}->` : "->";
      texts.push(`${key}: ${oldValue} ${arrow} ${newValue}`);
      return [key, newValue];
    })
  );
  return {
    renderPart: { ...action, text: texts.join(", ") },
    state: { ...flattenState, ...newValues },
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
  // console.log("evaluateActionValue", {
  //   oldValue,
  //   value,
  //   withoutPrefix,
  //   withRolledDices,
  //   withState,
  //   noSpace,
  // });
  const newValue = evaluateValue(withRolledDices.value) ?? oldValue;
  return {
    value: newValue,
    ...(withRolledDices ? { rolls: withRolledDices.rolls } : {}),
  };
}

function replacePrefix(key: string, value: string | number): string {
  if (typeof value === "number") {
    return value.toString();
  } else {
    if (value.startsWith("+=")) {
      return `${key} + ${value.slice(2)}`;
    }
    if (value.startsWith("-=")) {
      return `${key} - (${value.slice(2)})`;
    }
    return value;
  }
}

export function replaceWithState(text: string, state: FlattenState): string {
  let ret = text;
  for (const [key, value] of Object.entries(state)) {
    ret = ret.replaceAll(key, value.toString());
  }
  return ret;
}

function rollDices(value: string): { value: string; rolls?: string } {
  const diceMatches = Array.from(value.matchAll(/\[(.*)\]/g));
  if (diceMatches.length === 0) {
    return { value };
  }
  const ret = { value: "", rolls: "" };
  for (const match of diceMatches) {
    const roll = new DiceRoll(match[1]);
    return {
      value: ret.value + roll.total.toString(),
      rolls: ret.rolls + roll.rolls.toString(),
    };
  }
  return ret;
}

export function updateState(action: Action, state: State): State {
  const flattenState: Record<string, string | number> = flatten(
    state
  ) as FlattenState;
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.event).map((key) => [key, 0])),
    ...flattenState,
  };

  console.log("updateState", action, flattenState, withMissingKeys);
  const newValues = Object.fromEntries(
    Object.entries(action.event).map(([key, value]) => {
      const newValue = evaluateValue(value);
      return [key, newValue];
    })
  );
  return unflatten({ ...flattenState, ...newValues }) as State;
}

function evaluateValue(value: string | number): number | undefined {
  const parser = Parser.parse(value.toString());
  return parser.evaluate();
}

import { flatten, unflatten } from "safe-flat";
import { Parser } from "expr-eval";
import { Action, Section, Condition, Part, State, Settings } from "../types";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

type FlattenState = Record<string, string | number>;

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
    if (["image", "choice"].includes(part.type)) {
      renderParts.push(part);
    } else if (["paragraph"].includes(part.type)) {
      const withState = replaceWithState(part.text ?? "", flatStateSettings);
      renderParts.push({ ...part, text: withState });
    } else if (part.type === "navigation") {
      renderParts.push(part);
      break;
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
          break;
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
      } else {
        return "";
      }
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
  withMissingKeys;
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
  const withRolledDices = rollDices(noSpace);
  const newValue = evaluateValue(withRolledDices.value);
  const text = `${condition.condition} -> ${withRolledDices.value} -> ${newValue}`;
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

  // console.log("evaluateActionValue", {
  //   oldValue,
  //   withoutPrefix,
  //   withState,
  //   noSpace,
  //   withRolledDices,
  //   newValue,
  // });
  return {
    value: withState2,
    ...(withRolledDices ? { rolls: withRolledDices.rolls } : {}),
  };
}

function replacePrefix(key: string, value: string | number): string {
  if (typeof value === "number") {
    return value.toString();
  } else {
    if (value.startsWith("+=")) {
      return `{${key}} + ${value.slice(2)}`;
    }
    if (value.startsWith("-=")) {
      return `{${key}} - (${value.slice(2)})`;
    }
    return value;
  }
}

export function replaceWithState(text: string, state: FlattenState): string {
  let ret = text;
  for (const [key, value] of Object.entries(state)) {
    if (value ?? false) {
      ret = ret.replaceAll(`{${key}}`, value.toString());
    }
  }
  return ret;
}

function rollDices(value: string): { value: string; rolls?: string } {
  const diceMatches = Array.from(value.matchAll(/\[(.*)\]/g));
  if (diceMatches.length === 0) {
    return { value };
  }
  const ret = { value, rolls: "" };
  for (const match of diceMatches) {
    const roll = new DiceRoll(match[1]);
    const endStart = (match.index ?? 0) + match[1].length + 2;

    return {
      value:
        ret.value.substring(0, match.index) +
        roll.total.toString() +
        ret.value.substring(endStart),
      rolls: ret.rolls + roll.rolls.toString(),
    };
  }
  return ret;
}

export function updateState(action: Action, state: State): State {
  const flattenState = flatten(state) as FlattenState;

  const newValues: FlattenState = Object.fromEntries(
    Object.entries(action.state).map(([key, value]) => {
      if (typeof value === "number" || typeof value === "string") {
        const newValue = evaluateValue(value);
        return [key, newValue];
      } else {
        return [key, value];
      }
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
      return props.includes(key as keyof T)
        ? acc
        : {
            ...acc,
            [key]: value,
          };
    },
    {} as Omit<T, K>
  );
}

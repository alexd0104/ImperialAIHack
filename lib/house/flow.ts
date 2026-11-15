import type { BundleStory, HouseBundle } from "@/lib/contracts";

// House flow (AGENTS.md §3 rule 6b): Choose a room → Room → Object opens (polaroids) →
// Memory → Heart → next Memory … → back to the Room. Pure so every transition is tested;
// the components only dispatch.

export type FlowState =
  | { screen: "rooms" }
  | { screen: "room"; roomId: string }
  | { screen: "open"; roomId: string; slotId: string }
  | { screen: "memory"; roomId: string; slotId: string; index: number }
  | { screen: "heart"; roomId: string; slotId: string; index: number };

export type FlowAction =
  | { type: "chooseRoom"; roomId: string }
  | { type: "showRooms" }
  | { type: "openObject"; slotId: string }
  | { type: "closeObject" }
  | { type: "playMemory"; index: number }
  | { type: "memoryEnded" }
  | { type: "next" }
  | { type: "back" }
  | { type: "returnToRoom" };

export const initialFlow: FlowState = { screen: "rooms" };

export function findStory(bundle: HouseBundle, roomId: string, slotId: string): BundleStory | null {
  const room = bundle.rooms.find((r) => r.id === roomId);
  return room?.slots.find((s) => s.id === slotId)?.story ?? null;
}

function playable(story: BundleStory | null): story is BundleStory {
  return Boolean(story?.available && story.memories.length > 0);
}

export function reduceFlow(state: FlowState, action: FlowAction, bundle: HouseBundle): FlowState {
  switch (action.type) {
    case "chooseRoom":
      return bundle.rooms.some((r) => r.id === action.roomId)
        ? { screen: "room", roomId: action.roomId }
        : state;
    case "showRooms":
      return state.screen === "room" ? { screen: "rooms" } : state;
    case "openObject":
      // Empty Slots and unavailable Objects (alone mode) ignore taps (H8).
      if (state.screen !== "room") return state;
      return playable(findStory(bundle, state.roomId, action.slotId))
        ? { screen: "open", roomId: state.roomId, slotId: action.slotId }
        : state;
    case "closeObject":
      return state.screen === "open" ? { screen: "room", roomId: state.roomId } : state;
    case "playMemory": {
      if (state.screen !== "open" && state.screen !== "heart") return state;
      const story = findStory(bundle, state.roomId, state.slotId);
      if (!story || action.index < 0 || action.index >= story.memories.length) return state;
      return {
        screen: "memory",
        roomId: state.roomId,
        slotId: state.slotId,
        index: action.index,
      };
    }
    case "memoryEnded":
      return state.screen === "memory" ? { ...state, screen: "heart" } : state;
    case "next": {
      if (state.screen !== "heart") return state;
      const count = findStory(bundle, state.roomId, state.slotId)?.memories.length ?? 0;
      return state.index + 1 < count
        ? { ...state, screen: "memory", index: state.index + 1 }
        : { screen: "room", roomId: state.roomId };
    }
    case "back":
      return state.screen === "memory" ? { ...state, index: Math.max(0, state.index - 1) } : state;
    case "returnToRoom":
      return state.screen === "memory" || state.screen === "heart"
        ? { screen: "room", roomId: state.roomId }
        : state;
  }
}

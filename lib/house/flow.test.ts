import { describe, expect, it } from "vitest";
import { type HouseBundle, HouseBundle as HouseBundleSchema } from "@/lib/contracts";
import fixture from "@/lib/contracts/__fixtures__/house-bundle.json";
import { type FlowAction, type FlowState, initialFlow, reduceFlow } from "./flow";

const base = HouseBundleSchema.parse(fixture);
const roomId = base.rooms[0]?.id ?? "";
const firstMemory = base.rooms[0]?.slots[0]?.story?.memories[0];
if (!firstMemory) throw new Error("fixture needs a Memory");

// Two Memories on the bench so "next" has somewhere to go.
const bundle: HouseBundle = structuredClone(base);
bundle.rooms[0]?.slots[0]?.story?.memories.push({ ...firstMemory, id: "second" });

function run(actions: FlowAction[], b: HouseBundle = bundle, from: FlowState = initialFlow) {
  return actions.reduce((state, action) => reduceFlow(state, action, b), from);
}

describe("reduceFlow", () => {
  it("walks the whole Story and returns to the Room", () => {
    const states: FlowState[] = [];
    let state = initialFlow;
    for (const action of [
      { type: "chooseRoom", roomId },
      { type: "openObject", slotId: "bench" },
      { type: "playMemory", index: 0 },
      { type: "memoryEnded" },
      { type: "next" },
      { type: "memoryEnded" },
      { type: "next" },
    ] satisfies FlowAction[]) {
      state = reduceFlow(state, action, bundle);
      states.push(state);
    }
    expect(states.map((s) => s.screen)).toEqual([
      "room",
      "open",
      "memory",
      "heart",
      "memory",
      "heart",
      "room",
    ]);
    expect(states[4]).toMatchObject({ index: 1 });
  });

  it("ignores taps on empty Slots and unknown rooms", () => {
    expect(run([{ type: "chooseRoom", roomId: "nope" }])).toEqual(initialFlow);
    expect(
      run([
        { type: "chooseRoom", roomId },
        { type: "openObject", slotId: "tree" },
      ]),
    ).toEqual({
      screen: "room",
      roomId,
    });
  });

  it("ignores taps on unavailable Objects (alone mode)", () => {
    const alone: HouseBundle = structuredClone(bundle);
    const story = alone.rooms[0]?.slots[0]?.story;
    if (story) story.available = false;
    expect(
      run(
        [
          { type: "chooseRoom", roomId },
          { type: "openObject", slotId: "bench" },
        ],
        alone,
      ).screen,
    ).toBe("room");
  });

  it("Back goes to the previous Memory, never below the first", () => {
    const playing = run([
      { type: "chooseRoom", roomId },
      { type: "openObject", slotId: "bench" },
      { type: "playMemory", index: 1 },
    ]);
    expect(run([{ type: "back" }], bundle, playing)).toMatchObject({ index: 0 });
    expect(run([{ type: "back" }, { type: "back" }], bundle, playing)).toMatchObject({ index: 0 });
  });

  it("Return to the room works from a Memory and from the Heart", () => {
    const playing = run([
      { type: "chooseRoom", roomId },
      { type: "openObject", slotId: "bench" },
      { type: "playMemory", index: 0 },
    ]);
    expect(run([{ type: "returnToRoom" }], bundle, playing)).toEqual({ screen: "room", roomId });
    expect(run([{ type: "memoryEnded" }, { type: "returnToRoom" }], bundle, playing).screen).toBe(
      "room",
    );
  });

  it("rejects a polaroid index outside the Story", () => {
    const open = run([
      { type: "chooseRoom", roomId },
      { type: "openObject", slotId: "bench" },
    ]);
    expect(run([{ type: "playMemory", index: 5 }], bundle, open)).toEqual(open);
  });
});

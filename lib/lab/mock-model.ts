import type { LabModel } from "./approaches";

/** Deterministic stand-in for Claude: lets the whole experiment run offline and free. */
export const mockLabModel: LabModel = {
  async photoQuestions(photo) {
    return [
      `Tell us about this ${photo.key} moment: who is there and what are they doing?`,
      "What could you hear around them?",
      "What would you like to say to them?",
    ];
  },
  async agentTurn(_photo, transcript) {
    const asks = [
      "What do you remember about the day this photo was taken?",
      "Who is in it?",
      "What sounds go with this place?",
      "Is there something you would like to say to them?",
    ];
    return asks[transcript.length] ?? null;
  },
  async extractSheet(text, photo) {
    // Mock extraction trusts the scripted facts: the lab compares prompts, not parsing.
    const s = photo.script;
    return {
      place: s.place,
      soundOfPlace: s.sound,
      when: s.when,
      message: text ? s.message : undefined,
    };
  },
};

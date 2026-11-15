import { MemorySheet } from "@/lib/contracts/memory-sheet";

/**
 * The four creation methods compared in Q5. Each turns what a non-technical family
 * member says into the one MemorySheet. Pure and deterministic: anything that needs a
 * model (photo questions, agent) goes through the injected `LabModel`, mocked by default.
 */

export interface PhotoScript {
  title: string;
  people: string[];
  place: string;
  when: string;
  sound: string;
  message: string;
  /** What the person would write in one free box. */
  freeText: string;
  /** Short neutral description of the photo (what Claude vision would see). */
  description: string;
}

export interface TestPhoto {
  /** Stable key, e.g. "beach". */
  key: string;
  /** Scripted answers a family would plausibly give; keeps runs reproducible. */
  script: PhotoScript;
}

export interface QA {
  question: string;
  answer: string;
}

/** The model-backed parts. Mock implementation: `mockLabModel`. */
export interface LabModel {
  /** (c) Three questions adapted to the photo. */
  photoQuestions(photo: TestPhoto): Promise<string[]>;
  /** (d) Next agent question, or null when it has enough. */
  agentTurn(photo: TestPhoto, transcript: QA[]): Promise<string | null>;
  /** Turn a free text or transcript into sheet fields. */
  extractSheet(text: string, photo: TestPhoto): Promise<Partial<MemorySheet>>;
}

export interface ApproachResult {
  sheet: MemorySheet;
  /** Raw answers / text / transcript, stored as `LabRun.inputs`. */
  inputs: Record<string, unknown>;
}

const fixed = { colour: "keep_bw", restore: true, motion: "gentle", okAlone: false } as const;

/** (a) The current Studio questions: title, people, place, when, sound, message. */
export function approachQuestions(photo: TestPhoto): ApproachResult {
  const s = photo.script;
  const answers = {
    title: s.title,
    people: s.people,
    place: s.place,
    when: s.when,
    soundOfPlace: s.sound,
    message: s.message,
  };
  return {
    sheet: MemorySheet.parse({ ...fixed, ...answers, source: "form" }),
    inputs: { answers },
  };
}

/** (b) One free text box; the model extracts what it can, the text itself is kept. */
export async function approachFreeText(photo: TestPhoto, model: LabModel): Promise<ApproachResult> {
  const text = photo.script.freeText;
  const extracted = await model.extractSheet(text, photo);
  return {
    sheet: MemorySheet.parse({
      ...fixed,
      title: photo.script.title,
      people: [],
      ...extracted,
      freeText: text.slice(0, 500),
      source: "text_agent",
    }),
    inputs: { text },
  };
}

/** (c) Three photo-specific questions, answered from the script in order. */
export async function approachPhotoQuestions(
  photo: TestPhoto,
  model: LabModel,
): Promise<ApproachResult> {
  const questions = (await model.photoQuestions(photo)).slice(0, 3);
  const s = photo.script;
  const pool = [s.freeText, s.sound, s.message];
  const qa: QA[] = questions.map((question, i) => ({ question, answer: pool[i] ?? "" }));
  const text = qa.map((x) => x.answer).join(" ");
  const extracted = await model.extractSheet(text, photo);
  return {
    sheet: MemorySheet.parse({
      ...fixed,
      title: s.title,
      people: s.people,
      place: s.place,
      ...extracted,
      freeText: text.slice(0, 500),
      source: "text_agent",
    }),
    inputs: { qa },
  };
}

/** (d) A short written conversation, at most `maxTurns` questions. */
export async function approachAgent(
  photo: TestPhoto,
  model: LabModel,
  maxTurns = 4,
): Promise<ApproachResult> {
  const s = photo.script;
  const replies = [s.freeText, s.people.join(" and "), s.sound, s.message];
  const transcript: QA[] = [];
  for (let i = 0; i < maxTurns; i++) {
    const question = await model.agentTurn(photo, transcript);
    if (!question) break;
    transcript.push({ question, answer: replies[i] ?? "" });
  }
  const text = transcript.map((x) => x.answer).join(" ");
  const extracted = await model.extractSheet(text, photo);
  return {
    sheet: MemorySheet.parse({
      ...fixed,
      title: s.title,
      people: s.people,
      ...extracted,
      freeText: text.slice(0, 500),
      source: "text_agent",
    }),
    inputs: { transcript },
  };
}

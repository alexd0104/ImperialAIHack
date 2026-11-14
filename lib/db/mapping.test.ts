import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { House, Job, Scene } from "@/lib/contracts";
import house from "@/lib/contracts/__fixtures__/house.json";
import job from "@/lib/contracts/__fixtures__/job.json";
import scenes from "@/lib/contracts/__fixtures__/scenes.json";
import { fieldsToDoc, fromDoc, toDoc, toObjectId } from "./mapping";

const ID = "65f1a2b3c4d5e6f708192a3b";

describe("db mapping", () => {
  it("maps id → ObjectId and ISO strings → Date, and back to the same entity", () => {
    const entity = House.parse({ ...house, id: ID });
    const doc = toDoc(entity);
    expect(doc._id).toBeInstanceOf(ObjectId);
    expect(doc._id.toHexString()).toBe(ID);
    expect(doc).not.toHaveProperty("id");
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.consentAt).toBeInstanceOf(Date);

    const back = House.parse(fromDoc(doc));
    expect(back).toEqual({
      ...entity,
      createdAt: new Date(entity.createdAt).toISOString(),
      consentAt: new Date(entity.consentAt).toISOString(),
    });
  });

  it("converts nested dates and keeps foreign keys as strings", () => {
    const scene = Scene.parse({
      ...(Array.isArray(scenes) ? scenes[0] : scenes),
      id: ID,
      choice: { use: "still", colour: "bw", restored: true, chosenAt: "2026-11-14T18:00:00.000Z" },
    });
    const doc = toDoc(scene);
    expect((doc.choice as { chosenAt: unknown }).chosenAt).toBeInstanceOf(Date);
    expect(typeof doc.houseId).toBe("string");
    expect(Scene.parse(fromDoc(doc))).toEqual(scene);
  });

  it("round-trips a Job with a null lease", () => {
    const entity = Job.parse({ ...job, id: ID, lockedUntil: null });
    expect(Job.parse(fromDoc(toDoc(entity))).lockedUntil).toBeNull();
  });

  it("drops undefined fields and the id from $set patches", () => {
    expect(fieldsToDoc({ id: ID, title: "x", freeText: undefined })).toEqual({ title: "x" });
  });

  it("rejects ids that are not ObjectIds", () => {
    expect(toObjectId("not-an-id")).toBeNull();
    expect(toObjectId("zzzzzzzzzzzzzzzzzzzzzzzz")).toBeNull();
    expect(toObjectId(ID)?.toHexString()).toBe(ID);
    expect(() => toDoc({ id: "abc" })).toThrow();
  });
});

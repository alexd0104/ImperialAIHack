import {
  AssetView,
  DeletedResponse,
  GenerateResponse,
  Memory,
  MemoryDetail,
  type UpdateMemoryRequest,
} from "@/lib/contracts";
import { postStudio, requestStudio } from "./api";

/** Browser-side calls for the Memory create flow (S3–S5). */
export const memoryKey = (id: string) => ["memory", id] as const;

export function fetchMemory(id: string) {
  return requestStudio(`/api/memories/${id}`, MemoryDetail);
}

export function createMemory(storyId: string, title: string) {
  return postStudio(`/api/stories/${storyId}/memories`, { title }, Memory, crypto.randomUUID());
}

export function patchMemory(id: string, body: UpdateMemoryRequest) {
  return requestStudio(`/api/memories/${id}`, Memory, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function uploadMemoryAsset(id: string, kind: AssetView["kind"], file: Blob, name: string) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file, name);
  return requestStudio(`/api/memories/${id}/assets`, AssetView, { method: "POST", body: form });
}

export function deleteAsset(id: string) {
  return requestStudio(`/api/assets/${id}`, DeletedResponse, { method: "DELETE" });
}

export function generateMemory(id: string) {
  return postStudio(`/api/memories/${id}/generate`, {}, GenerateResponse, crypto.randomUUID());
}

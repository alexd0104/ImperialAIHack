"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { HouseBundle, HouseMode } from "@/lib/contracts";
import { unlockAudio } from "@/lib/house/audio";
import { fetchHouseBundle, sendHouseEvent } from "@/lib/house/fetch-bundle";
import {
  type FlowAction,
  type FlowState,
  findStory,
  initialFlow,
  reduceFlow,
} from "@/lib/house/flow";
import { preloadFiles } from "@/lib/house/preload";
import { ChooseRoom } from "./choose-room";
import { HeartScreen } from "./heart-screen";
import { HouseStage } from "./house-stage";
import { MemoryPlayer } from "./memory-player";
import { RoomScene } from "./room-scene";

const RETRY_MS = 5000;
const REFRESH_MS = 30_000;

/**
 * The whole House for one link. Preload first (warm background only, no spinner), then
 * Choose a room → Room → Object → Memory → Heart, driven by lib/house/flow.ts.
 */
export function HouseApp({ token, mode }: { token: string; mode: HouseMode }) {
  const [bundle, setBundle] = useState<HouseBundle | null>(null);
  const [failedFiles, setFailedFiles] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const loaded = await fetchHouseBundle(token, mode);
      if (cancelled) return;
      // Unreachable or unknown: keep the calm background and try again quietly.
      if (!loaded) {
        timer = setTimeout(load, RETRY_MS);
        return;
      }
      const failed = await preloadFiles(loaded.files);
      if (cancelled) return;
      setFailedFiles(failed);
      setBundle(loaded);
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, mode]);

  // C3: a Story the family publishes appears without reloading. The new bundle is
  // preloaded in the background and applied only while nothing is playing.
  const loaded = bundle !== null;
  const [pending, setPending] = useState<{ bundle: HouseBundle; failed: Set<string> } | null>(null);
  const [calm, setCalm] = useState(true);
  const latest = useRef<string>("");
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const poll = setInterval(async () => {
      const next = await fetchHouseBundle(token, mode);
      if (cancelled || !next) return;
      const key = JSON.stringify(next);
      if (key === latest.current) return;
      const failed = await preloadFiles(next.files);
      if (cancelled) return;
      latest.current = key;
      setPending({ bundle: next, failed });
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [loaded, token, mode]);

  useEffect(() => {
    if (bundle && !latest.current) latest.current = JSON.stringify(bundle);
  }, [bundle]);

  useEffect(() => {
    if (!pending || !calm) return;
    if (JSON.stringify(pending.bundle) !== JSON.stringify(bundle)) {
      setFailedFiles(pending.failed);
      setBundle(pending.bundle);
    }
    setPending(null);
  }, [pending, calm, bundle]);

  return (
    <HouseStage>
      {bundle && (
        <HouseFlow bundle={bundle} token={token} failedFiles={failedFiles} onCalm={setCalm} />
      )}
    </HouseStage>
  );
}

function HouseFlow({
  bundle,
  token,
  failedFiles,
  onCalm,
}: {
  bundle: HouseBundle;
  token: string;
  failedFiles: ReadonlySet<string>;
  onCalm: (calm: boolean) => void;
}) {
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const [state, dispatch] = useReducer(
    (s: FlowState, a: FlowAction) => reduceFlow(s, a, bundleRef.current),
    initialFlow,
  );
  // Back on the first Memory restarts it: a new key remounts the player.
  const [replay, setReplay] = useState(0);

  // Only Choose a room and a closed Room may change under the person's eyes.
  const calm = state.screen === "rooms" || state.screen === "room";
  useEffect(() => onCalm(calm), [calm, onCalm]);

  const pickMemory = useCallback((index: number) => dispatch({ type: "playMemory", index }), []);
  const closeObject = useCallback(() => dispatch({ type: "closeObject" }), []);

  if (state.screen === "rooms") {
    return (
      <div data-testid="house-ready" className="size-full">
        <ChooseRoom
          bundle={bundle}
          onChoose={(roomId) => dispatch({ type: "chooseRoom", roomId })}
        />
      </div>
    );
  }

  const room = bundle.rooms.find((r) => r.id === state.roomId);
  if (!room) return null;

  if (state.screen === "room" || state.screen === "open") {
    return (
      <RoomScene
        bundle={bundle}
        room={room}
        openSlotId={state.screen === "open" ? state.slotId : null}
        onTapObject={(slotId) => {
          // Inside the tap handler, or Safari keeps the Story silent.
          unlockAudio();
          dispatch({ type: "openObject", slotId });
        }}
        onPickMemory={pickMemory}
        onCloseObject={closeObject}
        onShowRooms={() => dispatch({ type: "showRooms" })}
      />
    );
  }

  const story = findStory(bundle, state.roomId, state.slotId);
  const memory = story?.memories[state.index];
  if (!story || !memory) return null;

  if (state.screen === "memory") {
    return (
      <MemoryPlayer
        key={`${memory.id}-${replay}`}
        memory={memory}
        index={state.index}
        count={story.memories.length}
        failedFiles={failedFiles}
        onStarted={() => sendHouseEvent(token, "view_started", memory.id)}
        onEnded={() => {
          sendHouseEvent(token, "view_completed", memory.id);
          dispatch({ type: "memoryEnded" });
        }}
        onBack={() => {
          if (state.index === 0) setReplay((r) => r + 1);
          dispatch({ type: "back" });
        }}
        onReturn={() => dispatch({ type: "returnToRoom" })}
      />
    );
  }

  return (
    <HeartScreen
      key={memory.id}
      isLast={state.index === story.memories.length - 1}
      onHeart={() => sendHouseEvent(token, "heart", memory.id)}
      onNext={() => dispatch({ type: "next" })}
    />
  );
}

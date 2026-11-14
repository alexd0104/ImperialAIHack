import { type ReactNode, Suspense } from "react";
import { StudioHeader, StudioNav } from "./StudioNav";

/**
 * Shared frame for every Studio screen except sign-in: one header (Home, Create, Care,
 * Sign out), a back link to the logical parent, the create-flow step, and the 1194 px column.
 */
export function StudioPage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1194px] px-5 py-6 sm:px-page">
      {/* The nav reads the URL, so it suspends while prerendering; the fallback keeps the links. */}
      <Suspense
        fallback={
          <div className="mb-6">
            <StudioHeader active={null} houseId={null} createHref="/studio/house/new" />
          </div>
        }
      >
        <StudioNav />
      </Suspense>
      {children}
    </main>
  );
}

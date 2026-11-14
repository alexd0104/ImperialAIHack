import { ArrowLeft, Home, Play, RotateCcw, X } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type * as React from "react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HeartButton } from "@/components/ui/heart-button";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Polaroid } from "@/components/ui/polaroid";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Dev-only gallery of every components/ui piece, used to compare code with Figma v5
// (captures in docs/design-evidence/f5-*). Strings here are fixtures, not product copy.
export const metadata: Metadata = { title: "UI kit (dev)", robots: { index: false } };

const family = [{ name: "Anne Martin" }, { name: "Paul" }, { name: "Léa Martin" }];
const colours = [
  "background",
  "surface",
  "surface-muted",
  "ink",
  "primary",
  "success",
  "success-surface",
  "success-text",
  "warning-surface",
  "danger",
  "switch-off",
  "switch-on",
  "overlay",
  "avatar-honey",
  "avatar-sage",
  "avatar-rose",
  "heart-from",
  "heart-to",
  "room-garden",
  "room-kitchen",
  "room-living",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-28 text-ink">{title}</h2>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </section>
  );
}

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="flex flex-col gap-14 px-page py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-44 text-ink">memorAI UI kit</h1>
        <p className="text-18 text-ink/70">Tokens and base components from Figma v5.</p>
      </header>

      <Section title="Colours">
        {colours.map((c) => (
          <div key={c} className="flex w-28 flex-col gap-2">
            <div
              className="h-16 rounded-lg border border-ink/10"
              style={{ background: `var(--color-${c})` }}
            />
            <code className="text-13 text-ink/80">{c}</code>
          </div>
        ))}
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          <p className="font-display text-44 leading-tight">Fraunces 44, a Story to share</p>
          <p className="font-body text-18 font-bold">Nunito Bold 18, bring it to life</p>
          <p className="font-body text-16">Nunito 16, body text in ink.</p>
          <p className="font-hand text-22 text-ink/85">Caveat 22, Summer 1974</p>
        </div>
      </Section>

      <Section title="Button">
        <Button>Bring to life</Button>
        <Button variant="secondary">Keep original photo</Button>
        <Button size="sm">Small primary</Button>
        <Button variant="secondary" size="sm">
          Small secondary
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Switch · Checkbox">
        <Switch defaultChecked aria-label="OK alone, on" />
        <Switch aria-label="OK alone, off" />
        <div className="flex items-center gap-3">
          <Checkbox id="dev-check-1" defaultChecked />
          <Label htmlFor="dev-check-1" className="text-16 font-semibold text-ink">
            Grandma loved this song
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="dev-check-2" />
          <Label htmlFor="dev-check-2" className="text-16 font-semibold text-ink">
            Not checked
          </Label>
        </div>
      </Section>

      <Section title="Badge">
        <Badge variant="approved">Approved</Badge>
        <Badge variant="attention">Check</Badge>
        <Badge variant="neutral">Draft</Badge>
        <div className="rounded-lg bg-overlay p-4">
          <Badge variant="media">Summer 1974</Badge>
        </div>
        <div className="rounded-lg bg-room-garden p-4">
          <Badge variant="photo">Original</Badge>
        </div>
        <div className="rounded-lg bg-room-garden p-4">
          <Badge variant="photoPrimary">Animated</Badge>
        </div>
      </Section>

      <Section title="Card · Input">
        <Card className="flex w-96 flex-col gap-4">
          <CardTitle>Who is in this photo?</CardTitle>
          <CardDescription>Only the names the family wants to show.</CardDescription>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dev-name">Name</Label>
            <Input id="dev-name" placeholder="Grandma Anne" />
          </div>
          <Textarea placeholder="A few words about this moment" />
        </Card>
        <Card padding="sm" className="w-96">
          <Input size="lg" placeholder="Where was this?" aria-label="Where was this?" />
        </Card>
      </Section>

      <Section title="Tabs · ToggleGroup">
        <Tabs defaultValue="memories">
          <TabsList>
            <TabsTrigger value="memories">Memories</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
          </TabsList>
          <TabsContent value="memories" />
        </Tabs>
        <ToggleGroup type="single" defaultValue="animate" aria-label="Scene choice">
          <ToggleGroupItem value="animate">Bring to life</ToggleGroupItem>
          <ToggleGroupItem value="keep">Keep original</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" defaultValue="garden" aria-label="Room">
          <ToggleGroupItem tone="primary" value="garden">
            Garden
          </ToggleGroupItem>
          <ToggleGroupItem tone="primary" value="kitchen">
            Kitchen
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Polaroid">
        <Polaroid src="/rooms/garden.svg" caption="Summer 1974" tilt={-4} />
        <Polaroid src="/rooms/kitchen.svg" caption="Sunday lunch" video />
        <Polaroid src="/rooms/living-room.svg" caption="Paul" size="sm" tilt={3} />
        <Polaroid caption="No photo yet" size="sm" />
      </Section>

      <Section title="IconButton">
        <IconButton label="Close">
          <X />
        </IconButton>
        <IconButton label="Rooms">
          <Home />
        </IconButton>
        <div className="flex items-center gap-6 rounded-screen bg-room-living p-6">
          <IconButton label="Back" size={76} tone="glass" elevation="house">
            <ArrowLeft />
          </IconButton>
          <IconButton label="Replay" size={92} tone="glass" elevation="house">
            <RotateCcw />
          </IconButton>
          <IconButton label="Play" size={124} tone="primary" elevation="house">
            <Play className="fill-current" />
          </IconButton>
        </div>
      </Section>

      <Section title="HeartButton">
        <div className="rounded-screen bg-background">
          <HeartButton />
        </div>
      </Section>

      <Section title="AvatarGroup">
        <AvatarGroup people={family} aria-label="Family" />
        <AvatarGroup people={family} size={30} aria-label="Family, small" />
      </Section>

      <Section title="Stepper">
        <Stepper steps={["Photos", "Details", "Bring to life", "Send"]} current={2} />
      </Section>

      <Section title="SegmentedProgress">
        <div className="rounded-lg bg-overlay p-6">
          <SegmentedProgress count={4} current={1} />
        </div>
        <SegmentedProgress count={4} current={2} tone="cream" />
      </Section>
    </main>
  );
}

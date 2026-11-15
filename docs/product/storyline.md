> Product name is now **memorAI** (the storyline below still says "Memory House"; the House/Room/Object/Memory vocabulary is unchanged). House entry keeps the Figma "Choose a room" screen. Source: team storyline doc, 14 Nov 2026.

# Memory House — Aligned storyline

Nov 14, 2026 · @Yasir A

This tab merges the best storyline ideas from the Memory House brief and
the Living Memories brief; technical stack and implementation are
deliberately left out.

## Summary

**Memory House** lets a family restore and animate its real memories and
share them with a relative living with early-stage Alzheimer's, in a
calm, shared moment.

- **Core idea:** we don't make a video, we make a memory. A memory is
  motion, light, a song, a voice.

- **Product sentence:** the family brings a real memory back to life, so
  that the grandparent and their family share a moment of calm and
  connection.

- **Who it is for:** the family creates; the person watches, ideally
  with a relative beside them, and can go back alone to Memories the
  family has marked "OK alone".

- **Non-technical on both sides:** no prompts to write, no menus,
  nothing that can visibly fail.

- **A second gift:** over time the House becomes the family's record of
  who their grandparent is, something younger relatives can explore to
  understand them.

- **What we do not promise:** no clinical effect and no memory
  improvement. We promise a shared moment.

**Why these choices.** The name and hook come from Memory House: the
House structure *is* the story, and "we make a memory" answers "why not
just a video?" before it's asked. Early-stage Alzheimer's makes tablet
use and personal consent realistic. The "record of who they are" line
comes from Living Memories and the team's original notes.

## Vocabulary

One set of words in the interface, the pitch and the team's
conversations: House → Room → Object (= Story) → Memory.

| Term           | Meaning                                                                                                                                                                   | Created by                               |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| House          | The private space of one person living with Alzheimer's; holds one or more Rooms                                                                                          | The family                               |
| Room           | A familiar room: a photo of their real room, or a default style; objects sit in fixed places                                                                              | The family                               |
| Object = Story | A meaningful object (grandma's teapot, a record player). Touching it plays its Story: a few Memories in order                                                             | The family                               |
| Memory         | One real memory brought back: restored and gently animated photos, real videos, the real song, ambient sound, the family's own voice                                      | The family, guided by questions          |
| Memory sheet   | The plain-language summary of a Memory (who, where, which song, which ambience, which message, colour or black and white) that the family reviews before anything is made | Guided questions, approved by the family |
| Heart          | A single reaction after each Memory, sent to the family                                                                                                                   | The person or the relative beside them   |
| OK alone       | A tick on a Memory that allows it when the person watches without a relative                                                                                              | The family                               |
| Don't show     | People or topics the family keeps out of the House, for example a recent bereavement                                                                                      | The family                               |

## The problem, and what we can honestly claim

When a parent lives with Alzheimer's, the family wants to share moments
with them, but their memories sleep in old photos that are often damaged
or black and white. Making something meaningful from them takes skills
and time families don't have.

**What the research lets us say** (as summarised in the Memory House
research notes; we claim no clinical effect):

| Approach                                         | What the evidence suggests                     | How it shapes Memory House                                                  |
|--------------------------------------------------|------------------------------------------------|-----------------------------------------------------------------------------|
| Reminiscence (photos, objects, music as prompts) | Small, inconsistent benefits; no harms found   | We say "inspired by reminiscence", never "proven"                           |
| Familiar, personalised music                     | Positive effects on mood; mixed on agitation   | The family adds the person's real song; generated sound is ambience only    |
| Recorded family voices or videos                 | Too little good evidence; cautious use advised | Real voices only; watching together by default; "OK alone" is opt-in        |
| Supporting carers                                | Engagement is the recurring problem            | Creating a Memory takes minutes and the heart tells the family it was loved |

**On stage:** "Reminiscence and familiar music are widely used in
dementia care, with small but real benefits. We built a tool that makes
them easy for families, keeps every memory real, and puts the family in
the room. We make no medical claim."

## Family journey: creating a Memory

A family member with no technical skill creates a first Memory in about
five minutes and approves everything before it reaches the House.
Creating it is itself a family activity: gathering photos, choosing the
song, recording a message.

1.  **Create the House.** Give the person's first name and pick a first
    Room: a photo of their real living room, or a default style such as
    "warm 1970s living room".

2.  **Choose an Object.** Photograph something that means something
    (grandma's teapot, a hat, a record player) and place it in a free
    spot in the Room. That object is the Story.

3.  **Fill the memory bank.** Drop in photos, videos, voice recordings
    and the person's real favourite song. Only one photo or video is
    required.

4.  **Answer a few questions.** Short, concrete questions mean nobody
    starts from a blank page:

    - Who is in this photo? Where and when was it?

    - What did it sound like there: the fire, the garden, the sea?

    - Which song goes with this memory?

    - Do you want to say something to them, or tell the memory yourself?

    - Old photo: keep it black and white, or bring the colour back?

    - Is this memory OK for them to watch alone?

5.  **Read the Memory sheet.** Everything the family said, in plain
    language. They change anything they like.

6.  **Record the voice.** An optional message or narration, always in
    the family's own voice.

7.  **Approve every scene.** Side by side: original vs restored, black
    and white vs colour, gently animated vs still photo. If anything
    looks wrong (a face changed, something appeared that wasn't there),
    one tap brings back the original photo. Nothing reaches the House
    without approval.

8.  **Order and publish.** Put the Memories in order. The object appears
    in the Room on the person's tablet.

9.  **Hear back.** The family sees which Memories were watched and which
    got a heart.

**Family freedom:** the family decides what to include, whether to
restore and whether to colourise. Memory House informs and advises; it
doesn't forbid. A "don't show" list keeps sensitive people or topics
out.

## The person's journey: watching

The person opens one link and is in their own living room: no login, no
text to read, one tap to start a Story.

1.  **Open.** A shortcut on the tablet opens the House directly.

2.  **See the Room.** Their familiar room appears. Objects sit in the
    same place every time and glow softly to invite a touch.

3.  **Touch an Object.** Its Story starts. There is no menu and no list
    to choose from.

4.  **Watch.** Each Memory plays full screen with its sound. Large
    pause, back and "return to the room" buttons are always there.

5.  **React.** After each Memory, one heart sends love back to the
    family.

6.  **Return.** The Story ends gently and the Room comes back. Watching
    again is welcome: familiarity is the point.

**Two ways to watch**

- **Together (default):** a relative sits beside them; every Memory is
  available.

- **Alone:** only Memories the family marked "OK alone".

**Design rules for the person**

- No reading needed, no menus, nothing but a single tap.

- Large touch areas and forgiving taps; high contrast; captions optional
  for voice messages.

- Objects never change place; a new Story fills an empty spot. This
  constancy matters for someone with memory difficulties.

- Movement is gentle and never sudden: a soft glow, slow fades.

- Nothing ever looks broken: if a clip can't play, the original photo
  plays with its sound.

## What a Memory feels like

A Memory is not a single video but a short, layered moment with one
atmosphere, built only from what the family gave.

| Layer                          | Comes from                                           | Rule                                                      |
|--------------------------------|------------------------------------------------------|-----------------------------------------------------------|
| Restored, gently moving photos | The family's real photos                             | Subtle natural motion; no new people, objects or events   |
| Real videos                    | The family's uploads                                 | Played as they are                                        |
| The real song                  | The family's upload                                  | The familiar music the research points to                 |
| Ambient sound                  | Matched to the photo: fire crackling, birds, the sea | Only ever atmosphere; never replaces the real song        |
| A voice                        | The family's own recording                           | Never synthetic, never cloned; the music softens under it |
| The original photo             | Always kept                                          | Shown with a slow zoom whenever the family prefers it     |

**How it plays:** a soft fade in, ambience and song begin; clips follow
in the family's order; the family's voice speaks once while the music
softens; a gentle close; the heart; then the next Memory or back to the
Room.

## Trust, ethics and privacy

The rule is simple: every Memory is real, the family approves it, and
the product brings people together rather than replacing them.

**No false memories**

- Only real photos and videos are brought to life; no event, person or
  place is invented.

- Movement stays subtle and natural; no new people appear.

- Restoring a face can subtly change it, so restoration stays light and
  the family compares before and after.

- Colour can be guessed wrong (her dress may have been blue, not red),
  so the family chooses colour or the original black and white.

- The original photo is always one tap away, and nothing reaches the
  House without approval.

**Real people, real voices**

- Only the family's own recordings; no cloned or synthetic voices, no
  avatar or AI companion.

- Watching together is the default; watching alone is limited to
  Memories marked "OK alone".

**Sensitive memories** (for example a spouse who has died): we tell the
family that some memories can revive grief, offer the "don't show" list,
and let them decide. On stage: "The family decides; we inform them and
help them choose well."

**Family connection is the product:** making a Memory together, watching
side by side, the heart that closes the loop, and a House that grows
with every Story.

**Privacy, in one line on stage:** "Health information and family photos
stay under the family's control: explicit consent, the person involved
while they can be, deletion at any time, no public links."

**Language:** "a person living with Alzheimer's"; never "old",
"demented" or "patient". We talk about calm, connection and shared
moments, never about "getting their memory back".

## Pitch storyline

The pitch opens on the core idea, then follows one family, Frank and his
daughter Sarah (placeholder names), from problem to shared moment to
trust.

1.  **Hook.** "We don't make a video, we make a memory. A memory is
    motion, light, a song, a voice."

2.  **Problem.** Frank lives with early-stage Alzheimer's. Sarah wants
    to share moments with him, but their best memories sleep in a
    shoebox of faded, black-and-white photos.

3.  **Solution.** In a few minutes, with no technical skill, Sarah
    restores and gently animates those real photos, adds Frank's real
    song and her own voice. Simple questions guide her; she never faces
    a blank page.

4.  **The moment.** Frank opens his House on a tablet. His living room
    appears. He touches his old record player: his grandchildren play by
    the fire, it crackles, his song plays, Sarah's voice speaks to him.
    She's sitting beside him. A shared moment, not one more screen.

5.  **Trust.** We only bring real photos to life and invent nothing.
    Sarah saw every scene before and after, chose colour or black and
    white, and could always keep the original photo. Real voices only.

6.  **It grows.** Every new Story is a new object, always in the same
    place. Over time the House becomes the family's record of who Frank
    is, one his grandchildren can explore too.

7.  **Honest claim and privacy.** Inspired by reminiscence and familiar
    music, with no medical claim. The family controls everything, with
    consent and deletion at any time.

8.  **Close.** "Memory House: the family brings a memory back, and gets
    to share it."

## 3-minute demo script

The wow moment is at 1:40: a judge, playing Frank, touches the record
player and a faded photo of his grandchildren by the fire comes alive,
with crackling, his song and Sarah's voice.

| Time      | Beat                | What the judges see                                                                                                                                       |
|-----------|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0:00–0:20 | Hook and problem    | The core-idea line; a few faded, black-and-white photos on screen                                                                                         |
| 0:20–1:00 | Sarah creates       | Upload two photos and the song; answer three questions (who, what it sounded like, colour or black and white); the Memory sheet appears in plain language |
| 1:00–1:30 | Sarah approves      | Before/after restoration; colour vs black and white; one clip where a face changed, rejected in one tap so the original photo returns                     |
| 1:30–2:20 | Frank watches (wow) | Hand the tablet to a judge. The living room appears; they touch the record player; the Story plays; they tap the heart                                    |
| 2:20–2:35 | It grows            | A new object fills an empty spot; a glimpse of a second Room                                                                                              |
| 2:35–3:00 | Trust and close     | Real memories only, family approval, real voices, no medical claim, family-controlled data; closing line                                                  |

The watching part uses a Story prepared in advance, so the moment never
waits. Keep a recording of the full demo as a backup.

## Judge questions and answers

| Question                                               | Answer                                                                                                                                                                                                                               |
|--------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Why not just send the videos?                          | Most old memories exist only as photos, often damaged or black and white. Memory House restores and animates them, gives them their song and atmosphere, and gathers them in a familiar, stable place. Real videos play as they are. |
| Aren't you creating false memories?                    | We only bring real photos to life with subtle motion and invent nothing. The family compares before and after, chooses colour or black and white, can always keep the original photo, and approves every scene.                      |
| What about people who have died?                       | We never generate new likenesses or voices. Some memories can revive grief, so we tell the family, offer a "don't show" list, and let them decide.                                                                                   |
| Does it improve memory?                                | We make no medical claim. Reminiscence and familiar music are widely used in dementia care with small but real benefits; we make them easy and keep the family in the room.                                                          |
| Isn't this another screen replacing people?            | Watching together is the default, voices are the family's own, and making a Memory is itself a family activity.                                                                                                                      |
| How do you handle data?                                | Explicit consent, the person involved while they can be, family-only access, deletion of anything at any time, no public links.                                                                                                      |
| How is this different from AI companions for dementia? | Companion avatars give the person an AI to talk to. Memory House gives them their own family's memories, shared with real people.                                                                                                    |

## Open storyline questions

- [ ] Persona names: keep "Frank" and "Sarah", or use a team member's
  real family with permission?

- [ ] Demo object: the record player, or another object the team can
  photograph?

- [ ] Exact closing of a Story: the family's last words, or a fade back
  to the room?

- [ ] Final name: check that no similar app already uses "Memory House".

- [ ] Length of the judging slot: confirm with the organisers that 3
  minutes is right.

- [ ] Who plays Sarah on stage, and which judge gets the tablet?

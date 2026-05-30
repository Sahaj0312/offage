/**
 * Worker easter-egg personalities. You can technically "talk" to a worker by
 * walking up and pressing E, but they only give canned, escalating brush-offs
 * that nudge you back to the Manager — no real tasking. Pure client-side comedy.
 *
 * Each archetype has 4 tiers of lines (0 dismissive → 3 unhinged); the worker's
 * annoyance level (bumped each time you pester them) picks the tier.
 */

export interface Archetype {
  name: string;
  /** emoji shown by their name, one per tier */
  faces: [string, string, string, string];
  /** lines[tier] = a pool to pick from */
  lines: [string[], string[], string[], string[]];
}

export const ARCHETYPES: Archetype[] = [
  {
    name: 'burnt-out senior',
    faces: ['😐', '😒', '😤', '💀'],
    lines: [
      [
        "I'm heads-down right now. Take it to the Manager.",
        "I don't take requests off the street. Manager. Go.",
        "Whatever it is, it's a Manager problem.",
      ],
      [
        "Did the Manager send you? No? Then why are we talking.",
        "I have been doing this since before you had a cursor. Shoo.",
        "Every minute here is a minute not shipping. Go to the Manager.",
      ],
      [
        "I have 47 tabs open and a deadline. You are tab 48. Leave.",
        "My therapist says I shouldn't take on more scope. The Manager, however, can.",
        "I'm one merge conflict away from the woods. Please. The Manager.",
      ],
      [
        "I will unionize. I WILL. Now go bother the Manager.",
        "If you say one more word I'm pushing to main on a Friday out of spite.",
        "I have transcended requests. I am become deadline. GO. TO. THE. MANAGER.",
      ],
    ],
  },
  {
    name: 'too-cool intern',
    faces: ['😎', '🙄', '😮‍💨', '🫠'],
    lines: [
      ['yeah no. talk to mgmt.', 'lol. not my circus. Manager handles that.', "that's above my pay grade and my vibe. Manager."],
      ["bro I literally just got here. Manager's desk is right there.", 'are you my manager? no? ok then 👋', "I'm not even fully onboarded, why are you asking ME"],
      ["I came here for the free snacks not your tickets. Manager.", 'this is giving "skip-level meeting I did not agree to". Manager.', "ngl this interaction is NOT it. go see the Manager."],
      ['I’m updating my LinkedIn as we speak. Manager. Bye.', 'screaming. crying. throwing up. talk to the Manager.', "I'm gonna go cry in the phone booth room. ask the Manager."],
    ],
  },
  {
    name: 'gym-bro',
    faces: ['💪', '😠', '🥵', '🗯️'],
    lines: [
      ["bro I'm LOCKED IN. do not break the flow. Manager's got you.", "no reps for the weak, no tasks for me. Manager, champ.", "I'm in the zone, my guy. Manager handles intake."],
      ['BRO. you almost made me lose my pump. Manager. now.', "that's a Manager lift, not a me lift.", "you're between me and my gains. relocate to the Manager."],
      ["this is my SET. you do NOT talk during the SET. MANAGER.", "I don't spot strangers' tickets. Manager does. GO.", "respectfully? skill issue. take it to the Manager."],
      ['I will deadlift this entire desk if you do not see the Manager.', 'LIGHT WEIGHT BABY. heavy ask. Manager. MANAGER.', "MENTALITY. you lack it. the Manager has it. LEAVE."],
    ],
  },
  {
    name: 'anxious one',
    faces: ['😟', '😨', '😰', '😱'],
    lines: [
      ['oh— um, is this a performance review? I— please ask the Manager?', "I don't think I'm allowed to take that? the Manager is, though!", 'sorry sorry, I just— could you ask the Manager? thank you sorry.'],
      ['oh no. oh no oh no. that sounds like a Manager thing. please?', "I haven't slept and you want WHAT— Manager. talk to the Manager.", "is this going in my review?? I'll just— Manager. okay? okay."],
      ["I'm spiraling. I'm fully spiraling. the MANAGER. please go.", "why is everyone looking at me— I— THE MANAGER HANDLES THIS", 'I memorized the whole codebase out of fear and STILL— Manager!!'],
      ['I LIVE HERE NOW. THIS DESK IS MY HOME. SEE THE MANAGER. PLEASE.', "I've started naming the bugs. they have families. MANAGER. GO.", 'AAAAAAA— *deep breath* — the Manager. it has to be the Manager.'],
    ],
  },
  {
    name: 'diva',
    faces: ['💅', '🙄', '😤', '👑'],
    lines: [
      ['I only take direction from leadership, darling. The Manager.', "mm, no. I don't do walk-ins. Manager's calendar is over there.", 'a request? for moi? take it to my representation. The Manager.'],
      ["I don't do unscheduled. The Manager books me.", 'this is a closed set. the Manager runs the call sheet.', 'I am an artist, not a help desk. Manager. Thank you.'],
      ['ABSOLUTELY not. do you know who I am? ask the Manager who I am.', "I've worked with the best models in the industry and YOU— Manager.", 'security. SECURITY. ...fine. just— the Manager. go.'],
      ['I am UNFOLLOWING you in real life. The Manager. Goodbye.', 'I will be telling EVERYONE about this. starting with the Manager.', "I didn't claw my way to a corner desk to field YOUR asks. MANAGER."],
    ],
  },
  {
    name: 'conspiracy guy',
    faces: ['🧐', '👀', '😬', '🛸'],
    lines: [
      ["I knew you'd come. the Manager warned me. go see them.", "they don't WANT us talking directly. that's why: Manager.", 'follow the org chart. it leads to the Manager. always has.'],
      ['who sent you. blink twice. ...just go to the Manager.', "this 'task' — convenient timing, isn't it? Manager. now.", "I've mapped the whole pipeline on my wall in yarn. Manager node. go."],
      ['the standups are a PSYOP and the Manager is the only honest node. GO.', "you're a plant. literally. anyway. Manager. shoo, plant.", "I don't trust anyone whose tickets don't come through the Manager."],
      ['WAKE UP. the Manager is the only real one. THE ONLY REAL ONE. GO.', "they're listening. they're always— just TELL THE MANAGER okay??", "I'm going off-grid after this sprint. last word: Manager. trust no PM."],
    ],
  },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function archetypeFor(id: string): Archetype {
  return ARCHETYPES[hash(id) % ARCHETYPES.length];
}

export const MAX_TIER = 3;

/** A canned reply for pestering a worker at the given annoyance level. */
export function workerReply(id: string, annoyance: number): string {
  const a = archetypeFor(id);
  const tier = Math.min(Math.max(annoyance, 0), MAX_TIER);
  const pool = a.lines[tier];
  // vary by id + count so repeats don't immediately repeat the same line
  const pick = (hash(id) + annoyance) % pool.length;
  return pool[pick];
}

/** The face emoji for a worker at a given annoyance level. */
export function workerFace(id: string, annoyance: number): string {
  return archetypeFor(id).faces[Math.min(Math.max(annoyance, 0), MAX_TIER)];
}

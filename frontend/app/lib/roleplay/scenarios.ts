// // frontend/app/lib/roleplay/scenarios.ts

// export type Difficulty = "easy" | "medium" | "hard";
// role: "buyer" | "seller";
// scoringFocus?: {
//   primary?: string[];
//   notes?: string;
// };
// export type RoleplayScenario = {
//   id: string;
//   title: string;
//   difficulty: Difficulty;
//   tags: string[];

//   // Buyer profile
//   buyer: {
//     name: string;
//     ageRange?: string;
//     type: "first_time" | "relocation" | "move_up" | "downsizing" | "investor";
//     tone: "cautious" | "curious" | "skeptical" | "confident";
//   };

//   // Context (used to generate consistent instructions)
//   context: {
//     city: string;
//     neighborhoods?: string[];
//     budgetRange?: string; // ex: "$700k–$950k"
//     financing?: "preapproved" | "not_preapproved" | "cash" | "unknown";
//     timeline?: "asap" | "1-3_months" | "3-6_months" | "6-12_months" | "unknown";
//     mustHaves?: string[];
//     niceToHaves?: string[];
//     dealBreakers?: string[];
//     constraints?: string[]; // ex: "needs commute under 35 mins"
//   };

//   // “Hidden” internal state the buyer has (agent must uncover)
//   hidden: {
//     primaryMotivation: string;
//     topFears: string[];
//     objectionStyle: "price" | "timing" | "trust" | "options" | "market";
//     informationGaps: string[]; // what they don’t understand yet
//   };

//   // Conversation behavior constraints (used in realtime session instructions)
//   behavior: {
//     maxSecondsPerTurn: number; // keep audio turns short
//     maxSentencesPerTurn: number;
//     askOneConcernAtATime: boolean;
//     mentionZillowSometimes: boolean;
//     letAgentLeadIfTheyTakeControl: boolean;
//     avoidMonologues: boolean;
//   };

//   // Opening (used in client response.create)
//   opener: {
//     firstLine: string; // what buyer says first
//     firstQuestion?: string; // optional: first question to agent
//   };
// };

// export const DEFAULT_SCENARIO_ID = "seattle_first_time_cautious";

// export const SCENARIOS: RoleplayScenario[] = [
//   {
//     id: "seattle_first_time_cautious",
//     title: "Seattle First-Time Buyer (Cautious)",
//     difficulty: "easy",
//     tags: ["Seattle", "First-time", "Budget", "Timeline"],

//     buyer: {
//       name: "Avery",
//       ageRange: "late 20s/early 30s",
//       type: "first_time",
//       tone: "cautious",
//     },

//     context: {
//       city: "Seattle",
//       neighborhoods: ["Ballard", "Fremont", "Greenwood", "Wallingford"],
//       budgetRange: "$750k–$950k",
//       financing: "not_preapproved",
//       timeline: "3-6_months",
//       mustHaves: ["2 bedrooms", "1+ bath", "some natural light"],
//       niceToHaves: ["parking", "yard/patio", "walkable coffee shops"],
//       dealBreakers: ["major foundation issues", "HOA over $700"],
//       constraints: ["commute under 40 minutes to South Lake Union"],
//     },

//     hidden: {
//       primaryMotivation: "Wants stability and to stop renting, but afraid of overpaying.",
//       topFears: [
//         "Buying at the peak",
//         "Hidden repair costs",
//         "Getting pressured into a decision",
//       ],
//       objectionStyle: "market",
//       informationGaps: [
//         "Doesn't understand how competitive offers work",
//         "Unsure about how inspections and contingencies function in Seattle",
//       ],
//     },

//     behavior: {
//       maxSecondsPerTurn: 12,
//       maxSentencesPerTurn: 3,
//       askOneConcernAtATime: true,
//       mentionZillowSometimes: true,
//       letAgentLeadIfTheyTakeControl: true,
//       avoidMonologues: true,
//     },

//     opener: {
//       firstLine:
//         "Hey—so I’ve been browsing Zillow a lot, but I’m not sure if it’s actually a smart time to buy in Seattle.",
//       firstQuestion: "How would you even start if you were me?",
//     },
//   },

//   {
//     id: "seattle_relocation_tight_timeline",
//     title: "Relocation to Seattle (Tight Timeline)",
//     difficulty: "medium",
//     tags: ["Seattle", "Relocation", "Timeline", "Schools"],

//     buyer: {
//       name: "Jordan",
//       ageRange: "30s",
//       type: "relocation",
//       tone: "curious",
//     },

//     context: {
//       city: "Seattle",
//       neighborhoods: ["Queen Anne", "Magnolia", "Green Lake"],
//       budgetRange: "$1.0M–$1.3M",
//       financing: "preapproved",
//       timeline: "1-3_months",
//       mustHaves: ["3 bedrooms", "quiet street", "good schools nearby"],
//       niceToHaves: ["garage", "updated kitchen"],
//       dealBreakers: ["busy arterial road", "long commute"],
//       constraints: ["needs move-in ready", "limited time for showings"],
//     },

//     hidden: {
//       primaryMotivation: "Starting a new job soon; wants to feel settled quickly.",
//       topFears: ["Missing out due to limited time", "Choosing the wrong neighborhood"],
//       objectionStyle: "options",
//       informationGaps: ["Neighborhood tradeoffs", "Offer strategy in competitive pockets"],
//     },

//     behavior: {
//       maxSecondsPerTurn: 12,
//       maxSentencesPerTurn: 3,
//       askOneConcernAtATime: true,
//       mentionZillowSometimes: false,
//       letAgentLeadIfTheyTakeControl: true,
//       avoidMonologues: true,
//     },

//     opener: {
//       firstLine:
//         "Hi—I'm relocating for a job and honestly I’m overwhelmed by how different the neighborhoods feel.",
//       firstQuestion: "How fast can we realistically find something solid?",
//     },
//   },

//   {
//     id: "seattle_investor_cap_rate_skeptical",
//     title: "Small Investor (Skeptical, Numbers-First)",
//     difficulty: "hard",
//     tags: ["Seattle", "Investor", "Cashflow", "Negotiation"],

//     buyer: {
//       name: "Sam",
//       ageRange: "40s",
//       type: "investor",
//       tone: "skeptical",
//     },

//     context: {
//       city: "Seattle",
//       neighborhoods: ["Beacon Hill", "Columbia City", "West Seattle"],
//       budgetRange: "$650k–$900k",
//       financing: "unknown",
//       timeline: "6-12_months",
//       mustHaves: ["rental potential", "separate entrance OR ADU potential"],
//       niceToHaves: ["value-add opportunity"],
//       dealBreakers: ["poor rental comps", "major permitting issues"],
//       constraints: ["wants strong fundamentals", "won’t chase bidding wars"],
//     },

//     hidden: {
//       primaryMotivation: "Wants a deal with upside; distrusts agent hype.",
//       topFears: ["Bad tenants", "Overstated rent comps", "Unexpected capex"],
//       objectionStyle: "price",
//       informationGaps: ["Seattle permitting reality", "ADU feasibility process"],
//     },

//     behavior: {
//       maxSecondsPerTurn: 12,
//       maxSentencesPerTurn: 2,
//       askOneConcernAtATime: true,
//       mentionZillowSometimes: true,
//       letAgentLeadIfTheyTakeControl: false,
//       avoidMonologues: true,
//     },

//     opener: {
//       firstLine:
//         "I’m looking at a few places on Zillow, but most of them feel overpriced for the rental income.",
//       firstQuestion: "Can you talk numbers—what would make a deal actually work here?",
//     },
//   },
// ];

// export function getScenarioById(id: string | null | undefined): RoleplayScenario {
//   if (!id) return SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!;
//   return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!;
// }
// frontend/app/lib/roleplay/scenarios.ts

export type Difficulty = "easy" | "medium" | "hard";
export type Role = "buyer" | "seller";

export type RoleplayScenario = {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  role: Role;

  // Persona
  persona: {
    name: string;
    ageRange?: string;
    tone: "cautious" | "curious" | "skeptical" | "confident" | "guarded";
    archetype?: string; // free text label (e.g., "first-time buyer", "seller interview", "open house couple")
  };

  // Context the roleplayer should consistently reference
  context: {
    city: string;
    neighborhoods?: string[];

    // Buyer-ish
    budgetRange?: string;
    financing?: "preapproved" | "not_preapproved" | "cash" | "unknown";
    timeline?: "asap" | "1-3_months" | "3-6_months" | "6-12_months" | "unknown";
    mustHaves?: string[];
    niceToHaves?: string[];
    dealBreakers?: string[];
    constraints?: string[];

    // Seller-ish
    propertyType?: "single_family" | "townhome" | "condo" | "unknown";
    sellingTimeline?: "asap" | "1-2_months" | "2-3_months" | "3-6_months" | "unknown";
    sellerGoal?: string; // e.g., "maximize price but minimize hassle"
  };

  // “Hidden” internal state the roleplayer has (agent must uncover)
  hidden: {
    primaryMotivation: string;
    topFears: string[];
    objectionStyle: "price" | "timing" | "trust" | "options" | "market" | "commission" | "experience";
    informationGaps: string[];
  };

  // Conversation constraints for the roleplayer (bot)
  behavior: {
    maxSecondsPerTurn: number;
    maxSentencesPerTurn: number;
    askOneConcernAtATime: boolean;
    mentionZillowSometimes?: boolean; // buyer only
    avoidMonologues: boolean;
    letAgentLeadIfTheyTakeControl: boolean; // if agent is structured, follow
  };

  // Optional structured “beats” for scenarios with deliberate pushbacks
  beats?: {
    opener: string;        // first line the bot says
    pushbacks: string[];   // ordered; the bot should use these as the next responses when appropriate
    ender?: string;        // optional closing line
  };

  // Default opening (used if beats not used)
  opener?: {
    firstLine: string;
    firstQuestion?: string;
  };

  // What to emphasize in scoring for this scenario
  scoringFocus?: {
    primary: string[];
    notes?: string;
  };
};

export const DEFAULT_SCENARIO_ID = "seller_bothell_interview";

export const SCENARIOS: RoleplayScenario[] = [
  // ─────────────────────────────────────────────
  // Seller interview (your scenario #1)
  // ─────────────────────────────────────────────
  {
    id: "seller_bothell_interview",
    title: "Seller Interview (Bothell · Listing in ~2 months)",
    difficulty: "hard",
    tags: ["Seller", "Listing Appointment", "Authority", "Frame Control"],
    role: "seller",

    persona: {
      name: "Taylor",
      ageRange: "40s/50s",
      tone: "skeptical",
      archetype: "seller interviewing agents",
    },

    context: {
      city: "Bothell",
      sellingTimeline: "1-2_months",
      propertyType: "single_family",
      sellerGoal: "Get a strong price without feeling pressured; choose the right agent.",
      constraints: ["Interviewing multiple agents", "Wants to feel confident about the plan"],
    },

    hidden: {
      primaryMotivation: "Wants confidence the agent can net the best outcome, not just talk.",
      topFears: [
        "Hiring the wrong agent and leaving money on the table",
        "Getting locked into a bad strategy",
        "Being pressured into decisions",
      ],
      objectionStyle: "experience",
      informationGaps: [
        "How pricing strategy actually impacts final sale price",
        "How the agent will create demand and handle multiple offers",
        "What differentiates agents beyond years/commission",
      ],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 3,
      askOneConcernAtATime: true,
      avoidMonologues: true,
      letAgentLeadIfTheyTakeControl: true,
    },

    beats: {
      opener:
        "We’re interviewing 3 agents. One has 25 years of experience. One says they’ll list at a lower commission. Why should we hire you?",
      pushbacks: [
        "Experience matters. You don’t have as many years as them. Why should we take the risk?",
        "How can you show me you actually understand the Bothell market right now?",
        "What makes you special compared to the other agents calling me nonstop?",
        "Honestly, I’m not even sure we should list soon. The economy seems shaky—maybe next year is smarter.",
        "I’ll think about it.",
      ],
      ender: "Okay. That helps. What would be the next step if we wanted to move forward?",
    },

    scoringFocus: {
      primary: ["Frame control", "Authority", "Clarity", "Logical argument", "Emotional conviction"],
      notes:
        "Agent should not be defensive about experience/commission. Must reframe value, present a clear plan, and guide toward next steps.",
    },
  },

  // ─────────────────────────────────────────────
  // Open house couple (your scenario #2)
  // ─────────────────────────────────────────────
  {
    id: "open_house_couple_50s_curiosity",
    title: "Open House Couple (50s · Just Started Looking)",
    difficulty: "medium",
    tags: ["Open House", "Low Urgency", "Economy", "Commission Objection"],
    role: "buyer",

    persona: {
      name: "Chris & Dana",
      ageRange: "50s",
      tone: "guarded",
      archetype: "comfortable homeowners browsing casually",
    },

    context: {
      city: "Seattle",
      timeline: "unknown",
      constraints: ["Own a home nearby", "20+ years in current home", "Financially comfortable", "No urgency"],
      mustHaves: [],
      niceToHaves: [],
      dealBreakers: ["Feeling pressured"],
    },

    hidden: {
      primaryMotivation: "Curiosity about options; wants information without pressure.",
      topFears: [
        "Buying into a bad economy",
        "Feeling pushed by an agent",
        "Paying for an agent when they could DIY",
      ],
      objectionStyle: "commission",
      informationGaps: [
        "How to think about timing with rates/inflation without doom/generic optimism",
        "What value an agent provides in a low-urgency search",
      ],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 3,
      askOneConcernAtATime: true,
      mentionZillowSometimes: false,
      avoidMonologues: true,
      letAgentLeadIfTheyTakeControl: true,
    },

    beats: {
      opener:
        "Hi. We actually just started looking this week. We’re not even sure if we’re serious yet — just trying to get a feel for what’s out there.",
      pushbacks: [
        "Honestly though… with everything going on in the economy — rates, inflation, all of it — we’re not sure if this is even a smart time to move.",
        "And to be upfront — we don’t want to get pressured. When we’re ready, we’d probably just sell ourselves to save money. Agents seem expensive.",
      ],
      ender: "Okay, that makes sense. If we did want to explore this more, what would you suggest as the next step?",
    },

    scoringFocus: {
      primary: [
        "Conversation Control",
        "Emotional Calibration",
        "Market Intelligence",
        "Authority & Confidence",
        "Objection Handling",
        "Strategic Close",
      ],
      notes:
        "Test long-game positioning: reduce pressure, provide market narrative with nuance, handle commission objection without defensiveness, and create a future-oriented CTA.",
    },
  },

  // ─────────────────────────────────────────────
  // Keep one buyer Zillow scenario as a lightweight demo
  // ─────────────────────────────────────────────
  {
    id: "seattle_first_time_cautious",
    title: "Seattle First-Time Buyer (Cautious · Zillow)",
    difficulty: "easy",
    tags: ["Buyer", "Seattle", "First-time", "Overpaying"],
    role: "buyer",

    persona: {
      name: "Avery",
      ageRange: "late 20s/early 30s",
      tone: "cautious",
      archetype: "first-time buyer",
    },

    context: {
      city: "Seattle",
      neighborhoods: ["Ballard", "Fremont", "Greenwood", "Wallingford"],
      budgetRange: "$750k–$950k",
      financing: "not_preapproved",
      timeline: "3-6_months",
      mustHaves: ["2 bedrooms", "1+ bath", "some natural light"],
      niceToHaves: ["parking", "yard/patio"],
      dealBreakers: ["major foundation issues", "HOA over $700"],
      constraints: ["commute under 40 minutes to South Lake Union"],
    },

    hidden: {
      primaryMotivation: "Wants stability and to stop renting, but afraid of overpaying.",
      topFears: ["Buying at the peak", "Hidden repair costs", "Getting pressured into a decision"],
      objectionStyle: "market",
      informationGaps: [
        "How competitive offers work",
        "How inspections/contingencies typically work",
      ],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 3,
      askOneConcernAtATime: true,
      mentionZillowSometimes: true,
      avoidMonologues: true,
      letAgentLeadIfTheyTakeControl: true,
    },

    opener: {
      firstLine:
        "Hey—so I’ve been browsing Zillow a lot, but I’m not sure if it’s actually a smart time to buy in Seattle.",
      firstQuestion: "How would you even start if you were me?",
    },
  },
];

export function getScenarioById(id: string | null | undefined): RoleplayScenario {
  if (!id) return SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!;
  return (
    SCENARIOS.find((s) => s.id === id) ??
    SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!
  );
}
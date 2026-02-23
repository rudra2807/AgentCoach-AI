// frontend/app/lib/roleplay/scenarios.ts

export type Difficulty = "easy" | "medium" | "hard";

export type RoleplayScenario = {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];

  // Buyer profile
  buyer: {
    name: string;
    ageRange?: string;
    type: "first_time" | "relocation" | "move_up" | "downsizing" | "investor";
    tone: "cautious" | "curious" | "skeptical" | "confident";
  };

  // Context (used to generate consistent instructions)
  context: {
    city: string;
    neighborhoods?: string[];
    budgetRange?: string; // ex: "$700k–$950k"
    financing?: "preapproved" | "not_preapproved" | "cash" | "unknown";
    timeline?: "asap" | "1-3_months" | "3-6_months" | "6-12_months" | "unknown";
    mustHaves?: string[];
    niceToHaves?: string[];
    dealBreakers?: string[];
    constraints?: string[]; // ex: "needs commute under 35 mins"
  };

  // “Hidden” internal state the buyer has (agent must uncover)
  hidden: {
    primaryMotivation: string;
    topFears: string[];
    objectionStyle: "price" | "timing" | "trust" | "options" | "market";
    informationGaps: string[]; // what they don’t understand yet
  };

  // Conversation behavior constraints (used in realtime session instructions)
  behavior: {
    maxSecondsPerTurn: number; // keep audio turns short
    maxSentencesPerTurn: number;
    askOneConcernAtATime: boolean;
    mentionZillowSometimes: boolean;
    letAgentLeadIfTheyTakeControl: boolean;
    avoidMonologues: boolean;
  };

  // Opening (used in client response.create)
  opener: {
    firstLine: string; // what buyer says first
    firstQuestion?: string; // optional: first question to agent
  };
};

export const DEFAULT_SCENARIO_ID = "seattle_first_time_cautious";

export const SCENARIOS: RoleplayScenario[] = [
  {
    id: "seattle_first_time_cautious",
    title: "Seattle First-Time Buyer (Cautious)",
    difficulty: "easy",
    tags: ["Seattle", "First-time", "Budget", "Timeline"],

    buyer: {
      name: "Avery",
      ageRange: "late 20s/early 30s",
      type: "first_time",
      tone: "cautious",
    },

    context: {
      city: "Seattle",
      neighborhoods: ["Ballard", "Fremont", "Greenwood", "Wallingford"],
      budgetRange: "$750k–$950k",
      financing: "not_preapproved",
      timeline: "3-6_months",
      mustHaves: ["2 bedrooms", "1+ bath", "some natural light"],
      niceToHaves: ["parking", "yard/patio", "walkable coffee shops"],
      dealBreakers: ["major foundation issues", "HOA over $700"],
      constraints: ["commute under 40 minutes to South Lake Union"],
    },

    hidden: {
      primaryMotivation: "Wants stability and to stop renting, but afraid of overpaying.",
      topFears: [
        "Buying at the peak",
        "Hidden repair costs",
        "Getting pressured into a decision",
      ],
      objectionStyle: "market",
      informationGaps: [
        "Doesn't understand how competitive offers work",
        "Unsure about how inspections and contingencies function in Seattle",
      ],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 3,
      askOneConcernAtATime: true,
      mentionZillowSometimes: true,
      letAgentLeadIfTheyTakeControl: true,
      avoidMonologues: true,
    },

    opener: {
      firstLine:
        "Hey—so I’ve been browsing Zillow a lot, but I’m not sure if it’s actually a smart time to buy in Seattle.",
      firstQuestion: "How would you even start if you were me?",
    },
  },

  {
    id: "seattle_relocation_tight_timeline",
    title: "Relocation to Seattle (Tight Timeline)",
    difficulty: "medium",
    tags: ["Seattle", "Relocation", "Timeline", "Schools"],

    buyer: {
      name: "Jordan",
      ageRange: "30s",
      type: "relocation",
      tone: "curious",
    },

    context: {
      city: "Seattle",
      neighborhoods: ["Queen Anne", "Magnolia", "Green Lake"],
      budgetRange: "$1.0M–$1.3M",
      financing: "preapproved",
      timeline: "1-3_months",
      mustHaves: ["3 bedrooms", "quiet street", "good schools nearby"],
      niceToHaves: ["garage", "updated kitchen"],
      dealBreakers: ["busy arterial road", "long commute"],
      constraints: ["needs move-in ready", "limited time for showings"],
    },

    hidden: {
      primaryMotivation: "Starting a new job soon; wants to feel settled quickly.",
      topFears: ["Missing out due to limited time", "Choosing the wrong neighborhood"],
      objectionStyle: "options",
      informationGaps: ["Neighborhood tradeoffs", "Offer strategy in competitive pockets"],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 3,
      askOneConcernAtATime: true,
      mentionZillowSometimes: false,
      letAgentLeadIfTheyTakeControl: true,
      avoidMonologues: true,
    },

    opener: {
      firstLine:
        "Hi—I'm relocating for a job and honestly I’m overwhelmed by how different the neighborhoods feel.",
      firstQuestion: "How fast can we realistically find something solid?",
    },
  },

  {
    id: "seattle_investor_cap_rate_skeptical",
    title: "Small Investor (Skeptical, Numbers-First)",
    difficulty: "hard",
    tags: ["Seattle", "Investor", "Cashflow", "Negotiation"],

    buyer: {
      name: "Sam",
      ageRange: "40s",
      type: "investor",
      tone: "skeptical",
    },

    context: {
      city: "Seattle",
      neighborhoods: ["Beacon Hill", "Columbia City", "West Seattle"],
      budgetRange: "$650k–$900k",
      financing: "unknown",
      timeline: "6-12_months",
      mustHaves: ["rental potential", "separate entrance OR ADU potential"],
      niceToHaves: ["value-add opportunity"],
      dealBreakers: ["poor rental comps", "major permitting issues"],
      constraints: ["wants strong fundamentals", "won’t chase bidding wars"],
    },

    hidden: {
      primaryMotivation: "Wants a deal with upside; distrusts agent hype.",
      topFears: ["Bad tenants", "Overstated rent comps", "Unexpected capex"],
      objectionStyle: "price",
      informationGaps: ["Seattle permitting reality", "ADU feasibility process"],
    },

    behavior: {
      maxSecondsPerTurn: 12,
      maxSentencesPerTurn: 2,
      askOneConcernAtATime: true,
      mentionZillowSometimes: true,
      letAgentLeadIfTheyTakeControl: false,
      avoidMonologues: true,
    },

    opener: {
      firstLine:
        "I’m looking at a few places on Zillow, but most of them feel overpriced for the rental income.",
      firstQuestion: "Can you talk numbers—what would make a deal actually work here?",
    },
  },
];

export function getScenarioById(id: string | null | undefined): RoleplayScenario {
  if (!id) return SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!;
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID)!;
}
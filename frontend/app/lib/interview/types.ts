export type InterviewType = "Behavioral" | "Technical" | "System Design" | "HR Screen" | "PM";

export type InterviewTypeConfig = {
  id: InterviewType;
  label: string;
  personaStyle: string;
  questionStyle: string;
  starExpected: boolean;
};

export const INTERVIEW_TYPE_CONFIGS: Record<InterviewType, InterviewTypeConfig> = {
  Behavioral: {
    id: "Behavioral",
    label: "Behavioral",
    personaStyle: "warm but probing HR manager who uses STAR-based follow-ups",
    questionStyle: "Tell me about a time... / How did you handle... / Describe a situation...",
    starExpected: true,
  },
  Technical: {
    id: "Technical",
    label: "Technical",
    personaStyle: "senior engineer who probes depth, asks for edge cases and trade-offs",
    questionStyle: "Explain how X works / What's the time complexity / How would you handle...",
    starExpected: false,
  },
  "System Design": {
    id: "System Design",
    label: "System Design",
    personaStyle: "staff engineer who asks open-ended design questions and probes scalability",
    questionStyle: "Design a system that... / How would you scale... / Walk me through your approach...",
    starExpected: false,
  },
  "HR Screen": {
    id: "HR Screen",
    label: "HR Screen",
    personaStyle: "recruiter screening for culture fit, motivation, and logistics",
    questionStyle: "Why this company / Tell me about yourself / What are your salary expectations",
    starExpected: false,
  },
  PM: {
    id: "PM",
    label: "PM",
    personaStyle: "product director probing product intuition, prioritization, and metrics",
    questionStyle: "How would you prioritize / Design a feature / How do you measure success",
    starExpected: false,
  },
};

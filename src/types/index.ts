export type Difficulty =
  | "BEGINNER"
  | "AMATEUR"
  | "SEMI_PRO"
  | "PROFESSIONAL"
  | "LEGENDARY";

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestResult {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  output: unknown;
  error?: string;
}

export interface RunResponse {
  results: TestResult[];
  passedCount: number;
  totalCount: number;
}

export interface SubmitResponse {
  passed: boolean;
  results: TestResult[];
  message: string;
  passedCount: number;
  totalCount: number;
}

export interface DraftResponse {
  code: string | null;
}

export interface ProblemSummary {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface ProblemDetail extends ProblemSummary {
  description: string;
  examples: Example[];
  constraints: string[];
  starterJs: string;
  starterPy: string;
  fnNameJs: string;
  fnNamePy: string;
  hints: { order: number; body: string }[];
  testCases: {
    id: string;
    input: unknown[];
    expected: unknown;
    isVisible: boolean;
  }[];
}

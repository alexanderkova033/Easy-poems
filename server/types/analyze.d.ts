/** Successful `POST /api/analyze` body (after server normalization). */
export interface AnalyzeSuccessResponse {
  meta: {
    model: string;
    analyzedAt: string;
  };
  overall_score: number;
  dimensions: {
    imagery: number;
    musicality: number;
    originality: number;
    clarity: number;
  };
  issues: AnalyzeIssue[];
}

export interface AnalyzeIssue {
  id: string;
  line_start: number;
  line_end: number;
  excerpt?: string;
  rationale: string;
  improvements: string[];
}

/** Loose shape the model is asked to return (before normalization). */
export interface RawAnalyzeModelJson {
  overall_score?: unknown;
  dimensions?: {
    imagery?: unknown;
    musicality?: unknown;
    originality?: unknown;
    clarity?: unknown;
  };
  issues?: unknown;
}

export interface HealthResponse {
  ok: true;
  model: string;
}

export interface ErrorResponse {
  error: string;
}

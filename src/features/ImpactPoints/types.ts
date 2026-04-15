export interface ImpactPointAction {
  id: string;
  title: string;
  description: string | null;
  points: number;
  date: string;
  type: string;
  transaction_type: string;
  status: string;
}

export interface ImpactPointsSummary {
  account_id: string;
  phone_normalized: string;
  full_name: string | null;
  available_points: number;
  pending_points: number;
  lifetime_earned_points: number;
  lifetime_released_points: number;
}

export interface ImpactPointsDashboardResponse {
  summary: ImpactPointsSummary;
  history: ImpactPointAction[];
}
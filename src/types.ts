export interface User {
  id: number;
  phone: string;
  pseudo: string;
  district: string;
  is_admin: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  screenshot_url: string;
  status: 'pending' | 'validated' | 'rejected' | 'expired';
  expires_at: string;
}

export interface Question {
  id: number;
  category: string;
  question: string;
  options: string; // JSON string
  correct_index: number;
}

export interface Score {
  pseudo: string;
  phone?: string;
  score: number;
  total_time: number;
  district: string;
}

export interface DistrictRanking {
  district: string;
  total_score: number;
  player_count: number;
}

export interface AdminStats {
  totalPot: number;
  winnersPot: number;
  adminPot: number;
  rankings: Score[];
  districtRankings: DistrictRanking[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  scheduled_at: string;
  is_sent: number;
  created_at: string;
}

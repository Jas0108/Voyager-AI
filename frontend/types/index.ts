// TypeScript types for Voyager AI frontend

export interface User {
  id: string;
  email: string;
  username?: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  interests: string;
  itinerary?: ItineraryDay[];
  status?: "active" | "completed";
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  created_at: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  weather_note?: string;
  morning?: { activity: string; location: string; duration: string; tips: string };
  afternoon?: { activity: string; location: string; duration: string; tips: string };
  evening?: { activity: string; location: string; duration: string; tips: string };
}

export interface NearbyPlace {
  name: string;
  type: string;
  address?: string;
  lat?: number;
  lon?: number;
  google_maps_url?: string;
  opening_hours?: string;
  phone?: string;
}

export interface ChatResponse {
  execution_plan: string[];
  response: string;
  updated_trip?: Trip;
  itinerary?: ItineraryDay[];
  nearby_places?: NearbyPlace[];
  remaining_budget?: number;
  insights?: Record<string, string>;
}

export interface AuthResponse {
  token: string;
  user_id: string;
  email: string;
  username?: string;
}

export interface Preference {
  id: string;
  user_id: string;
  food_preference?: string;
  travel_style?: string;
  favorite_categories?: string;
  preferred_currency: string;
}

import api from "@/lib/api";
import { AuthResponse, ChatResponse, Expense, Trip } from "@/types";

export interface TripCreate {
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  interests: string;
}

export interface ExpenseCreate {
  trip_id: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
}

export const authService = {
  async signup(email: string, password: string, username?: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/signup", { email, password, username });
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },

  saveSession(response: AuthResponse) {
    localStorage.setItem("voyager_token", response.token);
    localStorage.setItem(
      "voyager_user",
      JSON.stringify({ id: response.user_id, email: response.email, username: response.username })
    );
  },

  getUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("voyager_user");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    localStorage.removeItem("voyager_token");
    localStorage.removeItem("voyager_user");
  },

  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("voyager_token");
  },
};

export const assistantService = {
  async chat(tripId: string, message: string): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>("/assistant/chat", {
      trip_id: tripId,
      message,
    });
    return data;
  },
};

export const expenseService = {
  async getExpenses(tripId: string): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>(`/expenses/${tripId}`);
    return data;
  },

  async createExpense(payload: ExpenseCreate): Promise<Expense> {
    const { data } = await api.post<Expense>("/expenses", payload);
    return data;
  },

  async deleteExpense(expenseId: string): Promise<void> {
    await api.delete(`/expenses/${expenseId}`);
  },
};

export const tripService = {
  async getTrips(): Promise<Trip[]> {
    const { data } = await api.get<Trip[]>("/trips");
    return data;
  },

  async getTrip(id: string): Promise<Trip> {
    const { data } = await api.get<Trip>(`/trips/${id}`);
    return data;
  },

  async createTrip(payload: TripCreate): Promise<Trip> {
    const { data } = await api.post<Trip>("/trips", payload);
    return data;
  },

  async updateTrip(id: string, payload: Partial<TripCreate>): Promise<Trip> {
    const { data } = await api.put<Trip>(`/trips/${id}`, payload);
    return data;
  },

  async deleteTrip(id: string): Promise<void> {
    await api.delete(`/trips/${id}`);
  },

  async clearItinerary(id: string): Promise<void> {
    await api.delete(`/trips/${id}/itinerary`);
  },

  async updateItinerary(id: string, itinerary: any[]): Promise<any> {
    const { data } = await api.put(`/trips/${id}/itinerary`, itinerary);
    return data;
  },

  async completeTrip(id: string): Promise<any> {
    const { data } = await api.post(`/trips/${id}/complete`);
    return data;
  },
};

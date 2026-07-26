"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services";

interface AuthUser {
  id: string;
  email: string;
}

/** Read auth user from localStorage after mount to avoid hydration mismatches. */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  return user;
}

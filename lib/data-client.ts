import { initialInquiries, makeSeedReservations } from "./mock-data";
import type { Inquiry, Reservation } from "./types";

const reservationKey = "leo-reservations-v1";
const inquiryKey = "leo-inquiries-v1";

// Browser-backed mock repository. Replace these methods with Supabase queries
// without changing the dashboard components.
export function loadReservations(): Reservation[] {
  try {
    const saved = localStorage.getItem(reservationKey);
    return saved ? JSON.parse(saved) as Reservation[] : makeSeedReservations();
  } catch {
    return makeSeedReservations();
  }
}

export function loadInquiries(): Inquiry[] {
  try {
    const saved = localStorage.getItem(inquiryKey);
    return saved ? JSON.parse(saved) as Inquiry[] : initialInquiries;
  } catch {
    return initialInquiries;
  }
}

export function saveReservations(items: Reservation[]) {
  localStorage.setItem(reservationKey, JSON.stringify(items));
}

export function saveInquiries(items: Inquiry[]) {
  localStorage.setItem(inquiryKey, JSON.stringify(items));
}

export type ReservationStatus = "Confirmed" | "Arrived" | "Completed" | "Cancelled" | "No-show";
export type ReservationSource = "Website" | "Phone" | "Instagram" | "Walk-in";
export type Reservation = {
  id: string; name: string; phone: string; email: string; guests: number; date: string; time: string;
  notes: string; source: ReservationSource; status: ReservationStatus;
};
export type InquiryStatus = "New" | "In progress" | "Handled";
export type Message = { from: "Guest" | "Leo's team"; text: string; at: string };
export type Inquiry = {
  id: string; name: string; phone: string; email: string; guests: number; preferredDate: string;
  message: string; status: InquiryStatus; unread: boolean; receivedAt: string; history: Message[];
};

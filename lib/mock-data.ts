import type { Inquiry, Reservation, ReservationSource, ReservationStatus } from "./types";

export const seedDate = "2026-10-28";
const names = ["Amara Wilson", "Luca Moretti", "Sofia Laurent", "Theo Fischer", "Maya Patel", "Oliver James", "Nina Kovac", "Mateo Rossi", "Clara Jensen", "Elias Berg", "Isabelle Martin", "Noah Bennett", "Lea Schneider", "Gabriel Silva", "Emilia Costa", "Oscar Lind", "Eva Novak", "Milo Andersson", "Alice Dubois", "Rafael Santos"];
const notes = ["Window seat, please", "Birthday — bringing a small cake", "One high chair", "Gluten-free guest", "", "", "Outdoor table if sunny", "Celebrating anniversary", "", "Vegetarian menu requested"];
const sources: ReservationSource[] = ["Website", "Website", "Phone", "Instagram", "Walk-in"];
const statuses: ReservationStatus[] = ["Confirmed", "Confirmed", "Confirmed", "Arrived", "Completed", "Confirmed", "No-show", "Cancelled"];
const times = ["11:30", "12:00", "12:15", "12:30", "13:00", "13:15", "13:30", "14:00", "17:30", "18:00", "18:15", "18:30", "19:00", "19:15", "19:30", "20:00", "20:15", "20:30", "21:00", "21:15"];

export function makeSeedReservations(): Reservation[] {
  const out: Reservation[] = [];
  for (let offset = -120; offset <= 35; offset++) {
    const d = new Date(`${seedDate}T12:00:00`); d.setDate(d.getDate() + offset);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const count = 6 + (Math.abs(offset * 7 + 91) % 10);
    for (let i = 0; i < count; i++) {
      const idx = (i + Math.abs(offset) * 3) % names.length;
      const status = offset < 0 && statuses[i % statuses.length] === "Confirmed" ? "Completed" : statuses[(i + Math.abs(offset)) % statuses.length];
      out.push({ id: `r-${iso}-${i}`, name: names[idx], phone: `+355 69 ${String(214 + (idx*19)%700).padStart(3,"0")} ${String(1000 + idx*73).slice(0,4)}`, email: `${names[idx].toLowerCase().replaceAll(" ",".")}@example.com`, guests: 2 + ((i + idx) % 5), date: iso, time: times[(i * 3 + Math.abs(offset)) % times.length], notes: notes[(i + idx) % notes.length], source: sources[(i + idx) % sources.length], status });
    }
  }
  return out;
}

export const initialInquiries: Inquiry[] = [
  { id:"q-1", name:"Elena Papadopoulos", phone:"+355 69 232 14 88", email:"elena.p@example.com", guests:8, preferredDate:"2026-10-30", message:"Hi! We are celebrating my mother's birthday on Friday and would love a table for eight around 19:30. Do you have any space? We would also love to bring a small cake.", status:"New", unread:true, receivedAt:"2026-10-28T10:42:00", history:[{from:"Guest",text:"Hi! We are celebrating my mother's birthday on Friday and would love a table for eight around 19:30. Do you have any space? We would also love to bring a small cake.",at:"Today, 10:42"}] },
  { id:"q-2", name:"Daniel Kim", phone:"+355 68 441 02 19", email:"daniel.kim@example.com", guests:4, preferredDate:"2026-10-29", message:"Could you let me know if the terrace is open tomorrow evening?", status:"In progress", unread:true, receivedAt:"2026-10-28T09:18:00", history:[{from:"Guest",text:"Could you let me know if the terrace is open tomorrow evening?",at:"Today, 09:18"},{from:"Leo's team",text:"Hi Daniel, yes, the terrace is open. What time would suit you?",at:"Today, 09:36"}] },
  { id:"q-3", name:"Marta Hoxha", phone:"+355 69 825 76 31", email:"marta.h@example.com", guests:2, preferredDate:"2026-11-01", message:"Do you have vegan options on the brunch menu?", status:"Handled", unread:false, receivedAt:"2026-10-27T16:05:00", history:[{from:"Guest",text:"Do you have vegan options on the brunch menu?",at:"Yesterday, 16:05"},{from:"Leo's team",text:"Absolutely! We have a vegan burger, fresh juices, and several brunch options. Hope to see you soon.",at:"Yesterday, 16:22"}] },
  { id:"q-4", name:"Anna Schmidt", phone:"+355 68 116 44 92", email:"anna.schmidt@example.com", guests:6, preferredDate:"2026-10-31", message:"We are visiting from Berlin this weekend. Can we book a table for six on Saturday around 20:00?", status:"New", unread:true, receivedAt:"2026-10-27T13:50:00", history:[{from:"Guest",text:"We are visiting from Berlin this weekend. Can we book a table for six on Saturday around 20:00?",at:"Yesterday, 13:50"}] },
  { id:"q-5", name:"Ben Carter", phone:"+355 69 907 63 05", email:"ben.c@example.com", guests:3, preferredDate:"2026-10-28", message:"Running about 15 minutes late for our 18:30 booking. Is that okay?", status:"Handled", unread:false, receivedAt:"2026-10-27T11:08:00", history:[{from:"Guest",text:"Running about 15 minutes late for our 18:30 booking. Is that okay?",at:"Yesterday, 11:08"},{from:"Leo's team",text:"No problem at all, Ben. We will hold your table.",at:"Yesterday, 11:19"}] },
  { id:"q-6", name:"Sara Oliveira", phone:"+355 69 500 31 26", email:"sara.o@example.com", guests:5, preferredDate:"2026-11-02", message:"Is it possible to arrange a quiet corner for a client lunch?", status:"In progress", unread:false, receivedAt:"2026-10-26T15:24:00", history:[{from:"Guest",text:"Is it possible to arrange a quiet corner for a client lunch?",at:"Monday, 15:24"}] },
];

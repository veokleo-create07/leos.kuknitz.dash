"use client";

import { createContext, cloneElement, isValidElement, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "de" | "en";
let activeLanguage: Language = "de";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void } | null>(null);

export function currentLocale() { return activeLanguage === "de" ? "de-DE" : "en-GB"; }

const de: Record<string, string> = {
  "Overview":"Übersicht", "Daily reservations":"Tagesreservierungen", "Inbox":"Posteingang", "Analytics":"Auswertung", "Workspace":"Arbeitsbereich",
  "Website":"Website", "Instagram":"Instagram", "Walk-in":"Laufkundschaft", "Monday":"Montag", "Tuesday":"Dienstag", "Wednesday":"Mittwoch", "Thursday":"Donnerstag", "Friday":"Freitag", "Saturday":"Samstag", "Sunday":"Sonntag", "Mon":"Mo", "Tue":"Di", "Wed":"Mi", "Thu":"Do", "Fri":"Fr", "Sat":"Sa", "Sun":"So", "Previous":"Zurück", "Next":"Weiter", "Select date":"Datum auswählen", "Reservations":"Reservierungen", "Reservation":"Reservierung",
  "Good morning":"Guten Morgen", "Here’s what’s happening at Leo’s today.":"Das erwartet euch heute bei Leo’s.",
  "Inquiries":"Anfragen", "Received on this date":"An diesem Tag eingegangen", "Across selected period":"Im ausgewählten Zeitraum",
  "Daily":"Täglich", "Weekly":"Wöchentlich", "Monthly":"Monatlich", "Total reservations":"Reservierungen gesamt", "Total guests":"Gäste gesamt", "Cancellations":"Stornierungen", "Walk-ins":"Laufkundschaft", "No-shows":"Nicht erschienen", "Phone (optional)":"Telefon (optional)", "Email (optional)":"E-Mail (optional)", "Patterns from real reservations.":"Einblicke aus echten Reservierungen.", "Loading reservations…":"Reservierungen werden geladen…", "Guest name is required.":"Der Name des Gastes ist erforderlich.", "Party size must be a positive whole number.":"Die Gruppengröße muss eine positive ganze Zahl sein.", "Date and time are required.":"Datum und Uhrzeit sind erforderlich.", "This party size exceeds the remaining capacity for that time. Choose another time or contact the restaurant.":"Für diese Gruppengröße reicht die verbleibende Kapazität zu dieser Uhrzeit nicht aus. Bitte wähle eine andere Zeit oder kontaktiere das Restaurant.", "Enter a valid date and time within restaurant hours.":"Bitte gib ein gültiges Datum und eine Uhrzeit innerhalb der Öffnungszeiten ein.",
  "Across all channels":"Über alle Kanäle", "Expected today":"Heute erwartet", "Today":"Heute", "All reservations":"Alle Reservierungen", "Choose a day to see its reservations.":"Wähle einen Tag, um die Reservierungen zu sehen.", "View all":"Alle anzeigen", "No reservations for this date.":"Keine Reservierungen für dieses Datum.",
  "bookings":"Buchungen", "reservations":"Reservierungen", "guests":"Gäste", "Guests":"Gäste",
  "Service management":"Serviceverwaltung", "A clear view of every guest coming through today.":"Alle Reservierungen des ausgewählten Tages im Überblick.", "New reservation":"Neue Reservierung", "All operational statuses":"Alle Reservierungsstatus", "Added in person":"Vor Ort eingetragen", "All times":"Alle Uhrzeiten", "Lunch":"Mittag", "Dinner":"Abend", "Any party size":"Alle Gruppengrößen", "1–2 guests":"1–2 Gäste", "3–4 guests":"3–4 Gäste", "5+ guests":"5+ Gäste", "All sources":"Alle Quellen", "All statuses":"Alle Status", "Confirmed":"Bestätigt", "Arrived":"Eingetroffen", "Completed":"Abgeschlossen", "Cancelled":"Storniert", "No-show":"Nicht erschienen", "Search name, phone, or email":"Name, Telefon oder E-Mail suchen", "No notes added.":"Keine Notiz vorhanden.", "No notes added":"Keine Notiz vorhanden",
  "Time":"Uhrzeit", "Name":"Name", "Party size":"Gruppengröße", "Notes":"Notizen", "Source":"Quelle", "Status":"Status", "Actions":"Aktionen", "Guest name":"Name des Gastes", "Phone":"Telefon", "Email":"E-Mail", "Date":"Datum", "Edit reservation":"Reservierung bearbeiten", "Save changes":"Änderungen speichern", "Discard":"Verwerfen", "Create reservation":"Reservierung erstellen", "New bookings are confirmed automatically.":"Neue Buchungen werden automatisch bestätigt.", "Reservation details":"Reservierungsdetails", "Guest information":"Gastinformationen", "Date & time":"Datum und Uhrzeit", "Not provided":"Nicht angegeben", "Mark as arrived":"Als eingetroffen markieren", "Mark completed":"Als abgeschlossen markieren", "Cancel reservation":"Reservierung stornieren", "Mark no-show":"Als nicht erschienen markieren", "Open reservation":"Reservierung öffnen",
  "Guest messages":"Nachrichten von Gästen", "Read and manage customer inquiries.":"Kundenanfragen lesen und verwalten.", "Newest first":"Neueste zuerst", "Oldest first":"Älteste zuerst", "All":"Alle", "New":"Neu", "In progress":"In Bearbeitung", "Handled":"Erledigt", "Search inquiries":"Anfragen suchen", "Date not specified":"Kein Datum angegeben", "Select an inquiry to read its message.":"Wähle eine Anfrage, um die Nachricht zu lesen.", "This inquiry has already been converted.":"Diese Anfrage wurde bereits in eine Reservierung umgewandelt.", "Convert to reservation":"In Reservierung umwandeln", "Mark handled":"Als erledigt markieren", "Reply later":"Später bearbeiten", "Archive":"Archivieren", "Replies are not connected. Contact the customer using the details above.":"Antworten sind nicht verbunden. Kontaktiere den Gast über die Angaben oben.", "No inquiries to show.":"Keine Anfragen vorhanden.", "Customer":"Gast", "No email":"Keine E-Mail-Adresse", "No phone":"Keine Telefonnummer", "Could not mark inquiry as read.":"Anfrage konnte nicht als gelesen markiert werden.", "Could not update inquiry.":"Anfrage konnte nicht aktualisiert werden.", "Delete inquiry":"Anfrage löschen", "Delete this inquiry permanently? This cannot be undone. Any reservation already created from it will remain.":"Diese Anfrage dauerhaft löschen? Dies kann nicht rückgängig gemacht werden. Eine daraus erstellte Reservierung bleibt bestehen.", "Inquiry deleted":"Anfrage gelöscht", "Could not delete inquiry.":"Anfrage konnte nicht gelöscht werden.", "Inquiry archived":"Anfrage archiviert", "Inquiry converted to a confirmed reservation":"Anfrage in eine bestätigte Reservierung umgewandelt", "Loading reservations and inquiries…":"Reservierungen und Anfragen werden geladen…",
  "A closer look":"Im Detail", "Last 7 days":"Letzte 7 Tage", "Last 30 days":"Letzte 30 Tage", "Last 90 days":"Letzte 90 Tage", "vs previous period":"im Vergleich zum Vorzeitraum", "Active reservations":"Aktive Reservierungen", "Daily bookings · ":"Tägliche Buchungen · ", "Reservation source breakdown":"Reservierungen nach Quelle", "Where guests find us":"Wie Gäste uns finden", "Weekday performance":"Wochentage im Vergleich", "Reservations by day of week":"Reservierungen nach Wochentag", "Peak reservation hours":"Stoßzeiten", "Popular arrival windows":"Beliebte Ankunftszeiten", "Reservations per day":"Reservierungen pro Tag", "Bookings through the month":"Buchungen im Monatsverlauf",
  "last 7 days":"letzte 7 Tage", "last 30 days":"letzte 30 Tage", "last 90 days":"letzte 90 Tage", "Daily bookings":"Tägliche Buchungen", "not provided":"nicht angegeben",
  "Leo’s team":"Leo’s Team", "Sign out":"Abmelden", "Try again":"Erneut versuchen", "Dashboard data could not be loaded":"Dashboard-Daten konnten nicht geladen werden", "Reservation created and confirmed":"Reservierung erstellt und bestätigt", "Reservation updated":"Reservierung aktualisiert",
  "Welcome back.":"Willkommen zurück.", "Enter the staff password.":"Gib das Mitarbeiterpasswort ein.", "Staff password":"Mitarbeiterpasswort", "Enter the staff password":"Mitarbeiterpasswort eingeben", "Sign in":"Anmelden", "You’ve been signed out.":"Du wurdest abgemeldet.", "That password isn’t correct. Check it and try again.":"Das Passwort ist nicht korrekt. Bitte prüfe es und versuche es erneut.", "We couldn’t process that sign-in. Please try again.":"Die Anmeldung konnte nicht verarbeitet werden. Bitte versuche es erneut.", "Your session has expired. Enter the staff password again to continue.":"Deine Sitzung ist abgelaufen. Gib das Mitarbeiterpasswort erneut ein.", "Enter the staff password to continue.":"Gib das Mitarbeiterpasswort ein, um fortzufahren.", "Staff access isn’t configured yet. Ask an administrator to finish setup.":"Der Mitarbeiterzugang ist noch nicht eingerichtet. Bitte wende dich an die Administration.",
  "Source breakdown":"Quellenübersicht", "results":"Ergebnisse", "guests · ":"Gäste · ", "reservations · ":"Reservierungen · ", " · ":" · ",
  "Reservation date (YYYY-MM-DD)":"Reservierungsdatum (JJJJ-MM-TT)", "Reservation time (24-hour HH:MM)":"Uhrzeit (24-Stunden-Format HH:MM)", "Reservation marked arrived":"Reservierung als eingetroffen markiert", "Reservation marked completed":"Reservierung als abgeschlossen markiert", "Reservation marked cancelled":"Reservierung storniert", "Reservation marked no-show":"Reservierung als nicht erschienen markiert", "invalid_guest_details":"Bitte gib den Namen des Gastes und eine positive ganze Gruppengröße ein. Telefon und E-Mail sind optional.", "invalid_guests":"Die Gruppengröße muss eine positive ganze Zahl sein.", "invalid_time_interval":"Bitte wähle eine Uhrzeit zur vollen oder halben Stunde.", "outside_hours":"Die Uhrzeit liegt außerhalb der Öffnungszeiten oder in der Vergangenheit.", "capacity_exceeded":"Für diesen Zeitraum sind keine Plätze mehr verfügbar.", "Enter a guest name and a positive whole-number party size. Phone and email are optional.":"Bitte gib den Namen des Gastes und eine positive ganze Gruppengröße ein. Telefon und E-Mail sind optional.", "Check the email address or phone number, or leave the field blank.":"Bitte prüfe E-Mail-Adresse oder Telefonnummer oder lasse das Feld leer.", "Choose a reservation time on the hour or half hour.":"Bitte wähle eine Reservierungszeit zur vollen oder halben Stunde.", "Could not load dashboard.":"Dashboard konnte nicht geladen werden.", "Dashboard action failed.":"Aktion konnte nicht ausgeführt werden.", "Server database access is not configured.":"Der Datenbankzugriff ist nicht konfiguriert.", "Invalid reservation status.":"Ungültiger Reservierungsstatus.", "Unknown dashboard action.":"Unbekannte Dashboard-Aktion.",
  "Select reservation":"Reservierung auswählen", "Select all shown":"Alle angezeigten auswählen", "selected":"ausgewählt", "Delete selected":"Auswahl löschen", "Delete selected ({count})":"Auswahl löschen ({count})", "Delete reservation":"Reservierung löschen", "Delete {count} selected reservations permanently? This cannot be undone.":"{count} ausgewählte Reservierungen dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.", "Delete this reservation permanently? This cannot be undone.":"Diese Reservierung dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.", "Reservation deleted":"Reservierung gelöscht", "reservations deleted":"Reservierungen gelöscht", "Could not delete reservations.":"Reservierungen konnten nicht gelöscht werden.", "Could not delete reservation.":"Reservierung konnte nicht gelöscht werden.",
  "Saving reservation…":"Reservierung wird gespeichert…", "Invalid booking request. Please try again.":"Ungültige Buchungsanfrage. Bitte versuche es erneut.",
};

export function translate(text: string, language: Language) {
  if (language === "en") return text;
  const value = text.trim();
  if (!value) return text;
  const translated = de[value] ?? value
    .replace(/Total reservations/g, "Reservierungen gesamt")
    .replace(/Total guests/g, "Gäste gesamt")
    .replace(/reservations/gi, "Reservierungen")
    .replace(/reservation/gi, "Reservierung")
    .replace(/bookings/gi, "Buchungen")
    .replace(/guests/gi, "Gäste")
    .replace(/cancellations/gi, "Stornierungen")
    .replace(/guests/g, "Gäste")
    .replace(/arrived/gi, "eingetroffen")
    .replace(/completed/gi, "abgeschlossen")
    .replace(/cancelled/gi, "storniert")
    .replace(/no-show/gi, "nicht erschienen")
    .replace(/results/g, "Ergebnisse")
    .replace(/vs previous period/g, "im Vergleich zum Vorzeitraum");
  const start = text.indexOf(value);
  return text.slice(0, start) + translated + text.slice(start + value.length);
}

function translateNode(node: ReactNode, language: Language): ReactNode {
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, language));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  const props: Record<string, unknown> = { ...node.props };
  for (const key of ["placeholder", "aria-label", "title", "alt"]) {
    if (typeof props[key] === "string") props[key] = translate(props[key] as string, language);
  }
  if (props.children !== undefined) props.children = translateNode(props.children as ReactNode, language);
  return cloneElement(node, props);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");
  const [ready, setReady] = useState(false);
  activeLanguage = language;
  useEffect(() => {
    const saved = localStorage.getItem("leo-dashboard-language");
    if (saved === "de" || saved === "en") setLanguage(saved);
    setReady(true);
  }, []);
  useEffect(() => {
    activeLanguage = language;
    document.documentElement.lang = language;
    if (ready) localStorage.setItem("leo-dashboard-language", language);
  }, [language, ready]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}

export function Translated({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <>{translateNode(children, language)}</>;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return <div className={`language-toggle ${className}`} role="group" aria-label={language === "de" ? "Sprache wählen" : "Choose language"}>
    {(["de", "en"] as const).map((choice) => <button key={choice} type="button" aria-pressed={language === choice} className={language === choice ? "active" : ""} onClick={() => setLanguage(choice)}>{choice.toUpperCase()}</button>)}
  </div>;
}

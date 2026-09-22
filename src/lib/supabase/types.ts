export type UserRole = "employee" | "admin";
export type AbteilungTyp = "sport" | "schuh" | "flex";
export type SlotAbteilungTyp = "sport" | "schuh" | "admin" | "digital" | "backoffice";
export type HalbtagTyp = "vm" | "nm";
export type PlanVarianteTyp = "A" | "B";

export interface ProfileRow {
  id: string;
  name: string;
  role: UserRole;
  soll_stunden_woche: number;
  abteilung: AbteilungTyp;
  aktiv: boolean;
  created_at: string;
}

export interface PlanSlotRow {
  id: string;
  variante: PlanVarianteTyp;
  zyklus_woche: number;
  wochentag: number;
  halbtag: HalbtagTyp;
  profile_id: string;
  stunden: number;
  abteilung_an_diesem_slot: SlotAbteilungTyp;
  pause_min: number;
  created_at: string;
}

export interface DienstplanSettingsRow {
  id: number;
  zyklus_start: string;
  aktive_variante: PlanVarianteTyp;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; name: string };
        Update: Partial<ProfileRow>;
      };
      plan_slots: {
        Row: PlanSlotRow;
        Insert: Partial<PlanSlotRow> & {
          variante: PlanVarianteTyp;
          zyklus_woche: number;
          wochentag: number;
          halbtag: HalbtagTyp;
          profile_id: string;
          stunden: number;
          abteilung_an_diesem_slot: SlotAbteilungTyp;
        };
        Update: Partial<PlanSlotRow>;
      };
      dienstplan_settings: {
        Row: DienstplanSettingsRow;
        Insert: Partial<DienstplanSettingsRow> & {
          zyklus_start: string;
        };
        Update: Partial<DienstplanSettingsRow>;
      };
    };
  };
}

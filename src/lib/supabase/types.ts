export type UserRole = "employee" | "admin";
export type AbteilungTyp = "sport" | "schuh" | "flex";
export type SlotAbteilungTyp = "sport" | "schuh" | "admin" | "digital" | "backoffice";
export type HalbtagTyp = "vm" | "nm";
export type PlanVarianteTyp = "A" | "B";

// Als `type` statt `interface` deklariert: @supabase/postgrest-js's generische
// Insert/Update-Typaufloesung (Relation extends { Insert: unknown } ? ... : never)
// schlaegt bei `interface`-Referenzen fehl und kollabiert sonst zu `never`.
export type ProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  soll_stunden_woche: number;
  abteilung: AbteilungTyp;
  aktiv: boolean;
  zeiterfassung_vereinbarung: boolean;
  created_at: string;
};

export type ZeitEintragRow = {
  id: string;
  profile_id: string;
  datum: string;
  plan_slot_id: string | null;
  geplante_stunden: number;
  ist_stunden: number;
  grund: string | null;
  erstellt_von: string;
  erstellt_am: string;
  aktualisiert_am: string;
};

export type MonatsabschlussRow = {
  jahr: number;
  monat: number;
  gesperrt_am: string;
  gesperrt_von: string;
};

export type PlanSlotRow = {
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
};

export type DienstplanSettingsRow = {
  id: number;
  zyklus_start: string;
  aktive_variante: PlanVarianteTyp;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; name: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "plan_slots_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      dienstplan_settings: {
        Row: DienstplanSettingsRow;
        Insert: Partial<DienstplanSettingsRow> & {
          zyklus_start: string;
        };
        Update: Partial<DienstplanSettingsRow>;
        Relationships: [];
      };
      zeit_eintraege: {
        Row: ZeitEintragRow;
        Insert: Partial<ZeitEintragRow> & {
          profile_id: string;
          datum: string;
          geplante_stunden: number;
          ist_stunden: number;
          erstellt_von: string;
        };
        Update: Partial<ZeitEintragRow>;
        Relationships: [
          {
            foreignKeyName: "zeit_eintraege_plan_slot_id_fkey";
            columns: ["plan_slot_id"];
            isOneToOne: false;
            referencedRelation: "plan_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      monatsabschluesse: {
        Row: MonatsabschlussRow;
        Insert: Partial<MonatsabschlussRow> & {
          jahr: number;
          monat: number;
          gesperrt_von: string;
        };
        Update: Partial<MonatsabschlussRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};

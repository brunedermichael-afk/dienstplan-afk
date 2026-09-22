export type UserRole = "employee" | "admin";
export type AbteilungTyp = "sport" | "schuh" | "flex";

export interface ProfileRow {
  id: string;
  name: string;
  role: UserRole;
  soll_stunden_woche: number;
  abteilung: AbteilungTyp;
  aktiv: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; name: string };
        Update: Partial<ProfileRow>;
      };
    };
  };
}

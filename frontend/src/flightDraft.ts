import { create } from "zustand";

// Shared in-memory state used to pass data between flow screens
// (operator details → checklist execution → summary → save)
type FlightDraft = {
  checklist: any | null;
  operator_name: string;
  gcs_operator: string;
  flight_id: string;
  aircraft_id?: string | null;
  serial_number_drone?: string;
  battery_used_label?: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  wind_speed?: number | null;
  wind_direction?: string;
  temperature?: number | null;
  weather_conditions?: string;
  weather_source: "auto" | "manual" | "none";
  airspace_status: "clear" | "warning" | "red_zone" | "unknown";
  test_objective?: string;
  changes_since_last?: string;
  all_up_weight?: number | null;
  payload_description?: string;
  flight_start_time?: string;
  flight_end_time?: string;
  flight_duration_seconds?: number;
  executions: Record<string, { state: "empty" | "pass" | "fail"; notes?: string; photo_url?: string }>;
  remarks?: string;
  damage_severity: "none" | "minor" | "moderate" | "critical";
  damage_report_description?: string;
  pilot_signature_url?: string;
  gcs_signature_url?: string;
  media: { type: "photo" | "video"; file_url: string; caption?: string }[];
  reset: () => void;
  setChecklist: (cl: any) => void;
  patch: (p: Partial<FlightDraft>) => void;
  setExecution: (item_id: string, state: "empty" | "pass" | "fail", notes?: string) => void;
};

const initial = (): Omit<FlightDraft, "reset" | "setChecklist" | "patch" | "setExecution"> => ({
  checklist: null,
  operator_name: "",
  gcs_operator: "",
  flight_id: "",
  aircraft_id: null,
  serial_number_drone: "",
  battery_used_label: "",
  location_name: "",
  latitude: null,
  longitude: null,
  wind_speed: null,
  wind_direction: "",
  temperature: null,
  weather_conditions: "",
  weather_source: "manual",
  airspace_status: "unknown",
  test_objective: "",
  changes_since_last: "",
  all_up_weight: null,
  payload_description: "",
  flight_start_time: undefined,
  flight_end_time: undefined,
  flight_duration_seconds: 0,
  executions: {},
  remarks: "",
  damage_severity: "none",
  damage_report_description: "",
  pilot_signature_url: undefined,
  gcs_signature_url: undefined,
  media: [],
});

export const useFlightDraft = create<FlightDraft>((set, get) => ({
  ...initial(),
  reset: () => set(initial()),
  setChecklist: (cl) => set({ checklist: cl }),
  patch: (p) => set(p as any),
  setExecution: (item_id, state, notes) =>
    set((s) => ({
      executions: { ...s.executions, [item_id]: { ...(s.executions[item_id] || {}), state, notes } },
    })),
}));

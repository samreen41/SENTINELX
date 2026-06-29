export interface Telemetry {
  userType: string;
  heartRate: number;
  bodyTemp: number;
  fallDetected: boolean;
  sos: boolean;
  movement: string;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  locationLabel: string;
}

export interface AIAnalysis {
  emergency: boolean;
  severity: string;
  confidence: number;
  reason: string;
  action: string;
  recommendations: string[];
  safeZoneStatus: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  userType: string;
  heartRate: number;
  bodyTemp: number;
  fallDetected: boolean;
  sos: boolean;
  movement: string;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  analysis: AIAnalysis;
  resolved: boolean;
  resolvedAt?: string;
  notes?: string;
}

export interface Contact {
  name: string;
  phone: string;
  relation: string;
  enabled: boolean;
}

export interface BroadcastLog {
  name: string;
  phone: string;
  relation: string;
  channels: { type: string; status: string; timestamp: string }[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface IncidentReport {
  id: string;
  title: string;
  category: "Medical" | "Physical Threat" | "Fall" | "Fire" | "Accident" | "Other";
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  timestamp: string;
  reportedBy: string;
  resolved: boolean;
  notes?: string;
}

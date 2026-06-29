import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Heart,
  Shield,
  Zap,
  MapPin,
  AlertTriangle,
  Users,
  Radio,
  RotateCcw,
  History,
  UserCheck,
  Check,
  Loader2,
  Power,
  Thermometer,
  Battery,
  Share2,
  FileText,
  BookOpen,
  Smartphone,
  Play,
  Volume2,
  VolumeX,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Share,
  UserPlus,
  LogIn,
  LogOut,
  Send,
  Megaphone,
  Mic,
} from "lucide-react";

import UserAuth from "./components/UserAuth";
import AIChatbot from "./components/AI_Chatbot";
import IncidentReporting from "./components/IncidentReporting";
import AdminPanel from "./components/AdminPanel";

// Standard Types for our UI and API interaction
interface Telemetry {
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

interface AIAnalysis {
  emergency: boolean;
  severity: string;
  confidence: number;
  reason: string;
  action: string;
  recommendations: string[];
  safeZoneStatus: string;
}

interface TelemetryLog {
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

interface Contact {
  name: string;
  phone: string;
  relation: string;
  enabled: boolean;
}

interface BroadcastLog {
  name: string;
  phone: string;
  relation: string;
  channels: { type: string; status: string; timestamp: string }[];
}

export default function App() {
  // Preset Scenarios for Hackathon Presentation
  const PRESET_SCENARIOS = [
    {
      name: "Elderly Care (Grandpa Arthur)",
      heartRate: 58,
      bodyTemp: 36.4,
      fallDetected: true,
      sos: false,
      movement: "None",
      latitude: 37.7749,
      longitude: -122.4194,
      batteryLevel: 82,
      locationLabel: "Master Bedroom Floor"
    },
    {
      name: "Women Safety (Sophia - Night Commute)",
      heartRate: 125,
      bodyTemp: 37.2,
      fallDetected: false,
      sos: true,
      movement: "Moderate",
      latitude: 37.7694,
      longitude: -122.4418,
      batteryLevel: 94,
      locationLabel: "Dark Transit Corridor Alley"
    },
    {
      name: "Construction Worker (Marcus - Site Safety)",
      heartRate: 138,
      bodyTemp: 38.1,
      fallDetected: true,
      sos: false,
      movement: "None",
      latitude: 37.7858,
      longitude: -122.4012,
      batteryLevel: 68,
      locationLabel: "High-Altitude Scaffold Wing B"
    },
    {
      name: "Routine Workout (Elena - Safe Trail Run)",
      heartRate: 110,
      bodyTemp: 36.9,
      fallDetected: false,
      sos: false,
      movement: "Active",
      latitude: 37.7599,
      longitude: -122.4368,
      batteryLevel: 98,
      locationLabel: "Golden Gate Recreational Loop"
    }
  ];

  // Primary State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    userType: "Elderly Care (Grandpa Arthur)",
    heartRate: 58,
    bodyTemp: 36.4,
    fallDetected: true,
    sos: false,
    movement: "None",
    latitude: 37.7749,
    longitude: -122.4194,
    batteryLevel: 82,
    locationLabel: "Master Bedroom Floor"
  });

  const [analysis, setAnalysis] = useState<AIAnalysis>({
    emergency: true,
    severity: "High",
    confidence: 94,
    reason: "A fall has been registered by the wearable accelerometer combined with near-zero physical movement. Heart rate is steady but low.",
    action: "Alerting nearest caretaker (Sophia) and preparing community health responders dispatch.",
    recommendations: [
      "Initiate Direct Check-In Voice call immediately.",
      "Check bedroom smart cameras or trigger local smart alarm sound.",
      "Dispatch nearby security/caregiver to execute manual lifting."
    ],
    safeZoneStatus: "Safe"
  });

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [broadcastDone, setBroadcastDone] = useState<boolean>(false);
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "incidents" | "admin" | "history" | "architecture">("dashboard");
  const [history, setHistory] = useState<TelemetryLog[]>([]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [completedRecommendations, setCompletedRecommendations] = useState<Record<string, boolean>>({});

  // Simulation Sound & Buzzer State
  const [buzzerActive, setBuzzerActive] = useState<boolean>(true);
  const [isLiveConnectionActive, setIsLiveConnectionActive] = useState<boolean>(true);

  // Web Audio API Siren Engine Ref
  const sirenRef = useRef<{
    audioCtx: AudioContext | null;
    osc1: OscillatorNode | null;
    osc2: OscillatorNode | null;
    lfo: OscillatorNode | null;
    gainNode: GainNode | null;
  }>({
    audioCtx: null,
    osc1: null,
    osc2: null,
    lfo: null,
    gainNode: null,
  });

  // Web Audio API Siren Alarm Sound Control Trigger
  useEffect(() => {
    const startSiren = async () => {
      // If we already have a running siren, don't start another
      if (sirenRef.current.audioCtx) return;

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = new AudioCtxClass();
        sirenRef.current.audioCtx = ctx;

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        // Create Nodes
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const mainGain = ctx.createGain();

        sirenRef.current.osc1 = osc1;
        sirenRef.current.osc2 = osc2;
        sirenRef.current.lfo = lfo;
        sirenRef.current.gainNode = mainGain;

        // Configure LFO for "Wee-Woo" wave modulation sweep
        lfo.type = "sine";
        lfo.frequency.value = 1.6; // 1.6 modulation cycles per second
        lfoGain.gain.value = 220; // modulate by ±220 Hz

        // Configure main oscillators for premium siren detuning & synthesis
        osc1.type = "triangle"; // triangle wave is crisp yet warm for emergency siren
        osc1.frequency.value = 750; // base frequency 750 Hz

        osc2.type = "sine"; // supporting detuned layer for spatial realism
        osc2.frequency.value = 754; // detuned by 4Hz for subtle natural beating

        // Connect LFO to modulate oscillator frequency
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        // Linear volume fade-in to prevent pops
        mainGain.gain.setValueAtTime(0, ctx.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);

        // Connect main signals to sound output
        osc1.connect(mainGain);
        osc2.connect(mainGain);
        mainGain.connect(ctx.destination);

        // Start synthesis
        osc1.start();
        osc2.start();
        lfo.start();
      } catch (err) {
        console.error("Failed to start realistic emergency siren audio:", err);
      }
    };

    const stopSiren = () => {
      const { audioCtx, osc1, osc2, lfo, gainNode } = sirenRef.current;
      
      try {
        if (audioCtx) {
          if (gainNode) {
            try {
              gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            } catch (e) {}
          }
          
          if (osc1) {
            try { osc1.stop(); } catch (e) {}
            try { osc1.disconnect(); } catch (e) {}
          }
          if (osc2) {
            try { osc2.stop(); } catch (e) {}
            try { osc2.disconnect(); } catch (e) {}
          }
          if (lfo) {
            try { lfo.stop(); } catch (e) {}
            try { lfo.disconnect(); } catch (e) {}
          }
          if (gainNode) {
            try { gainNode.disconnect(); } catch (e) {}
          }
          if (audioCtx && audioCtx.state !== "closed") {
            try { audioCtx.close(); } catch (e) {}
          }
        }
      } catch (err) {
        console.error("Failed to stop siren audio:", err);
      } finally {
        sirenRef.current = {
          audioCtx: null,
          osc1: null,
          osc2: null,
          lfo: null,
          gainNode: null,
        };
      }
    };

    if (analysis.emergency && buzzerActive) {
      startSiren();
    } else {
      stopSiren();
    }

    return () => {
      stopSiren();
    };
  }, [analysis.emergency, buzzerActive]);

  // Text-To-Speech States for Emergency Reasons
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Web Speech API text-to-speech speaker function
  const speakEmergencyReason = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech synthesis is not supported in this browser.");
      return;
    }

    // Cancel any current utterances first
    window.speechSynthesis.cancel();

    if (!ttsEnabled || !text) {
      setIsSpeaking(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (e) => {
        console.error("Speech Synthesis error occurred:", e);
        setIsSpeaking(false);
      };

      // Set voice rate and pitch to sound natural and realistic
      utterance.rate = 0.95; // slightly slower for high clarity during crisis
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      setIsSpeaking(false);
    }
  };

  // Auto-cancel speaking when user disables TTS option
  useEffect(() => {
    if (!ttsEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  // Clean up any speaking voice when App unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-speech trigger when emergency broadcast completes
  useEffect(() => {
    if (broadcastDone && analysis.emergency && analysis.reason) {
      const speechText = `Emergency broadcast dispatch completed. Primary warning reason: ${analysis.reason}`;
      speakEmergencyReason(speechText);
    }
  }, [broadcastDone, analysis.reason, analysis.emergency]);

  // Predefined Emergency Contacts List
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "Clara (Daughter / Primary)", phone: "+1 (555) 321-4567", relation: "Family Caregiver", enabled: true },
    { name: "Officer Sterling (Zone 4 Sec)", phone: "+1 (555) 987-6543", relation: "Local Security Dispatch", enabled: true },
    { name: "Emergency Trauma Service", phone: "911 Dispatcher Link", relation: "Emergency Care", enabled: true }
  ]);

  // Load alert history on mount
  useEffect(() => {
    fetchAlertHistory();
    const saved = localStorage.getItem("sentinelx_user");
    if (saved) {
      try {
        const userObj = JSON.parse(saved);
        setCurrentUser(userObj);
        setContacts([
          { name: `${userObj.emergencyContactName} (Caretaker)`, phone: userObj.emergencyContactPhone, relation: "Emergency Care", enabled: true },
          { name: "Officer Sterling (Zone 4 Sec)", phone: "+1 (555) 987-6543", relation: "Local Security Dispatch", enabled: true },
          { name: "Emergency Trauma Service", phone: "911 Dispatcher Link", relation: "Emergency Care", enabled: true }
        ]);
      } catch (err) {
        console.error("Failed to restore user session.", err);
      }
    }
  }, []);

  const getOfflineHistory = (): TelemetryLog[] => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("sentinelx_history_fallback");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    
    // Return some realistic initial records
    const initialHistory: TelemetryLog[] = [
      {
        id: "hist-1",
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        userType: "Elderly Care (Grandpa Arthur)",
        heartRate: 58,
        bodyTemp: 36.4,
        fallDetected: true,
        sos: false,
        movement: "None",
        latitude: 37.7749,
        longitude: -122.4194,
        batteryLevel: 82,
        analysis: {
          emergency: true,
          severity: "High",
          confidence: 94,
          reason: "[Offline Fallback] Fall detected with near-zero movement. Heart rate is low but steady.",
          action: "Alerting caretaker and dispatching local community first-responders.",
          recommendations: [
            "Caretaker to perform immediate wellness call.",
            "Check device audio connection for direct response.",
            "Dispatch nearest emergency team if no response within 2 mins."
          ],
          safeZoneStatus: "Safe"
        },
        resolved: true,
        resolvedAt: new Date(Date.now() - 3600000 * 23.8).toISOString(),
        notes: "Grandpa slipped out of bed. Caretaker verified he was helped up safely with no injuries."
      },
      {
        id: "hist-2",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        userType: "Women Safety (Sophia - Night Commute)",
        heartRate: 125,
        bodyTemp: 37.2,
        fallDetected: false,
        sos: true,
        movement: "Moderate",
        latitude: 37.7694,
        longitude: -122.4418,
        batteryLevel: 94,
        analysis: {
          emergency: true,
          severity: "Critical",
          confidence: 98,
          reason: "[Offline Fallback] Manual SOS triggered. Heart rate is highly elevated suggesting panic/distress.",
          action: "Activating live audio streaming, sharing GPS track with priority contacts.",
          recommendations: [
            "Dial emergency contact immediately.",
            "Initiate background audio record of wearable surroundings.",
            "Share real-time tracking link with safe-commute community network."
          ],
          safeZoneStatus: "HighRisk"
        },
        resolved: true,
        resolvedAt: new Date(Date.now() - 3600000 * 4.8).toISOString(),
        notes: "Sophia pressed panic button while being followed. Security guard responded, accompanied her to transit."
      }
    ];
    localStorage.setItem("sentinelx_history_fallback", JSON.stringify(initialHistory));
    return initialHistory;
  };

  const saveOfflineHistory = (historyList: TelemetryLog[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sentinelx_history_fallback", JSON.stringify(historyList));
    }
  };

  const runRuleBasedFallback = (t: Telemetry) => {
    let emergency = false;
    let severity = "Low";
    let confidence = 50;
    let reason = "Normal physiological status detected.";
    let action = "No response required.";
    let recommendations: string[] = ["Continue routine monitoring."];
    let safeZoneStatus = "Safe";

    if (t.sos) {
      emergency = true;
      severity = "Critical";
      confidence = 99;
      reason = "Manual emergency SOS button pressed by user.";
      action = "Alerting all emergency contacts immediately and opening live audio channel.";
      recommendations = [
        "Call user's direct line immediately.",
        "Check real-time location tracking.",
        "Dispatch local patrol services to the user's exact coordinates."
      ];
      safeZoneStatus = "HighRisk";
    } else if (t.fallDetected && t.movement === "None") {
      emergency = true;
      severity = "High";
      confidence = 95;
      reason = "Impact sensor triggered fall with subsequent loss of movement.";
      action = "Dispatching automated alert to family members and nearby emergency monitors.";
      recommendations = [
        "Attempt direct check-in call.",
        "Send caregiver to verify situation.",
        "Monitor heart rate for stability."
      ];
      safeZoneStatus = "Caution";
    } else if (t.fallDetected) {
      emergency = true;
      severity = "Medium";
      confidence = 80;
      reason = "Wearable registered an impact signature representing a fall.";
      action = "Notifying caretaker. Triggering 30-second response check-in.";
      recommendations = [
        "Send check-in notification to device.",
        "Prepare primary emergency contacts.",
        "Verify posture/GPS location movement."
      ];
      safeZoneStatus = "Caution";
    } else if (t.heartRate > 140 || t.heartRate < 45) {
      emergency = true;
      severity = "Medium";
      confidence = 85;
      reason = `Physiological anomaly detected. Heart rate is critically off-scale: ${t.heartRate} BPM.`;
      action = "Notifying medical caregiver of cardiovascular state discrepancy.";
      recommendations = [
        "Suggest user rest and sit down.",
        "Prompt wearable to issue a safety check vibration.",
        "Prepare medical report for physician review."
      ];
      safeZoneStatus = "Safe";
    }

    return {
      emergency,
      severity,
      confidence,
      reason: `[Local Fallback Mode] ${reason}`,
      action,
      recommendations,
      safeZoneStatus
    };
  };

  const fetchAlertHistory = async () => {
    try {
      const response = await fetch("/api/alerts");
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        saveOfflineHistory(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Error reading history logs from API, using offline fallback:", err);
      setHistory(getOfflineHistory());
    }
  };

  // Preload a specific scenario preset
  const handlePresetSelect = (presetName: string) => {
    const selected = PRESET_SCENARIOS.find((p) => p.name === presetName);
    if (selected) {
      setTelemetry({
        userType: selected.name,
        heartRate: selected.heartRate,
        bodyTemp: selected.bodyTemp,
        fallDetected: selected.fallDetected,
        sos: selected.sos,
        movement: selected.movement,
        latitude: selected.latitude,
        longitude: selected.longitude,
        batteryLevel: selected.batteryLevel,
        locationLabel: selected.locationLabel
      });
      // Reset broadcast states
      setBroadcastDone(false);
      setBroadcastLogs([]);
      setCompletedRecommendations({});
      // Auto toggle buzzer for critical/high
      setBuzzerActive(selected.fallDetected || selected.sos);
    }
  };

  // Transmit telemetry state to Server for Lemma SDK (Gemini AI) evaluation
  const handleAnalyzeTelemetry = async () => {
    setAnalyzing(true);
    setBroadcastDone(false);
    setBroadcastLogs([]);
    try {
      let result;
      try {
        const response = await fetch("/api/analyze-emergency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(telemetry)
        });

        if (response.ok) {
          result = await response.json();
        } else {
          throw new Error();
        }
      } catch (apiErr) {
        console.warn("Analysis API failed, falling back to local rule-based evaluation:", apiErr);
        result = runRuleBasedFallback(telemetry);
      }

      setAnalysis(result);
      setBuzzerActive(result.emergency);

      // Auto post this event to log history
      try {
        const postRes = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telemetry, analysis: result })
        });
        if (postRes.ok) {
          fetchAlertHistory();
        } else {
          throw new Error();
        }
      } catch (logErr) {
        console.warn("Saving alert log via API failed, saving to local fallback:", logErr);
        const currentLocalHistory = getOfflineHistory();
        const newLog: TelemetryLog = {
          id: `alert-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userType: telemetry.userType,
          heartRate: telemetry.heartRate,
          bodyTemp: telemetry.bodyTemp,
          fallDetected: telemetry.fallDetected,
          sos: telemetry.sos,
          movement: telemetry.movement,
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          batteryLevel: telemetry.batteryLevel,
          analysis: result,
          resolved: false
        };
        const updated = [newLog, ...currentLocalHistory];
        saveOfflineHistory(updated);
        setHistory(updated);
      }
    } catch (err) {
      console.error("Failed to analyze emergency:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Trigger simulated multi-channel alert broadcast to contacts
  const handleTriggerBroadcast = async () => {
    setBroadcasting(true);
    try {
      const enabledContacts = contacts.filter(c => c.enabled);
      let logs;
      try {
        const response = await fetch("/api/send-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId: `alert-${Date.now()}`,
            contacts: enabledContacts
          })
        });

        if (response.ok) {
          const result = await response.json();
          logs = result.recipientLogs;
        } else {
          throw new Error();
        }
      } catch (apiErr) {
        console.warn("Broadcast API failed, falling back to local simulation logs:", apiErr);
        logs = enabledContacts.map((c: any) => ({
          name: c.name,
          phone: c.phone,
          relation: c.relation,
          channels: [
            { type: "SMS", status: "Delivered", timestamp: new Date().toLocaleTimeString() },
            { type: "Email", status: "Sent", timestamp: new Date().toLocaleTimeString() },
            { type: "Automated Call", status: "Initiated", timestamp: new Date().toLocaleTimeString() }
          ]
        }));
      }

      setBroadcastLogs(logs);
      setBroadcastDone(true);
    } catch (err) {
      console.error("Failed to dispatch safety notifications:", err);
    } finally {
      setBroadcasting(false);
    }
  };

  // Immediate 1-Click System-Wide Red Emergency SOS Action
  const handleTriggerInstantSOS = async () => {
    // 1. Elevate state variables
    const sosTelemetry = {
      ...telemetry,
      sos: true,
      heartRate: Math.max(124, telemetry.heartRate),
    };
    setTelemetry(sosTelemetry);
    setAnalyzing(true);
    setBroadcastDone(false);
    setBroadcastLogs([]);
    setBuzzerActive(true);

    try {
      // 2. Transmit & Analyze
      let result;
      try {
        const response = await fetch("/api/analyze-emergency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sosTelemetry)
        });

        if (response.ok) {
          result = await response.json();
        } else {
          throw new Error();
        }
      } catch (apiErr) {
        console.warn("SOS Analysis API failed, falling back to local analysis:", apiErr);
        result = runRuleBasedFallback(sosTelemetry);
      }

      setAnalysis(result);

      // 3. Post telemetry and analysis to database history log
      try {
        const responseAlerts = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telemetry: sosTelemetry, analysis: result })
        });
        if (responseAlerts.ok) {
          fetchAlertHistory();
        } else {
          throw new Error();
        }
      } catch (logErr) {
        console.warn("SOS Saving alert log via API failed, saving to local fallback:", logErr);
        const currentLocalHistory = getOfflineHistory();
        const newLog: TelemetryLog = {
          id: `alert-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userType: sosTelemetry.userType,
          heartRate: sosTelemetry.heartRate,
          bodyTemp: sosTelemetry.bodyTemp,
          fallDetected: sosTelemetry.fallDetected,
          sos: sosTelemetry.sos,
          movement: sosTelemetry.movement,
          latitude: sosTelemetry.latitude,
          longitude: sosTelemetry.longitude,
          batteryLevel: sosTelemetry.batteryLevel,
          analysis: result,
          resolved: false
        };
        const updated = [newLog, ...currentLocalHistory];
        saveOfflineHistory(updated);
        setHistory(updated);
      }

      // 4. Dispatch emergency alerts to active contacts
      setBroadcasting(true);
      const enabledContacts = contacts.filter(c => c.enabled);
      let logs;
      try {
        const broadcastRes = await fetch("/api/send-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId: `alert-${Date.now()}`,
            contacts: enabledContacts
          })
        });

        if (broadcastRes.ok) {
          const bData = await broadcastRes.json();
          logs = bData.recipientLogs;
        } else {
          throw new Error();
        }
      } catch (apiErr) {
        console.warn("SOS Broadcast API failed, falling back to local simulation logs:", apiErr);
        logs = enabledContacts.map((c: any) => ({
          name: c.name,
          phone: c.phone,
          relation: c.relation,
          channels: [
            { type: "SMS", status: "Delivered", timestamp: new Date().toLocaleTimeString() },
            { type: "Email", status: "Sent", timestamp: new Date().toLocaleTimeString() },
            { type: "Automated Call", status: "Initiated", timestamp: new Date().toLocaleTimeString() }
          ]
        }));
      }

      setBroadcastLogs(logs);
      setBroadcastDone(true);
    } catch (err) {
      console.error("Critical SOS trigger failure:", err);
    } finally {
      setAnalyzing(false);
      setBroadcasting(false);
    }
  };

  const handleCopyShareLink = () => {
    const userSlug = currentUser ? currentUser.email.split("@")[0] : "active-user";
    const shareLink = `${window.location.origin}/?track=${userSlug}&lat=${telemetry.latitude.toFixed(5)}&lng=${telemetry.longitude.toFixed(5)}&pin=${Math.floor(1000 + Math.random() * 9000)}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Web Speech API - Speech Recognition for Voice Triggered SOS
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [voiceSOSActive, setVoiceSOSActive] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setSpeechSupported(true);
    }
  }, []);

  const startVoiceSOSListener = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setVoiceSOSActive(true);
        setSpeechError(null);
        setVoiceTranscript("Listening for 'SOS' or 'Help'...");
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = (finalTranscript + " " + interimTranscript).toLowerCase().trim();
        setVoiceTranscript(currentText || "Listening...");

        // Keywords detection
        const words = currentText.split(/\s+/);
        const hasSOS = words.some(w => w === "sos" || w === "s.o.s" || w === "help" || w === "emergency" || w === "danger" || w.includes("save me") || w.includes("help me"));

        if (hasSOS) {
          handleTriggerInstantSOS();
          // Instant high-tech speech feedback
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const alertSpeech = new SpeechSynthesisUtterance("Voice command detected. Initiating immediate emergency SOS and alert broadcasts!");
            alertSpeech.rate = 1.0;
            window.speechSynthesis.speak(alertSpeech);
          }
          // Turn off listener to prevent multi-triggering
          rec.abort();
          setVoiceSOSActive(false);
          setVoiceTranscript("Voice SOS triggered! Emergency mode activated.");
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access is blocked.");
          setVoiceSOSActive(false);
        } else if (event.error === "no-speech") {
          // ignore transient quietness
        } else {
          setSpeechError(`Error: ${event.error}`);
        }
      };

      rec.onend = () => {
        // Only auto-restart if we are still active and it wasn't triggered/aborted
        if (voiceSOSActive && recognitionRef.current === rec) {
          try {
            rec.start();
          } catch (e) {
            console.error("Speech recognition restart failed:", e);
          }
        } else {
          setVoiceSOSActive(false);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Initialization error.");
      setVoiceSOSActive(false);
    }
  };

  const stopVoiceSOSListener = () => {
    setVoiceSOSActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setVoiceTranscript("");
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Submit emergency event resolution
  const handleResolveAlert = async (id: string) => {
    try {
      try {
        const response = await fetch(`/api/alerts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: resolutionNotes })
        });

        if (response.ok) {
          setResolvingId(null);
          setResolutionNotes("");
          fetchAlertHistory();
        } else {
          throw new Error();
        }
      } catch (apiErr) {
        console.warn("Resolve alert API failed, modifying local history fallback:", apiErr);
        const currentLocalHistory = getOfflineHistory();
        const updated = currentLocalHistory.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              resolved: true,
              resolvedAt: new Date().toISOString(),
              notes: resolutionNotes || "Resolved by operator."
            };
          }
          return item;
        });
        saveOfflineHistory(updated);
        setHistory(updated);
        setResolvingId(null);
        setResolutionNotes("");
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  // Helper styles depending on severity
  const getSeverityStyle = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return {
          bg: "bg-rose-950/40 border-rose-500 text-rose-300",
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          light: "text-rose-400",
          pulse: "bg-rose-500",
          iconBg: "bg-rose-950/60"
        };
      case "high":
        return {
          bg: "bg-amber-950/40 border-amber-500 text-amber-300",
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          light: "text-amber-400",
          pulse: "bg-amber-500",
          iconBg: "bg-amber-950/60"
        };
      case "medium":
        return {
          bg: "bg-yellow-950/20 border-yellow-500/50 text-yellow-300",
          badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          light: "text-yellow-400",
          pulse: "bg-yellow-500",
          iconBg: "bg-yellow-950/40"
        };
      default:
        return {
          bg: "bg-zinc-900 border-zinc-800 text-zinc-300",
          badge: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
          light: "text-zinc-400",
          pulse: "bg-zinc-600",
          iconBg: "bg-zinc-800/80"
        };
    }
  };

  const handleToggleContact = (index: number) => {
    const updated = [...contacts];
    updated[index].enabled = !updated[index].enabled;
    setContacts(updated);
  };

  const currentStyle = getSeverityStyle(analysis.emergency ? analysis.severity : "low");

  // Approximate relative position for our simulated high-tech Map tracking grid
  // Standard San Francisco center point for our presets: lat ~37.77, lng ~-122.42
  const mapOffsetX = Math.max(10, Math.min(90, 50 + (telemetry.longitude - (-122.42)) * 800));
  const mapOffsetY = Math.max(10, Math.min(90, 50 - (telemetry.latitude - 37.77) * 800));

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 selection:bg-red-500/20 selection:text-red-300 font-sans">
      
      {/* Top Professional Navigation Header */}
      <header className="border-b border-slate-800 bg-[#0F172A] sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-red-900/30">
              X
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-display">SENTINEL<span className="text-red-500">X</span></h1>
                <span className="text-[10px] font-mono tracking-widest bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-800/50">
                  AI SAFETY ECOSYSTEM
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Lemma AI Smart Safety & IoT Response Hub
              </p>
            </div>
          </div>

          {/* Connection Status & Control indicators */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            
            {/* Live Websocket Heartbeat Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-950 ${isLiveConnectionActive ? "border-emerald-800/60 text-emerald-400" : "border-slate-800 text-slate-500"}`}>
              <div className={`w-2 h-2 rounded-full ${isLiveConnectionActive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></div>
              <span className="font-mono font-medium text-[11px]">
                {isLiveConnectionActive ? "ESP32 CONTROLLER ONLINE" : "WEARABLE OFFLINE"}
              </span>
            </div>

            {/* Active Siren Alert */}
            {analysis.emergency && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-800/80 bg-red-950/40 text-red-300 animate-pulse">
                <Bell className="w-3.5 h-3.5 text-red-400" />
                <span className="font-semibold tracking-wider uppercase">SIREN ON</span>
              </div>
            )}

            {/* Tab Toggles */}
            <nav className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-850 gap-0.5 max-w-full">
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Dashboard
              </button>
              <button
                id="tab-chat"
                onClick={() => setActiveTab("chat")}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                AI Chatbot
              </button>
              <button
                id="tab-incidents"
                onClick={() => setActiveTab("incidents")}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "incidents"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                Incident Reporting
              </button>
              <button
                id="tab-admin"
                onClick={() => setActiveTab("admin")}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                Admin Panel
              </button>
              <button
                id="tab-history"
                onClick={() => {
                  setActiveTab("history");
                  fetchAlertHistory();
                }}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "history"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
                {history.filter(h => !h.resolved).length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                )}
              </button>
              <button
                id="tab-architecture"
                onClick={() => setActiveTab("architecture")}
                className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "architecture"
                    ? "bg-slate-800 text-white shadow-sm border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Architecture
              </button>
            </nav>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Battery Low Persistent Warning Toast */}
            {telemetry.batteryLevel < 20 && (
              <div 
                className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-950/40 p-4 animate-fade-in backdrop-blur-md"
                id="low-battery-toast"
              >
                <div className="flex gap-3">
                  <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 text-amber-400 rounded-xl shrink-0 h-fit">
                    <Battery className="w-5 h-5 animate-pulse text-amber-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-wider text-amber-400 font-bold uppercase">
                        CRITICAL HARDWARE WARNING
                      </span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-100">
                      Low Wearable Battery ({telemetry.batteryLevel}%)
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      The ESP32 SentinelX device battery is critically low. AI emergency evaluation accuracy may decline if the node goes offline. Please connect the charger immediately.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Real-Time Alert Notifications Feed Banner */}
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-2xl border ${
                  analysis.emergency 
                    ? "bg-red-950/60 border-red-800 text-red-400 animate-pulse" 
                    : "bg-slate-950 border-slate-800 text-emerald-400"
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Alert Notifications Feed</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    {analysis.emergency 
                      ? `CRITICAL ALERT: ${telemetry.userType.split(" (")[0]} registered severe safety anomaly!` 
                      : "System Status: SentinelX Cloud Node operational. No immediate threats logged."
                    }
                  </h4>
                </div>
              </div>

              {/* Staggered mini historical alerts */}
              <div className="flex items-center gap-2 max-w-full overflow-x-auto text-[11px] font-mono shrink-0">
                <span className="text-slate-500 text-[10px]">RECENT LOGS:</span>
                {history.slice(0, 2).map(item => (
                  <div key={item.id} className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.analysis.emergency ? "bg-red-500" : "bg-emerald-500"}`} />
                    <span>{item.userType.split(" (")[0]}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
                {history.length === 0 && (
                  <span className="text-emerald-400 bg-emerald-950/25 border border-emerald-900/30 px-2 py-0.5 rounded text-[10px]">
                    No historical incidents found.
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Column Left: Scenario Presets & IoT Wearable Hardware Emulator (4/12 grid) */}
            <section className="lg:col-span-4 space-y-6">
              
              {/* User login / registration node */}
              <UserAuth
                currentUser={currentUser}
                onLogin={(user) => {
                  setCurrentUser(user);
                  localStorage.setItem("sentinelx_user", JSON.stringify(user));
                  // Auto-populate primary responder contact dynamically based on signed in credentials
                  setContacts([
                    { name: `${user.emergencyContactName} (Caretaker)`, phone: user.emergencyContactPhone, relation: "Emergency Care", enabled: true },
                    { name: "Officer Sterling (Zone 4 Sec)", phone: "+1 (555) 987-6543", relation: "Local Security Dispatch", enabled: true },
                    { name: "Emergency Trauma Service", phone: "911 Dispatcher Link", relation: "Emergency Care", enabled: true }
                  ]);
                }}
                onLogout={() => {
                  setCurrentUser(null);
                  localStorage.removeItem("sentinelx_user");
                }}
              />

              {/* Presets Card */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-red-500" />
                  <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
                    Safety Profile Simulator
                  </h2>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Load pre-configured safety scenarios to test active user tracking and AI Guardian automated decision logic.
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {PRESET_SCENARIOS.map((preset) => {
                    const isCurrent = telemetry.userType === preset.name;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset.name)}
                        className={`w-full text-left p-3 rounded-xl transition-all border ${
                          isCurrent
                            ? "bg-slate-800/50 border-red-500 shadow-md shadow-red-950/20"
                            : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/30"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-slate-200">{preset.name.split(" (")[0]}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {preset.name.split(" (")[1]?.replace(")", "") || ""}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-500" /> {preset.heartRate} BPM
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-red-400" /> Mov: {preset.movement}
                          </span>
                          {preset.fallDetected && (
                            <span className="text-[10px] font-mono bg-red-950/60 text-red-400 px-1.5 rounded font-medium border border-red-900/30">
                              Fall
                            </span>
                          )}
                          {preset.sos && (
                            <span className="text-[10px] font-mono bg-red-950/60 text-red-400 px-1.5 rounded font-medium animate-pulse border border-red-900/30">
                              SOS Button
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hardware Wearable Sensor Emulator */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <Smartphone className="w-12 h-12 text-slate-800/20 rotate-12" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
                      Wearable IoT Emulator
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                    ESP32-S3 Board
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-5">
                  Simulate live hardware changes in real time. Adjust sensor parameters below to test custom emergency bounds.
                </p>

                <div className="space-y-4">
                  
                  {/* Heart Rate Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/10" />
                        Cardiovascular Heart Rate
                      </span>
                      <span className="font-mono text-white font-semibold">{telemetry.heartRate} BPM</span>
                    </div>
                    <input
                      type="range"
                      min="35"
                      max="180"
                      value={telemetry.heartRate}
                      onChange={(e) => setTelemetry({ ...telemetry, heartRate: parseInt(e.target.value) })}
                      className="w-full accent-red-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                      <span>Bradycardia (≤50)</span>
                      <span>Nominal (60-100)</span>
                      <span>Tachycardia (≥110)</span>
                    </div>
                  </div>

                  {/* Body Temp Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                        Skin Temp Threshold
                      </span>
                      <span className="font-mono text-white font-semibold">{telemetry.bodyTemp} °C</span>
                    </div>
                    <input
                      type="range"
                      min="34"
                      max="41"
                      step="0.1"
                      value={telemetry.bodyTemp}
                      onChange={(e) => setTelemetry({ ...telemetry, bodyTemp: parseFloat(e.target.value) })}
                      className="w-full accent-orange-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Battery Level */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        Battery Level (ESP32)
                      </span>
                      <span className="font-mono text-white font-semibold">{telemetry.batteryLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={telemetry.batteryLevel}
                      onChange={(e) => setTelemetry({ ...telemetry, batteryLevel: parseInt(e.target.value) })}
                      className="w-full accent-emerald-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Accelerometer Movement Toggle dropdown */}
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">
                      Accelerometer Movement State
                    </label>
                    <select
                      value={telemetry.movement}
                      onChange={(e) => setTelemetry({ ...telemetry, movement: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-2 text-slate-300 focus:outline-none focus:border-red-500 font-mono"
                    >
                      <option value="None">None (Immobilized / Unconscious)</option>
                      <option value="Sluggish">Sluggish (Struggling / Minor spasm)</option>
                      <option value="Moderate">Moderate (Walking / Standard commute)</option>
                      <option value="Active">Active (Running / Physical exercise)</option>
                    </select>
                  </div>

                  {/* Geofence Simulator Labels */}
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">
                      Location Environment Preset
                    </label>
                    <input
                      type="text"
                      value={telemetry.locationLabel}
                      onChange={(e) => setTelemetry({ ...telemetry, locationLabel: e.target.value })}
                      placeholder="e.g., Bedroom, Train Station, Scaffold Area"
                      className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-2 text-slate-300 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  {/* Double switches on bottom */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    
                    {/* Fall Detected Switch */}
                    <button
                      type="button"
                      onClick={() => setTelemetry({ ...telemetry, fallDetected: !telemetry.fallDetected })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        telemetry.fallDetected
                          ? "bg-red-950/40 border-red-600 text-red-300 shadow-md shadow-red-950/50"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <AlertTriangle className={`w-5 h-5 mb-1 ${telemetry.fallDetected ? "text-red-400 animate-bounce" : ""}`} />
                      <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
                        Impact Fall
                      </span>
                      <span className="text-[9px] font-mono mt-0.5">
                        {telemetry.fallDetected ? "TRIGGERED (9.2G)" : "NOMINAL STATE"}
                      </span>
                    </button>

                    {/* Manual SOS Panic button switch */}
                    <button
                      type="button"
                      onClick={() => setTelemetry({ ...telemetry, sos: !telemetry.sos })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        telemetry.sos
                          ? "bg-red-950/40 border-red-600 text-red-300 shadow-md shadow-red-950/50"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Zap className={`w-5 h-5 mb-1 ${telemetry.sos ? "text-red-400 animate-pulse" : ""}`} />
                      <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
                        Manual SOS
                      </span>
                      <span className="text-[9px] font-mono mt-0.5">
                        {telemetry.sos ? "PRESSED ON" : "NOMINAL STATE"}
                      </span>
                    </button>

                  </div>

                  {/* Core CTA: Analyze with Lemma SDK */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAnalyzeTelemetry}
                      disabled={analyzing}
                      className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] transition-all rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 disabled:opacity-55 cursor-pointer"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          <span>AI Evaluation Processing...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-4.5 h-4.5 text-white" />
                          <span>Transmit Live Telemetry to AI</span>
                        </>
                      )}
                    </button>
                    <div className="text-[10px] text-slate-500 text-center mt-1.5 font-mono">
                      Updates both local state machine and historical databases.
                    </div>
                  </div>

                </div>
              </div>

            </section>

            {/* Column Center & Right: Live Safety Evaluation HUD & Location Radar (8/12 grid) */}
            <section className="lg:col-span-8 space-y-6">
              
              {/* Prominent Emergency SOS Panic Button Card */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 blur-2xl rounded-full" />
                
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
                  <div className="text-center sm:text-left space-y-1">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span className="text-[11px] font-mono tracking-widest text-red-400 uppercase font-bold">1-Click Emergency Hotkey</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 font-display">Instant Emergency SOS Button</h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                      Pressing this forces system telemetry to critical, triggers active siren audios, notifies nearest security patrols, and broadcasts tracking GPS links to your responders.
                    </p>
                  </div>

                  <div className="shrink-0 relative">
                    {/* Glowing background circles for SOS */}
                    <div className="absolute -inset-2 bg-red-600/20 rounded-full blur animate-pulse" />
                    <button
                      id="sos-panic-button"
                      onClick={handleTriggerInstantSOS}
                      disabled={analyzing || telemetry.sos}
                      className={`w-24 h-24 rounded-full font-display font-black text-lg tracking-widest flex items-center justify-center transition-all duration-300 relative border cursor-pointer active:scale-95 select-none ${
                        telemetry.sos
                          ? "bg-gradient-to-br from-red-600 to-red-700 text-white border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-bounce"
                          : "bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white border-red-500/50 hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]"
                      }`}
                    >
                      {telemetry.sos ? "SOS ON" : "SOS"}
                    </button>
                  </div>
                </div>

                {/* Voice SOS Activation Panel */}
                <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mic className={`w-4 h-4 ${voiceSOSActive ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
                        <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                          Voice SOS Activation HUD
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Speak a critical safe-word directly to trigger instant hands-free system-wide SOS broadcast.
                      </p>
                    </div>

                    <div className="shrink-0">
                      {speechSupported ? (
                        <button
                          type="button"
                          onClick={voiceSOSActive ? stopVoiceSOSListener : startVoiceSOSListener}
                          className={`w-full sm:w-auto px-4 py-1.5 rounded-xl border text-[11px] font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            voiceSOSActive
                              ? "bg-red-950/40 border-red-500/60 text-red-400 hover:bg-red-950/70"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${voiceSOSActive ? "bg-red-500 animate-ping" : "bg-slate-600"}`} />
                          {voiceSOSActive ? "🎙️ LISTENING ON" : "🎙️ MIC START"}
                        </button>
                      ) : (
                        <div className="text-[10px] bg-slate-950 border border-slate-800 text-slate-500 px-3 py-1.5 rounded-xl font-mono">
                          ⚠️ Voice API Unsupported
                        </div>
                      )}
                    </div>
                  </div>

                  {speechSupported && (
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          Trigger Phrases: <strong className="text-slate-300">"SOS", "Help", "Emergency", "Danger", "Save me"</strong>
                        </span>
                        {voiceSOSActive && (
                          <span className="text-emerald-500 flex items-center gap-1 animate-pulse">
                            ● Microphone Active
                          </span>
                        )}
                      </div>

                      {speechError && (
                        <div className="text-[10px] text-amber-500 bg-amber-950/20 border border-amber-900/30 p-2 rounded-lg font-mono">
                          {speechError}
                        </div>
                      )}

                      {voiceSOSActive && (
                        <div className="bg-slate-900 border border-slate-850 p-2 rounded-xl">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">
                            Live Transcript Feed:
                          </span>
                          <p className="text-xs font-mono text-slate-300 italic min-h-[1.2rem] break-words">
                            "{voiceTranscript || "Silent..."}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {telemetry.sos && (
                  <div className="mt-4 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-center text-xs text-red-400 font-mono animate-pulse">
                    ⚠️ SYSTEM-WIDE SOS STATE ACTIVATED. Caretaker and Security Dispatch have been notified.
                  </div>
                )}
              </div>

              {/* Emergency Alert Header HUD */}
              <div className={`p-6 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${currentStyle.bg}`}>
                
                {/* Background high-tech visual overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent)] pointer-events-none" />

                {/* Left vertical indicator accent bar */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${analysis.emergency ? currentStyle.pulse : "bg-emerald-500"}`} />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                        Current Live Threat Evaluation
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${currentStyle.badge}`}>
                        CONFIDENCE: {analysis.confidence}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-bold tracking-tight text-white font-display">
                        {analysis.emergency ? "CRITICAL EMERGENCY DETECTED" : "NOMINAL SYSTEM STATUS"}
                      </h2>
                      <span className={`w-3 h-3 rounded-full ${analysis.emergency ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                    </div>

                    <p className="text-sm font-mono text-slate-300">
                      Profile Active: <strong className="text-white">{telemetry.userType}</strong>
                    </p>
                  </div>

                  <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                    <div className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[120px] text-center ${currentStyle.iconBg}`}>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Severity Level</span>
                      <span className={`text-lg font-bold tracking-tight font-display uppercase ${currentStyle.light}`}>
                        {analysis.emergency ? analysis.severity : "NOMINAL"}
                      </span>
                    </div>
                    
                    <div className="px-4 py-2 bg-slate-950/80 border border-slate-850 rounded-xl text-center min-w-[120px]">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Safety geofence</span>
                      <span className={`text-xs font-bold block ${
                        analysis.safeZoneStatus === "Safe" ? "text-emerald-400" :
                        analysis.safeZoneStatus === "Caution" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {analysis.safeZoneStatus || "Safe"} Status
                      </span>
                    </div>
                  </div>

                </div>

                {/* AI Explanation Text Card */}
                <div className="mt-5 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4.5 h-4.5 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-500 font-mono">
                      Lemma AI Decision Explanation
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {analysis.reason}
                  </p>
                </div>

                {/* Quick actions box */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-850">
                      <Radio className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">Executed System Action</span>
                      <span className="text-xs text-slate-300 font-mono font-semibold">{analysis.action}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Visual Siren Sound Waveform Status */}
                    {analysis.emergency && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-900/40 rounded-lg text-[10px] font-mono text-red-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${buzzerActive ? "bg-red-500 animate-ping" : "bg-slate-500"}`} />
                        <span className="font-semibold tracking-wide">{buzzerActive ? "🔊 SIREN ALERT ACTIVE" : "🔇 SIREN MUTED"}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setBuzzerActive(!buzzerActive);
                        // Force resume of web audio context on direct interaction
                        try {
                          if (sirenRef.current.audioCtx && sirenRef.current.audioCtx.state === "suspended") {
                            sirenRef.current.audioCtx.resume();
                          }
                        } catch (e) {}
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        buzzerActive
                          ? "bg-red-950/40 hover:bg-red-950/70 border-red-800 text-red-300"
                          : "bg-slate-950 hover:bg-slate-900 border-slate-850 text-slate-400 hover:text-white"
                      }`}
                    >
                      {buzzerActive ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          <span>Mute Siren Alarm</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                          <span>Unmute Siren Alarm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Grid split: SVG Map Simulation and Emergency Contacts Broadcast Module */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual SVG Map & Radar Coordinate Grid */}
                <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col">
                  
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
                        Simulated Live GPS Map
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      Gps Locked (3D)
                    </span>
                  </div>

                  {/* SVG Map Grid Visualizer */}
                  <div className="relative w-full aspect-square bg-[#08090f] rounded-2xl border border-slate-950 overflow-hidden group">
                    
                    {/* SVG Vector Background Lines representing streets / grid blocks */}
                    <svg className="absolute inset-0 w-full h-full text-slate-900" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {/* Simulated Diagonal Street Channels */}
                      <line x1="0" y1="20%" x2="100%" y2="80%" stroke="#141829" strokeWidth="2" />
                      <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#141829" strokeWidth="2.5" />
                      <line x1="0" y1="90%" x2="100%" y2="10%" stroke="#111524" strokeWidth="1.5" />
                      
                      {/* Safe Geofence bounds */}
                      <circle cx="50%" cy="50%" r="25%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                      <circle cx="50%" cy="50%" r="55%" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" strokeOpacity="0.3" />
                    </svg>

                    {/* Dynamic Geofence Visual Rings around the target marker */}
                    <div
                      style={{ left: `${mapOffsetX}%`, top: `${mapOffsetY}%` }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      {analysis.emergency ? (
                        <>
                          <div className="w-16 h-16 rounded-full border border-red-500 absolute -left-8 -top-8 animate-radar"></div>
                          <div className="w-32 h-32 rounded-full border border-red-500/30 absolute -left-16 -top-16 animate-radar" style={{ animationDelay: "0.5s" }}></div>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-emerald-500/20 absolute -left-5 -top-5 animate-ping"></div>
                      )}

                      {/* Actual User Marker dot */}
                      <div className={`w-4.5 h-4.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${analysis.emergency ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                    </div>

                    {/* Dynamic Coordinates HUD Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/95 border border-slate-850 p-2.5 rounded-xl text-[10px] font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">USER PROFILE:</span>
                        <span className="text-slate-300 font-semibold">{telemetry.userType.split(" (")[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">COORDINATES:</span>
                        <span className="text-red-400">{telemetry.latitude.toFixed(6)}, {telemetry.longitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ENV TAG:</span>
                        <span className="text-emerald-400 font-semibold uppercase">{telemetry.locationLabel}</span>
                      </div>
                    </div>

                    {/* Informative Help Text */}
                    <div className="absolute top-2 right-2 bg-slate-950/80 text-[9px] px-2 py-0.5 rounded border border-slate-850 text-slate-400">
                      Interactive Map Simulation
                    </div>

                  </div>

                  {/* Move on Map quick simulation tool */}
                  <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-900 text-[11px] space-y-1.5">
                    <span className="text-slate-400 block font-mono font-medium">Fine-tune Position Coordinates:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono">LATITUDE</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={telemetry.latitude}
                          onChange={(e) => setTelemetry({ ...telemetry, latitude: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 font-mono focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono">LONGITUDE</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={telemetry.longitude}
                          onChange={(e) => setTelemetry({ ...telemetry, longitude: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 font-mono focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Location Sharing & Geofencing Status */}
                  <div className="mt-4 pt-3.5 border-t border-slate-900/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400">
                        <Share2 className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        <span>LIVE LOCATION SHARING</span>
                      </div>
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30 font-mono">
                        ACTIVE SECURE CHANNEL
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-sans leading-normal">
                      Caretakers and local responders can trace your absolute coordinate progress in real-time during panic triggers.
                    </p>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        copiedLink
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                          : "bg-slate-950 hover:bg-slate-900 border-slate-850 text-slate-300 hover:text-white"
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                          <span>Copied Tracking PIN Link!</span>
                        </>
                      ) : (
                        <>
                          <Share className="w-3.5 h-3.5 text-slate-400" />
                          <span>Generate Shared Safety Link</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* Emergency Broadcaster System Card */}
                <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-red-500" />
                        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
                          Safety Broadcast Desk
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-red-400">
                        Multi-Channel Link
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4">
                      When SentinelX flags an emergency, dispatch customized cellular SMS, automated voice-synthesizer alerts, and warning updates to these contacts instantly:
                    </p>

                    {/* Contacts toggle checklist */}
                    <div className="space-y-2 mb-4">
                      {contacts.map((contact, idx) => (
                        <div
                          key={contact.name}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            contact.enabled
                              ? "bg-slate-950 border-slate-850 text-slate-200"
                              : "bg-slate-950/40 border-slate-900/50 text-slate-600"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={contact.enabled}
                              onChange={() => handleToggleContact(idx)}
                              className="mt-0.5 accent-red-500 h-3.5 w-3.5 cursor-pointer rounded bg-slate-900 border-slate-800"
                            />
                            <div>
                              <span className="font-semibold block">{contact.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{contact.relation} | {contact.phone}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Voice Readout TTS Control panel */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Megaphone className={`w-3.5 h-3.5 ${ttsEnabled ? "text-red-400" : "text-slate-500"}`} />
                          <span className="text-xs font-semibold text-slate-300">Voice Announcement</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTtsEnabled(!ttsEnabled)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                            ttsEnabled
                              ? "bg-red-950/40 border-red-900/60 text-red-300 hover:bg-red-950/70"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {ttsEnabled ? "🔊 ON" : "🔇 OFF"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Uses the browser's Web Speech API to read aloud the emergency warning reason to responders during broadcasts.
                      </p>
                      {analysis.emergency && analysis.reason && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => speakEmergencyReason(`Warning. ${analysis.reason}`)}
                            disabled={!ttsEnabled}
                            className={`flex-1 py-1 px-2.5 rounded-lg border text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSpeaking
                                ? "bg-red-600 border-red-500 text-white animate-pulse"
                                : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 disabled:opacity-40"
                            }`}
                          >
                            <Mic className="w-3 h-3" />
                            {isSpeaking ? "Speaking Reason..." : "Speak Reason Aloud"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto">
                    
                    {/* Send Broadcast CTA Button */}
                    <button
                      type="button"
                      onClick={handleTriggerBroadcast}
                      disabled={broadcasting || !analysis.emergency}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] transition-all rounded-xl text-white font-semibold cursor-pointer text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {broadcasting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching Cellular Satellites...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Dispatch Broadcast Sequence Now</span>
                        </>
                      )}
                    </button>

                    {/* Broadcast Logs feedback */}
                    {broadcastDone && (
                      <div className="bg-slate-950 border border-emerald-950/60 p-3.5 rounded-xl text-xs space-y-2 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          CELLULAR SATELLITE DISPATCH COMPLETED
                        </div>
                        <div className="space-y-1 divide-y divide-slate-900 text-[10px] font-mono text-slate-300">
                          {broadcastLogs.map((log) => (
                            <div key={log.name} className="pt-1 first:pt-0">
                              <div className="font-medium text-white">{log.name}:</div>
                              <div className="flex gap-2 text-slate-500">
                                {log.channels.map((ch) => (
                                  <span key={ch.type}>
                                    {ch.type}: <strong className="text-emerald-400">{ch.status}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!analysis.emergency && (
                      <div className="text-[10px] text-slate-500 font-mono text-center">
                        * Broadcast disabled: System telemetry is currently green & safe.
                      </div>
                    )}

                  </div>

                </div>

              </div>

              {/* Responder Smart Checklist Recommendations */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-500" />
                    <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
                      AI Generated Responder Checklist
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Smart Guard Manual Tasks
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4 font-mono">
                  These actionable protocols are formulated specifically by the AI decision model based on the live physical telemetry. Ensure they are executed immediately:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {analysis.recommendations.map((rec, idx) => {
                    const isChecked = !!completedRecommendations[rec];
                    return (
                      <div
                        key={idx}
                        onClick={() => setCompletedRecommendations({
                          ...completedRecommendations,
                          [rec]: !isChecked
                        })}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? "bg-emerald-950/10 border-emerald-800/80 text-emerald-300/90"
                            : "bg-slate-950 border-slate-900 text-slate-300 hover:border-slate-800"
                        }`}
                      >
                        <div className={`mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                          isChecked ? "bg-emerald-600 border-emerald-500" : "bg-slate-900 border-slate-800 w-4 h-4"
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`leading-relaxed ${isChecked ? "line-through text-slate-500" : ""}`}>
                          {rec}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
                  <span>Task Protocol Completion:</span>
                  <span className="font-mono font-semibold text-white">
                    {Object.values(completedRecommendations).filter(Boolean).length} of {analysis.recommendations.length} Resolved
                  </span>
                </div>
              </div>

            </section>

          </div>
          </div>
        )}

        {/* Alarm & Incident History Log Tab */}
        {activeTab === "history" && (
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-850 gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold font-display text-white">
                  Telemetry Incident & Alarm Logs
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Historical database of safety breaches, sensor alerts, and automated Lemma SDK evaluations.
                </p>
              </div>

              <button
                onClick={fetchAlertHistory}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all self-start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Refresh Database
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm">No historical safety alarms stored on this workspace node.</p>
                <p className="text-xs">Trigger safety tests on the dashboard to register incident reports.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((log) => {
                  const logStyle = getSeverityStyle(log.analysis.emergency ? log.analysis.severity : "low");
                  const timestampFormatted = new Date(log.timestamp).toLocaleString();
                  const isResolving = resolvingId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`p-5 rounded-2xl border bg-slate-950/80 transition-all relative ${
                        log.resolved ? "border-slate-850 opacity-80" : "border-red-900/60 shadow-lg shadow-red-950/5"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        
                        {/* Core details */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500">
                              {timestampFormatted}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold border ${logStyle.badge}`}>
                              {log.analysis.severity} RISK
                            </span>
                            
                            {log.resolved ? (
                              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" />
                                RESOLVED
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900 animate-pulse">
                                ACTIVE INCIDENT
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-semibold text-white">
                            {log.userType}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 text-red-500" /> {log.heartRate} BPM
                            </span>
                            <span className="flex items-center gap-1">
                              <Thermometer className="w-3.5 h-3.5 text-orange-500" /> {log.bodyTemp} °C
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-red-400" /> Mov: {log.movement}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lat: {log.latitude.toFixed(4)}, Lng: {log.longitude.toFixed(4)}
                            </span>
                          </div>

                          {/* Reason detail */}
                          <div className="mt-3 text-xs text-slate-300 p-2.5 bg-slate-900 border border-slate-850 rounded-xl">
                            <strong className="text-red-400 font-mono block mb-1">AI ANALYSIS DIAGNOSTIC:</strong>
                            {log.analysis.reason}
                          </div>

                          {/* If resolved, show notes */}
                          {log.resolved && (
                            <div className="mt-2.5 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-xl">
                              <strong>Resolution Notes:</strong> {log.notes || "Resolved safely."}
                              {log.resolvedAt && (
                                <span className="block text-[10px] text-slate-500 font-mono mt-1">
                                  Resolved At: {new Date(log.resolvedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Actions column on right */}
                        <div className="shrink-0 flex items-center md:items-end flex-row md:flex-col justify-end gap-2">
                          
                          {!log.resolved && !isResolving && (
                            <button
                              onClick={() => setResolvingId(log.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-all text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-950/30"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Resolve Incident
                            </button>
                          )}

                          {isResolving && (
                            <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl max-w-sm space-y-2">
                              <label className="block text-[11px] font-mono text-slate-400">
                                Enter Closeout & Safety Verification Notes:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Grandma is fine, helped up safely."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-red-500"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setResolvingId(null)}
                                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleResolveAlert(log.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded-lg font-semibold cursor-pointer"
                                >
                                  Submit Resolution
                                </button>
                              </div>
                            </div>
                          )}

                          <span className="text-[10px] text-slate-600 font-mono">
                            ID: {log.id}
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Safety Chatbot Tab */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold font-display text-white mb-2">
                Empathetic AI Safety Chatbot
              </h2>
              <p className="text-sm text-slate-400">
                SentinelX AI Guardian provides telemetry-aware assistance, first-aid tips, and stressful event de-escalation guidelines in real time.
              </p>
            </div>
            <AIChatbot telemetry={telemetry} contacts={contacts} />
          </div>
        )}

        {/* Incident Reporting Tab */}
        {activeTab === "incidents" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold font-display text-white mb-2">
                Incident Hazard Reporting Network
              </h2>
              <p className="text-sm text-slate-400">
                Directly report physical or health hazards to coordinate community safety actions and keep first responders informed.
              </p>
            </div>
            <IncidentReporting telemetry={telemetry} currentUser={currentUser} onNewIncidentReported={fetchAlertHistory} />
          </div>
        )}

        {/* Admin Panel Tab */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold font-display text-white mb-2">
                Administrator Command Deck
              </h2>
              <p className="text-sm text-slate-400">
                Coordinate alert responses, tweak strict safety limits, register responder contacts, and audit system logs.
              </p>
            </div>
            <AdminPanel
              contacts={contacts}
              onToggleContact={handleToggleContact}
              onUpdateContacts={(updated) => setContacts(updated)}
              telemetryHistory={history}
              onResolveTelemetryAlert={async (id, notes) => {
                try {
                  const response = await fetch(`/api/alerts/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes })
                  });
                  if (response.ok) {
                    fetchAlertHistory();
                  }
                } catch (err) {
                  console.error("Failed to resolve alert", err);
                }
              }}
              onRefreshAlerts={fetchAlertHistory}
            />
          </div>
        )}

        {/* Technical Architecture overview for Presentation Tab */}
        {activeTab === "architecture" && (
          <div className="space-y-6">
            
            {/* Main technical intro */}
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold font-display text-white mb-2">
                SentinelX Technical Architecture & Flow
              </h2>
              <p className="text-sm text-slate-400">
                A robust combination of custom firmware simulations, Node.js state machines, and Gemini LLM decision logic acting as the dynamic Lemma AI core.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                
                {/* Step 1 */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-2 relative">
                  <div className="absolute top-0 right-0 p-3 text-red-500/20 font-bold text-3xl font-mono">
                    01
                  </div>
                  <div className="p-2 bg-red-950/40 text-red-400 w-fit rounded-xl border border-red-900/40">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">Hardware Telemetry Acquisition</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Wearable sensors continuously capture pulse waves (MAX30102), accelerometer impact rates (MPU6050), and GPS coordinate packages. Raw frames compile onto ESP32.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-2 relative">
                  <div className="absolute top-0 right-0 p-3 text-red-500/20 font-bold text-3xl font-mono">
                    02
                  </div>
                  <div className="p-2 bg-red-950/40 text-red-400 w-fit rounded-xl border border-red-900/40">
                    <CpuIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">Gemini AI / Lemma SDK Analysis</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instead of fragile static threshold rules, multi-axial metrics are transmitted to the cloud. Gemini assesses physical signals holistically according to active profile biases.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-2 relative">
                  <div className="absolute top-0 right-0 p-3 text-red-500/20 font-bold text-3xl font-mono">
                    03
                  </div>
                  <div className="p-2 bg-red-950/40 text-red-400 w-fit rounded-xl border border-red-900/40">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">Ecosystem Dispatch & Alerting</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If threat levels trigger, alerts broadcast via automated cellular voice calls, SMS, and emails. First-responders obtain precise GPS coordinates with situational checklists.
                  </p>
                </div>

              </div>
            </div>

            {/* Structured Schema Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* API Input payload */}
              <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 shadow-xl font-mono text-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 font-semibold uppercase font-display text-sm">
                    JSON Input Telemetry Schema
                  </span>
                  <span className="bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-850 text-[10px] text-slate-500">
                    POST /api/analyze-emergency
                  </span>
                </div>
                <pre className="bg-slate-950/90 border border-slate-850 p-4 rounded-xl overflow-x-auto text-red-400">
{`{
  "userType": "Women Safety (Sophia)",
  "heartRate": 125,
  "bodyTemp": 37.2,
  "fallDetected": false,
  "sos": true,
  "movement": "Moderate",
  "latitude": 37.7694,
  "longitude": -122.4418,
  "batteryLevel": 94
}`}
                </pre>
                <div className="text-[10px] text-slate-500 mt-2">
                  * Hardware-agnostic JSON payload transmitted over TLS channels.
                </div>
              </div>

              {/* API Output schema */}
              <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 shadow-xl font-mono text-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 font-semibold uppercase font-display text-sm">
                    Structured AI output Schema
                  </span>
                  <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900 text-[10px]">
                    Lemma SDK Output
                  </span>
                </div>
                <pre className="bg-slate-950/90 border border-slate-850 p-4 rounded-xl overflow-x-auto text-emerald-400">
{`{
  "emergency": true,
  "severity": "Critical",
  "confidence": 98,
  "reason": "Manual SOS with elevated panic heart rate.",
  "action": "Initiating cellular network tracking...",
  "recommendations": [
    "Call emergency contacts immediately.",
    "Open direct microphone audio streaming.",
    "Dispatch closest neighborhood guardian team."
  ],
  "safeZoneStatus": "HighRisk"
}`}
                </pre>
                <div className="text-[10px] text-slate-500 mt-2">
                  * Assured exact type compatibility matching Google AI Studio prompt specifications.
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-900 bg-[#08090f] py-8 px-4 text-center text-slate-500 text-xs mt-12 font-mono">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>
            SentinelX Safe-System Ecosystem Node | Developed for Google AI Studio Hackathon Presentation
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-600">
            <span>Framework: React 19 / Express Full-Stack</span>
            <span>•</span>
            <span>Decision Logic: Gemini 3.5 Flash via Server-Side Agent</span>
            <span>•</span>
            <span>Persistence: In-Memory Telemetry Database</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Temporary custom inline icon since Lucide changes can be tricky
function CpuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 15h3" />
      <path d="M1 9h3" />
      <path d="M1 15h3" />
    </svg>
  );
}

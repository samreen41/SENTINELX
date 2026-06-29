import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard lazy initialization of GoogleGenAI SDK as per security and key resilience instructions.
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not configured or holds default values. Fallback Mock response will be used.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-Memory Database for Hackathon Simulation State
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
  analysis: {
    emergency: boolean;
    severity: string;
    confidence: number;
    reason: string;
    action: string;
    recommendations: string[];
    safeZoneStatus: string;
  };
  resolved: boolean;
  resolvedAt?: string;
  notes?: string;
}

const telemetryHistory: TelemetryLog[] = [
  {
    id: "hist-1",
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
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
      reason: "Fall detected with near-zero movement. Heart rate is low but steady.",
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
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
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
      reason: "Manual SOS triggered. Heart rate is highly elevated suggesting panic/distress.",
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

interface IncidentReport {
  id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  timestamp: string;
  reportedBy: string;
  resolved: boolean;
  notes?: string;
}

const incidentReports: IncidentReport[] = [
  {
    id: "rep-1",
    title: "Suspicious individual spotted on trail",
    category: "Physical Threat",
    severity: "Medium",
    description: "An unknown person was hanging around the entrance of the commuter trail route looking at people's belongings.",
    latitude: 37.7694,
    longitude: -122.4418,
    locationLabel: "Dark Transit Corridor Alley",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    reportedBy: "Sophia (Night Commute)",
    resolved: true,
    notes: "Security sweep was requested and completed. Patrol did not locate any active threat."
  },
  {
    id: "rep-2",
    title: "Slippery wet metal grid on platform B",
    category: "Other",
    severity: "High",
    description: "Marcus noted that the rain has created a very slick, hazardous surface on the scaffold metal grids. Needs hazard cones immediately.",
    latitude: 37.7858,
    longitude: -122.4012,
    locationLabel: "High-Altitude Scaffold Wing B",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    reportedBy: "Marcus (Site Safety)",
    resolved: false
  }
];

const registeredUsers: any[] = [
  { email: "mdsamreenmohammad@gmail.com", fullName: "Samreen Mohammad", phone: "+1 (555) 123-9876", emergencyContactName: "Clara (Daughter)", emergencyContactPhone: "+1 (555) 321-4567" }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Heartbeat / Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Analyze Sensor Telemetry with Gemini (Lemma SDK replica)
  app.post("/api/analyze-emergency", async (req, res) => {
    const {
      heartRate,
      bodyTemp,
      fallDetected,
      sos,
      movement,
      latitude,
      longitude,
      batteryLevel,
      userType
    } = req.body;

    console.log(`[SentinelX Backend] Received telemetry analysis request for profile: ${userType}`);

    const runRuleBasedFallback = () => {
      let emergency = false;
      let severity = "Low";
      let confidence = 50;
      let reason = "Normal physiological status detected.";
      let action = "No response required.";
      let recommendations: string[] = ["Continue routine monitoring."];
      let safeZoneStatus = "Safe";

      if (sos) {
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
      } else if (fallDetected && movement === "None") {
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
      } else if (fallDetected) {
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
      } else if (heartRate > 140 || heartRate < 45) {
        emergency = true;
        severity = "Medium";
        confidence = 85;
        reason = `Physiological anomaly detected. Heart rate is critically off-scale: ${heartRate} BPM.`;
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
        reason: `[AI Fallback Mode] ${reason}`,
        action,
        recommendations,
        safeZoneStatus
      };
    };

    // If key is empty or undefined, use fallback mock logic to ensure robust presentation
    const apiKey = process.env.GEMINI_API_KEY;
    const isMock = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "";

    if (isMock) {
      return res.json(runRuleBasedFallback());
    }

    try {
      const client = getGeminiClient();

      // Structure a rich, informative prompt for the Gemini 3.5 Flash Model
      const prompt = `
        You are the SentinelX AI Emergency Decision Engine (functioning as the safety-response core).
        Evaluate the following real-time wearable IoT sensor payload for safety anomalies:
        - Target User Profile Context: ${userType}
        - Heart Rate: ${heartRate} BPM
        - Body Temperature: ${bodyTemp}°C
        - Impact Sensor (Fall Detected): ${fallDetected ? "YES" : "NO"}
        - Manual SOS Panic Button: ${sos ? "YES" : "NO"}
        - Accelerometer Activity Level (Movement): ${movement}
        - GPS Coordinates: Latitude ${latitude}, Longitude ${longitude}
        - Wearable Battery Status: ${batteryLevel}%

        Evaluate the emergency status. Consider the context:
        - For "Elderly Care", a fall is extremely high risk even with movement. Low movement and low heart rate could indicate unconsciousness.
        - For "Women Safety", a manual SOS or rapid heart rate without falling is a highly critical stalker/threat panic indicator.
        - For "Construction Worker", high impact falls with moderate heart rates suggest trauma.
        - Normal resting heart rate is 60-100 BPM. Normal body temperature is 36.1-37.2°C.

        Analyze the situation holistically. Do not rely on simplistic thresholds alone (e.g. high heart rate could be workout, but if combined with a fall, it represents immediate shock). Determine if this is an actual emergency, assign a severity level (Low, Medium, High, Critical), assign a confidence percentage, and suggest immediate actions and rescue recommendations.
      `;

      let responseText = "";
      try {
        console.log("[SentinelX] Attempting primary evaluation with gemini-3.5-flash...");
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are the SentinelX Intelligent AI Safety Engine. You must return analysis in absolute valid JSON that adheres strictly to the provided response schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emergency: {
                  type: Type.BOOLEAN,
                  description: "True if user is in danger or needs assistance, otherwise False."
                },
                severity: {
                  type: Type.STRING,
                  description: "Critical safety level of this scenario. Must be one of: Low, Medium, High, Critical."
                },
                confidence: {
                  type: Type.INTEGER,
                  description: "Percentage score of safety anomaly detection certainty (0 to 100)."
                },
                reason: {
                  type: Type.STRING,
                  description: "A clear, concise, professional clinical and situational analysis of the sensor states."
                },
                action: {
                  type: Type.STRING,
                  description: "The primary action that SentinelX system must execute immediately (e.g. notify contact, alert emergency ward)."
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 actionable steps for caretakers, responders, or the user to handle this crisis."
                },
                safeZoneStatus: {
                  type: Type.STRING,
                  description: "Calculated geofence/safety status of the current location. Must be one of: Safe, Caution, HighRisk."
                }
              },
              required: [
                "emergency",
                "severity",
                "confidence",
                "reason",
                "action",
                "recommendations",
                "safeZoneStatus"
              ]
            }
          }
        });
        responseText = response.text || "";
      } catch (primaryErr: any) {
        console.warn("Gemini 3.5 Flash Model evaluation failed or experiencing high demand, retrying with gemini-3.1-flash-lite. Error details:", primaryErr);
        
        const response = await client.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            systemInstruction: "You are the SentinelX Intelligent AI Safety Engine. You must return analysis in absolute valid JSON that adheres strictly to the provided response schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emergency: {
                  type: Type.BOOLEAN,
                  description: "True if user is in danger or needs assistance, otherwise False."
                },
                severity: {
                  type: Type.STRING,
                  description: "Critical safety level of this scenario. Must be one of: Low, Medium, High, Critical."
                },
                confidence: {
                  type: Type.INTEGER,
                  description: "Percentage score of safety anomaly detection certainty (0 to 100)."
                },
                reason: {
                  type: Type.STRING,
                  description: "A clear, concise, professional clinical and situational analysis of the sensor states."
                },
                action: {
                  type: Type.STRING,
                  description: "The primary action that SentinelX system must execute immediately (e.g. notify contact, alert emergency ward)."
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 actionable steps for caretakers, responders, or the user to handle this crisis."
                },
                safeZoneStatus: {
                  type: Type.STRING,
                  description: "Calculated geofence/safety status of the current location. Must be one of: Safe, Caution, HighRisk."
                }
              },
              required: [
                "emergency",
                "severity",
                "confidence",
                "reason",
                "action",
                "recommendations",
                "safeZoneStatus"
              ]
            }
          }
        });
        responseText = response.text || "";
      }

      if (!responseText) {
        throw new Error("Empty text returned from Gemini API.");
      }

      const parsedAnalysis = JSON.parse(responseText.trim());
      res.json(parsedAnalysis);
    } catch (error: any) {
      console.error("Gemini API Emergency Analysis Failure, activating local emergency rule-engine backup:", error);
      // Ensure the endpoint NEVER fails. Serve the computed ruleset safely.
      const fallbackResult = runRuleBasedFallback();
      fallbackResult.reason = `[AI Offline Fallback Engine] ${fallbackResult.reason.replace("[AI Fallback Mode] ", "")}`;
      res.json(fallbackResult);
    }
  });

  // API Route: Get Telemetry and Alert History
  app.get("/api/alerts", (req, res) => {
    res.json(telemetryHistory);
  });

  // API Route: Log a new alert/telemetry snapshot
  app.post("/api/alerts", (req, res) => {
    const { telemetry, analysis } = req.body;
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
      analysis,
      resolved: false
    };

    telemetryHistory.unshift(newLog); // prepend to history
    res.status(201).json(newLog);
  });

  // API Route: Resolve an alert
  app.put("/api/alerts/:id", (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const alertIndex = telemetryHistory.findIndex((item) => item.id === id);
    if (alertIndex !== -1) {
      telemetryHistory[alertIndex].resolved = true;
      telemetryHistory[alertIndex].resolvedAt = new Date().toISOString();
      telemetryHistory[alertIndex].notes = notes || "Resolved by operator.";
      return res.json(telemetryHistory[alertIndex]);
    }

    res.status(404).json({ error: "Alert not found." });
  });

  // API Route: Simulate Alert Broadcast Delivery
  app.post("/api/send-alerts", (req, res) => {
    const { alertId, contacts } = req.body;
    console.log(`[SentinelX SMS Broadcast] Dispatched safety alerts for Event ID: ${alertId}`);

    const logs = contacts.map((c: any) => ({
      name: c.name,
      phone: c.phone,
      relation: c.relation,
      channels: [
        { type: "SMS", status: "Delivered", timestamp: new Date().toLocaleTimeString() },
        { type: "Email", status: "Sent", timestamp: new Date().toLocaleTimeString() },
        { type: "Automated Call", status: "Initiated", timestamp: new Date().toLocaleTimeString() }
      ]
    }));

    res.json({
      success: true,
      alertId,
      dispatchedAt: new Date().toISOString(),
      recipientLogs: logs
    });
  });

  // API Route: AI Safety Chatbot (Telemetry-Aware)
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, telemetry, contacts } = req.body;
      const client = getGeminiClient();

      // Formulate a rich, safety-oriented context prompt incorporating live telemetry & contacts
      const systemInstruction = `
        You are the SentinelX AI Guardian, an empathetic, highly professional personal safety chatbot assistant.
        Your primary role is to guide the user through personal safety scenarios, help manage stress, or answer emergency preparedness queries.
        
        You have direct access to the user's LIVE device telemetry and safety status:
        - Current Active User Profile: ${telemetry?.userType || "N/A"}
        - Heart Rate: ${telemetry?.heartRate || "N/A"} BPM
        - Body Temperature: ${telemetry?.bodyTemp || "N/A"}°C
        - Fall Detected Sensor state: ${telemetry?.fallDetected ? "TRIPPED" : "NOMINAL"}
        - Manual SOS Panic Button: ${telemetry?.sos ? "PRESSED" : "NOT ACTIVE"}
        - Accelerometer Motion: ${telemetry?.movement || "N/A"}
        - Current Coordinates: Latitude ${telemetry?.latitude || "N/A"}, Longitude ${telemetry?.longitude || "N/A"}
        - Location: ${telemetry?.locationLabel || "N/A"}
        - Battery Level: ${telemetry?.batteryLevel || "N/A"}%
        
        Emergency Contacts Configured:
        ${(contacts || []).map((c: any) => `- ${c.name} (${c.relation}): ${c.phone}`).join("\n")}
        
        Guidance instructions:
        1. Keep responses clear, concise, reassuring, and highly action-oriented. Do not write extremely long text. Keep it under 2-3 paragraphs.
        2. If the telemetry shows a critical emergency (e.g., fallDetected is TRIPPED or SOS is active), prioritize giving immediate, simple safety directions (e.g. "Stay calm, help is on the way. I've notified your emergency contacts.").
        3. Offer general medical first-aid or safety threat guidelines if asked, but make sure to add a small disclaimer that this is AI assistance.
        4. Be conversational, supportive, and objective.
      `;

      const apiKey = process.env.GEMINI_API_KEY;
      const isMock = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "";

      if (isMock) {
        // Fallback mock chatbot responses for reliable demo
        const lastUserMessage = messages[messages.length - 1]?.text?.toLowerCase() || "";
        let reply = "I am your SentinelX AI Guardian. I am actively monitoring your wearable stats, which currently appear safe. How can I assist you with your safety preparedness today?";
        
        if (lastUserMessage.includes("heart") || lastUserMessage.includes("pulse")) {
          reply = `Your heart rate is currently ${telemetry?.heartRate} BPM. ${telemetry?.heartRate > 100 ? "This is slightly elevated. Try to take deep, slow breaths. I am monitoring your condition." : "This is within a safe, resting zone. You are doing well."}`;
        } else if (lastUserMessage.includes("fall") || lastUserMessage.includes("hurt") || lastUserMessage.includes("slip") || lastUserMessage.includes("broke")) {
          reply = telemetry?.fallDetected 
            ? "WARNING: I see a fall has been detected on your device! Please stay still if you are in pain. I have prepared your automated contact alert broadcast. Caretakers have been notified of your location!"
            : "No falls have been registered on your device in the last few minutes. If you have had an incident, please let me know or press the SOS button.";
        } else if (lastUserMessage.includes("emergency") || lastUserMessage.includes("sos") || lastUserMessage.includes("help") || lastUserMessage.includes("panic")) {
          reply = "If you are in immediate danger, please press the Red Emergency SOS Button! I will immediately dispatch emergency SMS, automated calls, and email alerts with your precise coordinates.";
        } else if (lastUserMessage.includes("contact")) {
          reply = `Your active emergency contacts are: ${contacts?.map((c: any) => c.name).join(", ") || "Clara and Officer Sterling"}. Would you like me to send them a test alert?`;
        } else if (lastUserMessage.includes("hi") || lastUserMessage.includes("hello") || lastUserMessage.includes("hey")) {
          reply = `Hello! I'm your SentinelX AI Guardian. I'm actively connected to your ${telemetry?.userType || "wearable"} sensor feeds. How can I help you stay safe?`;
        } else if (lastUserMessage.includes("weather") || lastUserMessage.includes("rain") || lastUserMessage.includes("wind")) {
          reply = `Current weather around your GPS coordinates (${telemetry?.latitude?.toFixed(4)}, ${telemetry?.longitude?.toFixed(4)}) is showing normal conditions. If you are outdoor, please remain vigilant of wet grids!`;
        }
        
        return res.json({ text: reply });
      }

      // Convert messages to Gemini SDK parts
      const contents = messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      let responseText = "";
      try {
        console.log("[SentinelX Chat] Attempting chatbot query with gemini-3.5-flash...");
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
          }
        });
        responseText = response.text || "";
      } catch (primaryErr: any) {
        console.warn("AI Guardian Chatbot primary model failed or experiencing high demand, retrying with gemini-3.1-flash-lite. Error:", primaryErr);
        try {
          const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
            }
          });
          responseText = response.text || "";
        } catch (fallbackErr: any) {
          console.error("AI Guardian Chatbot all models failed, activating local rule-based fallback chat engine:", fallbackErr);
          const lastUserMessage = messages[messages.length - 1]?.text?.toLowerCase() || "";
          let reply = "I am your SentinelX AI Guardian. I am actively monitoring your wearable stats, which currently appear safe. How can I assist you with your safety preparedness today?";
          
          if (lastUserMessage.includes("heart") || lastUserMessage.includes("pulse")) {
            reply = `Your heart rate is currently ${telemetry?.heartRate} BPM. ${telemetry?.heartRate > 100 ? "This is slightly elevated. Try to take deep, slow breaths. I am monitoring your condition." : "This is within a safe, resting zone. You are doing well."}`;
          } else if (lastUserMessage.includes("fall") || lastUserMessage.includes("hurt") || lastUserMessage.includes("slip") || lastUserMessage.includes("broke")) {
            reply = telemetry?.fallDetected 
              ? "WARNING: I see a fall has been detected on your device! Please stay still if you are in pain. I have prepared your automated contact alert broadcast. Caretakers have been notified of your location!"
              : "No falls have been registered on your device in the last few minutes. If you have had an incident, please let me know or press the SOS button.";
          } else if (lastUserMessage.includes("emergency") || lastUserMessage.includes("sos") || lastUserMessage.includes("help") || lastUserMessage.includes("panic")) {
            reply = "If you are in immediate danger, please press the Red Emergency SOS Button! I will immediately dispatch emergency SMS, automated calls, and email alerts with your precise coordinates.";
          } else if (lastUserMessage.includes("contact")) {
            reply = `Your active emergency contacts are: ${contacts?.map((c: any) => c.name).join(", ") || "Clara and Officer Sterling"}. Would you like me to send them a test alert?`;
          } else if (lastUserMessage.includes("hi") || lastUserMessage.includes("hello") || lastUserMessage.includes("hey")) {
            reply = `Hello! I'm your SentinelX AI Guardian. I'm actively connected to your ${telemetry?.userType || "wearable"} sensor feeds. How can I help you stay safe?`;
          } else if (lastUserMessage.includes("weather") || lastUserMessage.includes("rain") || lastUserMessage.includes("wind")) {
            reply = `Current weather around your GPS coordinates (${telemetry?.latitude?.toFixed(4)}, ${telemetry?.longitude?.toFixed(4)}) is showing normal conditions. If you are outdoor, please remain vigilant of wet grids!`;
          }
          
          return res.json({ text: `[AI Fallback Mode] ${reply}` });
        }
      }

      res.json({ text: responseText });
    } catch (err: any) {
      console.error("AI Guardian Chatbot final handler failure:", err);
      res.status(500).json({ error: "Failed to query AI Chatbot.", details: err.message });
    }
  });

  // API Route: Get Manual Incident Reports
  app.get("/api/incidents", (req, res) => {
    res.json(incidentReports);
  });

  // API Route: Post a Manual Incident Report
  app.post("/api/incidents", (req, res) => {
    const { title, category, severity, description, latitude, longitude, locationLabel, reportedBy } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required fields." });
    }

    const newReport: IncidentReport = {
      id: `rep-${Date.now()}`,
      title,
      category: category || "Other",
      severity: severity || "Medium",
      description,
      latitude: latitude || 37.7749,
      longitude: longitude || -122.4194,
      locationLabel: locationLabel || "Current Location",
      timestamp: new Date().toISOString(),
      reportedBy: reportedBy || "Logged In User",
      resolved: false
    };

    incidentReports.unshift(newReport);
    res.status(201).json(newReport);
  });

  // API Route: Resolve/Update Manual Incident Report
  app.put("/api/incidents/:id", (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const reportIndex = incidentReports.findIndex((r) => r.id === id);
    if (reportIndex !== -1) {
      incidentReports[reportIndex].resolved = true;
      incidentReports[reportIndex].notes = notes || "Resolved and cleared by administrator.";
      return res.json(incidentReports[reportIndex]);
    }

    res.status(404).json({ error: "Incident report not found." });
  });

  // API Route: Simulated Authentication - Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Direct simulated lookup
    const user = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      return res.json({ success: true, user });
    }

    // Auto-create user for frictionless demo if they enter email
    const newUser = {
      email,
      fullName: email.split("@")[0].toUpperCase(),
      phone: "+1 (555) 111-2222",
      emergencyContactName: "Clara (Daughter)",
      emergencyContactPhone: "+1 (555) 321-4567"
    };
    registeredUsers.push(newUser);
    res.json({ success: true, user: newUser, message: "Welcome to SentinelX! Profile registered." });
  });

  // API Route: Simulated Authentication - Signup
  app.post("/api/auth/signup", (req, res) => {
    const { email, fullName, phone, emergencyContactName, emergencyContactPhone } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: "Email and Full Name are required." });
    }

    const existing = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    const newUser = {
      email,
      fullName,
      phone: phone || "+1 (555) 000-0000",
      emergencyContactName: emergencyContactName || "Emergency Contact",
      emergencyContactPhone: emergencyContactPhone || "+1 (555) 911-0000"
    };

    registeredUsers.push(newUser);
    res.status(201).json({ success: true, user: newUser });
  });

  // Configure Vite dev server or serve static index in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SentinelX Server] Booted successfully. Active at http://0.0.0.0:${PORT}`);
  });
}

startServer();

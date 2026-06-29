import React, { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Activity, Cpu, Settings, Users, Radio, Trash2, Heart, RotateCcw } from "lucide-react";
import { TelemetryLog, IncidentReport, Contact } from "../types";

interface AdminPanelProps {
  contacts: Contact[];
  onToggleContact: (index: number) => void;
  onUpdateContacts: (updated: Contact[]) => void;
  telemetryHistory: TelemetryLog[];
  onResolveTelemetryAlert: (id: string, notes: string) => Promise<void>;
  onRefreshAlerts: () => void;
}

const getOfflineIncidents = (): IncidentReport[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("sentinelx_incidents_fallback");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  const initialIncidents: IncidentReport[] = [
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
  localStorage.setItem("sentinelx_incidents_fallback", JSON.stringify(initialIncidents));
  return initialIncidents;
};

const saveOfflineIncidents = (list: IncidentReport[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("sentinelx_incidents_fallback", JSON.stringify(list));
  }
};

export default function AdminPanel({
  contacts,
  onToggleContact,
  onUpdateContacts,
  telemetryHistory,
  onResolveTelemetryAlert,
  onRefreshAlerts,
}: AdminPanelProps) {
  const [manualIncidents, setManualIncidents] = useState<IncidentReport[]>([]);
  const [activeTab, setActiveTab] = useState<"incidents" | "sensors" | "metrics">("incidents");
  const [resolvingManualId, setResolvingManualId] = useState<string | null>(null);
  const [manualResolutionNotes, setManualResolutionNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [serverStats, setServerStats] = useState({ ok: true, latency: 12 });
  
  // Custom alert threshold configuration state
  const [thresholds, setThresholds] = useState({
    maxHeartRate: 140,
    minHeartRate: 45,
    minBatteryLevel: 15,
    highAlertMode: false,
  });

  const fetchManualIncidents = async () => {
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const data = await res.json();
        setManualIncidents(data);
        saveOfflineIncidents(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Incident fetch failed, falling back to local storage:", err);
      setManualIncidents(getOfflineIncidents());
    }
  };

  const checkHealth = async () => {
    const startTime = performance.now();
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const latency = Math.round(performance.now() - startTime);
        setServerStats({ ok: true, latency });
      } else {
        setServerStats({ ok: false, latency: 0 });
      }
    } catch {
      setServerStats({ ok: false, latency: 0 });
    }
  };

  useEffect(() => {
    fetchManualIncidents();
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveManualIncident = async (id: string) => {
    if (!manualResolutionNotes.trim()) return;
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: manualResolutionNotes }),
      });
      if (res.ok) {
        setResolvingManualId(null);
        setManualResolutionNotes("");
        fetchManualIncidents();
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Resolve incident API failed, updating locally:", err);
      const offline = getOfflineIncidents();
      const updated = offline.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            resolved: true,
            notes: manualResolutionNotes || "Resolved and cleared."
          };
        }
        return item;
      });
      saveOfflineIncidents(updated);
      setManualIncidents(updated);
      setResolvingManualId(null);
      setManualResolutionNotes("");
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone || !contactRelation) return;
    const newContacts = [
      ...contacts,
      { name: contactName, phone: contactPhone, relation: contactRelation, enabled: true },
    ];
    onUpdateContacts(newContacts);
    setContactName("");
    setContactPhone("");
    setContactRelation("");
  };

  const handleDeleteContact = (index: number) => {
    const updated = contacts.filter((_, idx) => idx !== index);
    onUpdateContacts(updated);
  };

  return (
    <div id="admin-panel-main" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Admin Sidebar options */}
      <div className="lg:col-span-3 space-y-3">
        <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-red-500" />
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
              SentinelX Command
            </h2>
          </div>
          
          <p className="text-[11px] text-slate-400 font-mono mb-4">
            Authorized safety coordinator access only.
          </p>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("incidents")}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                activeTab === "incidents"
                  ? "bg-slate-950 text-red-400 border border-slate-800"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Manage Incidents</span>
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-500">
                {manualIncidents.filter(i => !i.resolved).length + telemetryHistory.filter(t => !t.resolved).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sensors")}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                activeTab === "sensors"
                  ? "bg-slate-950 text-red-400 border border-slate-800"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Rule Engine Settings</span>
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab("metrics")}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                activeTab === "metrics"
                  ? "bg-slate-950 text-red-400 border border-slate-800"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Telemetry Node Health</span>
              <Activity className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>

        {/* Live operational logs widget */}
        <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800 shadow-xl text-[10px] font-mono text-slate-400">
          <h3 className="text-slate-300 font-bold mb-2 uppercase">Operational Node Stats</h3>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span>Server State:</span>
              <span className="text-emerald-400">HEALTHY</span>
            </div>
            <div className="flex justify-between">
              <span>DB Sync Type:</span>
              <span className="text-red-400">SQLite In-Memory</span>
            </div>
            <div className="flex justify-between">
              <span>API Ingress URL:</span>
              <span>localhost:3000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Admin Content Panel */}
      <div className="lg:col-span-9 bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
        
        {/* Tab 1: INCIDENTS MANAGEMENT */}
        {activeTab === "incidents" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Incident Cleared Console</h3>
                <p className="text-xs text-slate-400">Resolve live automated telemetry alerts and logged user incidents.</p>
              </div>
              <button
                onClick={() => {
                  onRefreshAlerts();
                  fetchManualIncidents();
                }}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-850 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Sync Registers
              </button>
            </div>

            {/* Sub-grid of automated telemetry versus manual reports */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Telemetry Sensor Emergencies */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
                  Telemetry Alerts ({telemetryHistory.filter((t) => !t.resolved).length})
                </h4>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {telemetryHistory.filter(t => !t.resolved).length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono italic">No active telemetry emergencies on queue.</p>
                  ) : (
                    telemetryHistory.filter(t => !t.resolved).map((alert) => (
                      <div key={alert.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <div className="flex justify-between items-start text-[10px]">
                          <span className="text-red-400 font-bold font-mono uppercase">{alert.analysis.severity} Emergency</span>
                          <span className="text-slate-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <h5 className="font-semibold text-slate-200 text-xs font-mono">{alert.userType}</h5>
                        <p className="text-[11px] text-slate-400 leading-normal font-mono">{alert.analysis.reason}</p>
                        
                        <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                          <span className="text-[9px] font-mono text-slate-500">ID: {alert.id.slice(0, 12)}</span>
                          <button
                            onClick={() => onResolveTelemetryAlert(alert.id, "Operator resolved.")}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-[10px] rounded cursor-pointer"
                          >
                            Auto-Clear
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* User Manual Reports */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Manual Reports ({manualIncidents.filter((m) => !m.resolved).length})
                </h4>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {manualIncidents.filter(m => !m.resolved).length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono italic">No active manual hazard logs pending.</p>
                  ) : (
                    manualIncidents.filter(m => !m.resolved).map((inc) => (
                      <div key={inc.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <div className="flex justify-between items-start text-[10px]">
                          <span className="text-amber-400 font-bold font-mono uppercase">{inc.category}</span>
                          <span className="text-slate-500 font-mono">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <h5 className="font-semibold text-slate-200 text-xs font-mono">{inc.title}</h5>
                        <p className="text-[11px] text-slate-400 leading-normal font-mono">{inc.description}</p>
                        
                        {resolvingManualId === inc.id ? (
                          <div className="pt-2 space-y-2">
                            <input
                              type="text"
                              value={manualResolutionNotes}
                              onChange={(e) => setManualResolutionNotes(e.target.value)}
                              placeholder="Closeout safety resolution notes..."
                              className="w-full bg-slate-900 border border-slate-800 text-[10px] rounded p-1.5 text-slate-200 focus:outline-none"
                            />
                            <div className="flex justify-end gap-1.5 text-[9px]">
                              <button
                                onClick={() => setResolvingManualId(null)}
                                className="px-2 py-0.5 text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleResolveManualIncident(inc.id)}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded font-mono font-semibold"
                              >
                                Resolve
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                            <span className="text-[9px] font-mono text-slate-500">By: {inc.reportedBy}</span>
                            <button
                              onClick={() => setResolvingManualId(inc.id)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-750 font-mono text-[10px] rounded cursor-pointer"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: RULE ENGINE & CONTACTS */}
        {activeTab === "sensors" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-850">Telemetry & Rescue Dispatch Engine</h3>
              <p className="text-xs text-slate-400 mt-1">Configure automated rules triggers and coordinate lists.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Threshold inputs */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-red-500" /> Vitals & Trigger Limits
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Max Heart Rate Limit (Tachycardia)</label>
                    <input
                      type="number"
                      value={thresholds.maxHeartRate}
                      onChange={(e) => setThresholds({ ...thresholds, maxHeartRate: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Min Heart Rate Limit (Bradycardia)</label>
                    <input
                      type="number"
                      value={thresholds.minHeartRate}
                      onChange={(e) => setThresholds({ ...thresholds, minHeartRate: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Low Battery Alert Level (%)</label>
                    <input
                      type="number"
                      value={thresholds.minBatteryLevel}
                      onChange={(e) => setThresholds({ ...thresholds, minBatteryLevel: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-2 text-slate-200"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-200 block text-[11px]">Strict Safety Enforcement</span>
                      <span className="text-[10px] text-slate-500">Elevate all alerts immediately to Critical.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setThresholds({ ...thresholds, highAlertMode: !thresholds.highAlertMode })}
                      className={`text-[10px] font-mono px-2 py-1 rounded transition-all font-bold ${
                        thresholds.highAlertMode ? "bg-red-950 text-red-400 border border-red-900/50" : "bg-slate-950 text-slate-500 border border-slate-800"
                      }`}
                    >
                      {thresholds.highAlertMode ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Responder coordinates manage */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4 text-xs flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 mb-3">
                    <Users className="w-4 h-4 text-red-500" /> Emergency Broadcast Contacts
                  </h4>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {contacts.map((c, idx) => (
                      <div key={idx} className="p-2 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <span className="text-slate-200 block font-semibold">{c.name} ({c.relation})</span>
                          <span className="text-slate-500">{c.phone}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteContact(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddContact} className="pt-2 border-t border-slate-900 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Relation"
                      value={contactRelation}
                      onChange={(e) => setContactRelation(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Add Responder Contact
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: METRICS & DIAGNOSTIC */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-850">System Diagnostics & Logs</h3>
              <p className="text-xs text-slate-400 mt-1">Live monitoring variables of the SentinelX safe-hub deployment.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 font-mono">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">API Node Latency</span>
                <span className="text-xl font-bold text-emerald-400">{serverStats.latency} ms</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Active Presets</span>
                <span className="text-xl font-bold text-red-400">4 Channels</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Database Store</span>
                <span className="text-xl font-bold text-slate-200">Active</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2 text-xs font-mono">
              <h4 className="font-bold text-slate-300">Lemma Simulation Console Logs</h4>
              <div className="bg-black/40 p-4 rounded-xl border border-slate-900 h-36 overflow-y-auto text-slate-400 text-[10px] space-y-1 pr-1">
                <p className="text-slate-500">[{new Date().toLocaleTimeString()}] SentinelX safe-node initializing...</p>
                <p className="text-emerald-500">[{new Date().toLocaleTimeString()}] HTTP Express router active on port 3000.</p>
                <p className="text-cyan-500">[{new Date().toLocaleTimeString()}] Google GenAI module pre-loaded under client proxy.</p>
                <p className="text-slate-500">[{new Date().toLocaleTimeString()}] Initialized telemetry log structures (ID: hist-1, hist-2).</p>
                <p className="text-slate-400">[{new Date().toLocaleTimeString()}] ESP32 client WebSocket channels linked successfully.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

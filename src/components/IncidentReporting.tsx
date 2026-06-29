import React, { useState, useEffect } from "react";
import { FileText, AlertTriangle, MapPin, Radio, Check, RotateCcw, Clock } from "lucide-react";
import { IncidentReport, Telemetry } from "../types";

interface IncidentReportingProps {
  telemetry: Telemetry;
  currentUser: any;
  onNewIncidentReported?: () => void;
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

export default function IncidentReporting({ telemetry, currentUser, onNewIncidentReported }: IncidentReportingProps) {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<any>("Medical");
  const [severity, setSeverity] = useState<any>("Medium");
  const [description, setDescription] = useState("");
  const [useLiveGPS, setUseLiveGPS] = useState(true);
  const [locLabel, setLocLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const categories = ["Medical", "Physical Threat", "Fall", "Fire", "Accident", "Other"];
  const severities = ["Low", "Medium", "High", "Critical"];

  const fetchIncidents = async () => {
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        saveOfflineIncidents(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Error fetching manual incidents, using offline fallback:", err);
      setIncidents(getOfflineIncidents());
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setMsg("");

    const payload = {
      title,
      category,
      severity,
      description,
      latitude: useLiveGPS ? telemetry.latitude : 37.7749,
      longitude: useLiveGPS ? telemetry.longitude : -122.4194,
      locationLabel: locLabel.trim() || (useLiveGPS ? telemetry.locationLabel : "Current Geolocation"),
      reportedBy: currentUser ? currentUser.fullName : "Anonymous Device Node",
    };

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMsg("Incident report logged successfully onto secure workspace node.");
        setTitle("");
        setDescription("");
        setLocLabel("");
        fetchIncidents();
        if (onNewIncidentReported) {
          onNewIncidentReported();
        }
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Incident creation API failed, saving to local fallback storage:", err);
      const offline = getOfflineIncidents();
      const newReport: IncidentReport = {
        id: `rep-${Date.now()}`,
        title,
        category,
        severity,
        description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationLabel: payload.locationLabel,
        timestamp: new Date().toISOString(),
        reportedBy: payload.reportedBy,
        resolved: false
      };
      const updated = [newReport, ...offline];
      saveOfflineIncidents(updated);
      setIncidents(updated);
      setMsg("Incident report logged successfully (Local Offline Mode).");
      setTitle("");
      setDescription("");
      setLocLabel("");
      if (onNewIncidentReported) {
        onNewIncidentReported();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="incident-reporting-container" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Report Form */}
      <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-red-500" />
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
            Log Manual Safety Incident
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Manually file a safety incident report to register immediate attention or record physical hazards directly. Reports sync live to the Admin Panel.
        </p>

        {msg && (
          <div className="p-3 mb-4 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Incident Summary Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken railing, Stalker spotted, Heat wave alert"
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Incident Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Assessed Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
              >
                {severities.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Description & Situational Details</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact details of physical conditions, threats, actions taken, or responder recommendations."
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Map & Georeference Location:</span>
              <button
                type="button"
                onClick={() => setUseLiveGPS(!useLiveGPS)}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                  useLiveGPS ? "bg-red-950/40 text-red-400 border-red-900/40" : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                {useLiveGPS ? "Linked to Live GPS" : "Static Default GPS"}
              </button>
            </div>

            {useLiveGPS ? (
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Lat: {telemetry.latitude.toFixed(4)}, Lng: {telemetry.longitude.toFixed(4)} ({telemetry.locationLabel})</span>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={locLabel}
                  onChange={(e) => setLocLabel(e.target.value)}
                  placeholder="Custom Location label (e.g. Sector 5 West entrance)"
                  className="w-full bg-slate-900 border border-slate-800 text-[10px] rounded-lg p-2 text-slate-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-950/20 cursor-pointer disabled:opacity-50"
          >
            Transmit Incident Report
          </button>
        </form>
      </div>

      {/* Incident History feed */}
      <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-[495px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-slate-400 animate-pulse" />
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
              Filed Reports Registry
            </h2>
          </div>
          <button
            onClick={fetchIncidents}
            className="p-1 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono">
              <AlertTriangle className="w-7 h-7 mx-auto text-slate-600 mb-2" />
              <span>No user incidents reported manually in database.</span>
            </div>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl relative">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${
                    inc.severity === "Critical" 
                      ? "bg-red-950 text-red-400 border-red-900" 
                      : inc.severity === "High"
                        ? "bg-amber-950 text-amber-400 border-amber-900"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}>
                    {inc.severity}
                  </span>
                  
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-200 text-xs mb-1 font-mono">{inc.title}</h3>
                <p className="text-slate-400 text-[11px] mb-2 font-mono leading-relaxed">{inc.description}</p>
                
                <div className="border-t border-slate-900 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono">
                  <span>By: <strong className="text-slate-400">{inc.reportedBy}</strong></span>
                  <span>•</span>
                  <span>Zone: <strong className="text-slate-400">{inc.locationLabel}</strong></span>
                </div>

                {inc.resolved && (
                  <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg font-mono">
                    <strong>Operator Resolution Notes:</strong> {inc.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

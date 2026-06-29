import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { ChatMessage, Telemetry, Contact } from "../types";

interface AIChatbotProps {
  telemetry: Telemetry;
  contacts: Contact[];
}

export default function AIChatbot({ telemetry, contacts }: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your SentinelX AI Guardian. I am actively connected to your wearable telemetry streams. If you are ever feeling unsafe or need emergency advice, ask me here. How can I help you today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSubmit = (customText || input).trim();
    if (!textToSubmit) return;

    if (!customText) {
      setInput("");
    }

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ sender: m.sender, text: m.text })),
          telemetry,
          contacts,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: "ai",
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("AI Chatbot API failed, utilizing local fallback chat generator:", err);
      const lastUserMessage = textToSubmit.toLowerCase();
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
      } else if (lastUserMessage.includes("first aid") || lastUserMessage.includes("protocol") || lastUserMessage.includes("treatment")) {
        reply = "First-aid protocol for a high impact fall: 1. Do not move if neck/back pain is present. 2. Control active bleeding with pressure. 3. Call 911 immediately if unresponsive. 4. Keep warm and reassure.";
      } else if (lastUserMessage.includes("status") || lastUserMessage.includes("vitals") || lastUserMessage.includes("evaluate")) {
        reply = `Vitals analysis: Heart rate is ${telemetry?.heartRate} BPM, temperature is ${telemetry?.bodyTemp}°C, fall sensor is ${telemetry?.fallDetected ? "TRIPPED" : "NOMINAL"}. Overall status is ${telemetry?.fallDetected || telemetry?.sos ? "🚨 CRISIS THREAT DETECTED" : "✅ SECURE"}.`;
      } else if (lastUserMessage.includes("sophia") || lastUserMessage.includes("commute") || lastUserMessage.includes("route")) {
        reply = "Safe routing recommendations: Use well-lit corridors, share live-tracking link with Clara, keep device unmuted, and have instant-SOS button ready.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "ai",
          text: `[Local Safe-Mode] ${reply}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: "My Safety Status", text: "Evaluate my current safety status and wearable vitals." },
    { label: "First Aid for Falls", text: "What is the emergency first-aid protocol for a high impact fall?" },
    { label: "Sophia Commute Plan", text: "Give me safe routing safety recommendations for Sophia's commute." },
  ];

  return (
    <div id="ai-chatbot-card" className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-[520px]">
      
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
            SentinelX AI Guardian Chatbot
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-lg text-[9px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          Telemetry Aware
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 text-xs">
        {messages.map((m) => {
          const isAI = m.sender === "ai";
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${isAI ? "self-start items-start" : "self-end items-end ml-auto"}`}
            >
              <div
                className={`p-3 rounded-2xl border ${
                  isAI
                    ? "bg-slate-950 border-slate-900 text-slate-200 rounded-tl-none"
                    : "bg-red-600/10 border-red-500/20 text-slate-100 rounded-tr-none"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{m.timestamp}</span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 self-start p-3 bg-slate-950 border border-slate-900 rounded-2xl rounded-tl-none max-w-[85%]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
            <span className="font-mono text-[10px]">AI Guardian formulating advice...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Panel */}
      <div className="pb-3 flex flex-wrap gap-1.5 border-t border-slate-850 pt-3">
        {quickPrompts.map((q) => (
          <button
            key={q.label}
            onClick={() => handleSend(undefined, q.text)}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-850 hover:border-slate-800 text-[10px] font-mono cursor-pointer transition-all"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI Guardian..."
          className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
        />
        <button
          type="submit"
          className="p-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md shadow-red-950/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

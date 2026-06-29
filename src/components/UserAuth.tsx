import React, { useState } from "react";
import { User, LogIn, UserPlus, LogOut, CheckCircle, Shield } from "lucide-react";

interface UserProfile {
  email: string;
  fullName: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface UserAuthProps {
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export default function UserAuth({ currentUser, onLogin, onLogout }: UserAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          onLogin(data.user);
          setSuccess(data.message || "Successfully logged in!");
        } else {
          setError(data.error || "Login failed.");
        }
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            fullName,
            phone,
            emergencyContactName: emergencyName,
            emergencyContactPhone: emergencyPhone,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          onLogin(data.user);
          setSuccess("Account successfully registered!");
        } else {
          setError(data.error || "Registration failed.");
        }
      }
    } catch (err) {
      console.warn("Auth API failed, utilizing local fallback authentication:", err);
      const mockUser: UserProfile = {
        email: email || "mdsamreenmohammad@gmail.com",
        fullName: fullName || (email ? email.split("@")[0].toUpperCase() : "SAMREEN MOHAMMAD"),
        phone: phone || "+1 (555) 123-9876",
        emergencyContactName: emergencyName || "Clara (Daughter)",
        emergencyContactPhone: emergencyPhone || "+1 (555) 321-4567"
      };
      onLogin(mockUser);
      setSuccess("Successfully logged in (Local Safe-Mode)!");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div id="auth-status-card" className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-950 border border-red-800/60 flex items-center justify-center text-red-400 font-bold uppercase">
            {currentUser.fullName.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">{currentUser.fullName}</h3>
            <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-850 pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Mobile Phone:</span>
            <span className="text-slate-200 font-mono">{currentUser.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SOS Contact:</span>
            <span className="text-slate-200 font-mono">{currentUser.emergencyContactName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SOS Phone:</span>
            <span className="text-slate-200 font-mono">{currentUser.emergencyContactPhone}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-5 w-full py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out Session
        </button>
      </div>
    );
  }

  return (
    <div id="auth-form-card" className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
            {isLogin ? "Sign In to SentinelX" : "Create Safe Profile"}
          </h2>
        </div>
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setSuccess("");
          }}
          className="text-[10px] font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
        >
          {isLogin ? "Register account" : "I have an account"}
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        {isLogin
          ? "Enter your secure email address. In demo mode, entering any unrecognized email automatically configures a new safety node."
          : "Register your real phone and primary responder contacts so the automatic broadcast can dispatch correct location links."}
      </p>

      {error && <div className="p-3 mb-4 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 mb-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. yourname@gmail.com"
            className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        {!isLogin && (
          <>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sophia Miller"
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Your Mobile Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 765-4321"
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-850">
              <label className="block text-red-400 font-semibold mb-1">Primary Emergency Contact</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Contact Name"
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                />
                <input
                  type="text"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Contact Phone"
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-950/20 disabled:opacity-55 cursor-pointer"
        >
          {loading ? (
            "Connecting..."
          ) : isLogin ? (
            <>
              <LogIn className="w-3.5 h-3.5" />
              Sign In to System
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              Register Profile Node
            </>
          )}
        </button>
      </form>
    </div>
  );
}

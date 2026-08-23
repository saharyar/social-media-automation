import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH;

  const setDigitAt = (index, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index, e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }
    const char = value.slice(-1);
    setDigitAt(index, char);
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigitAt(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isComplete) {
      setError("Enter all 6 digits");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "That code didn't match. Try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await api.post("/auth/resend-otp", { email });
      setNotice("New code sent");
      setCooldown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = cooldown / RESEND_SECONDS;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-baseline text-2xl font-serif text-[#0F172A] tracking-tight">
            Scheduler
            <span className="text-[#F0473C]">.</span>
          </span>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]">
          <div className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-full bg-[#FDEDEB] border border-[#F8D6D2]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12.5l5 5L20 6.5"
                stroke="#F0473C"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-center text-[#0F172A] text-xl font-semibold tracking-tight">
            Verify your email
          </h1>
          <p className="mt-2 text-center text-sm text-[#6B7280] leading-relaxed">
            We sent a 6-digit code to
            <br />
            <span className="text-[#0F172A] font-medium">{email || "your email"}</span>
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#F8D6D2] bg-[#FDEDEB] px-3 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="9" stroke="#F0473C" strokeWidth="1.6" />
                <path d="M12 8v5" stroke="#F0473C" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="#F0473C" />
              </svg>
              <p className="text-sm text-[#B3261E]">{error}</p>
            </div>
          )}

          {!error && notice && (
            <div className="mt-5 rounded-lg border border-[#DCECE3] bg-[#F1FAF5] px-3 py-2.5">
              <p className="text-sm text-[#1F7A4D]">{notice}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-6">
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono text-[#0F172A]
                    bg-white border border-[#D9D9D9] rounded-xl
                    focus:outline-none focus:border-[#F0473C] focus:ring-2 focus:ring-[#F0473C]/20
                    transition-colors duration-150"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !isComplete}
              className="mt-7 w-full py-3 rounded-xl font-medium text-white bg-[#F0473C]
                hover:bg-[#D93A30] disabled:bg-[#F5B8B2] disabled:cursor-not-allowed
                transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Verifying
                </>
              ) : (
                "Verify email"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-[#6B7280]">Didn't get a code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 font-medium text-[#F0473C] disabled:text-[#C9C9C9]
                disabled:cursor-not-allowed hover:text-[#D93A30] transition-colors"
            >
              {cooldown > 0 ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                    <circle cx="10" cy="10" r={radius} stroke="#EAEAEA" strokeWidth="2" fill="none" />
                    <circle
                      cx="10"
                      cy="10"
                      r={radius}
                      stroke="#C9C9C9"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      strokeLinecap="round"
                      transform="rotate(-90 10 10)"
                    />
                  </svg>
                  Resend in {cooldown}s
                </>
              ) : resending ? (
                "Sending..."
              ) : (
                "Resend code"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { RiVipCrownLine } from "react-icons/ri";

const API_URL = "https://crm-lead-q8g4.onrender.com/api/auth/register";

const PLANS = [
  {
    k: "free",
    lbl: "Free",
    desc: "Up to 100 leads",
    color: "#94A3B8",
    features: ["Basic lead management", "Email login"],
  },
  {
    k: "basic",
    lbl: "Basic",
    desc: "Up to 5,000 leads",
    color: "#3B6FFF",
    features: ["All Free features", "Data analysis", "Reports"],
  },
  {
    k: "pro",
    lbl: "Pro",
    desc: "Unlimited leads",
    color: "#F59E0B",
    features: [
      "All Basic features",
      "PPT export",
      "Priority support",
      "Google & OTP login",
    ],
  },
];

export default function RegisterPage() {
  const nav = useNavigate();

  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    orgName: "",
    plan: "free",
  });

  const [loading, setLoading] = useState(false);

  const set = (key) => (e) =>
    setF((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();

    if (!f.name.trim()) {
      return toast.error("Your name is required");
    }

    if (!f.orgName.trim()) {
      return toast.error("Organization name is required");
    }

    if (f.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      const res = await axios.post(API_URL, {
        name: f.name,
        email: f.email,
        password: f.password,
        phone: f.phone,
        orgName: f.orgName,
        plan: f.plan,
      });

      console.log(res.data);

      // Save token if backend returns one
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      // Save user data
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      toast.success("Organization created successfully 🎉");

      nav("/dashboard");
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />

      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-brand">
          <div className="auth-mark">CR</div>

          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900 }}>CRM Pro</h1>

            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              Register your organization
            </span>
          </div>
        </div>

        <h2>Create Organization</h2>
        <p className="sub">Set up your institution on CRM Pro</p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>
              🏢 Institution / Organization Name{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>

            <input
              placeholder="ABC Company"
              value={f.orgName}
              onChange={set("orgName")}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Your Full Name *</label>

              <input
                placeholder="John Smith"
                value={f.name}
                onChange={set("name")}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>

              <input
                placeholder="+91 9876543210"
                value={f.phone}
                onChange={set("phone")}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address *</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={f.email}
              onChange={set("email")}
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>

            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={f.password}
              onChange={set("password")}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <RiVipCrownLine style={{ marginRight: 5 }} />
              Choose Your Plan
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginTop: 4,
              }}
            >
              {PLANS.map((p) => (
                <div
                  key={p.k}
                  onClick={() =>
                    setF((prev) => ({
                      ...prev,
                      plan: p.k,
                    }))
                  }
                  style={{
                    padding: "10px 8px",
                    borderRadius: 9,
                    cursor: "pointer",
                    textAlign: "center",
                    border: `2px solid ${
                      f.plan === p.k ? p.color : "var(--border)"
                    }`,
                    background:
                      f.plan === p.k
                        ? p.k === "pro"
                          ? "#FEF3C7"
                          : p.k === "basic"
                          ? "#EBF0FF"
                          : "#F1F5F9"
                        : "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: p.color,
                    }}
                  >
                    {p.lbl}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                    }}
                  >
                    {p.desc}
                  </div>

                  {f.plan === p.k && (
                    <div
                      style={{
                        fontSize: 10,
                        color: p.color,
                        marginTop: 3,
                        fontWeight: 700,
                      }}
                    >
                      ✓ Selected
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: "var(--bg)",
                borderRadius: 8,
              }}
            >
              {(PLANS.find((p) => p.k === f.plan)?.features || []).map(
                (feat) => (
                  <div
                    key={feat}
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      padding: "2px 0",
                    }}
                  >
                    ✓ {feat}
                  </div>
                )
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: 6,
              padding: "11px",
            }}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Organization →"}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: 14 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
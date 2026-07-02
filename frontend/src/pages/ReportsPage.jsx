import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Bar,
  Line,
  Doughnut,
} from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import {
  RiDownloadLine,
  RiBarChart2Line,
  RiCalendarLine,
  RiShareLine,
  RiFilePpt2Line,
} from "react-icons/ri";

import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

import PptxGenJS from "pptxgenjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const PERIODS = [
  { k: "week", lbl: "This Week" },
  { k: "month", lbl: "Monthly" },
  { k: "quarter", lbl: "Quarter" },
  { k: "half", lbl: "Half Year" },
  { k: "year", lbl: "Yearly" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const OUTCOME_LABEL = {
  I: "Interested",
  NI: "Not Interested",
  CB: "Call Back",
  NA: "No Answer",
  "": "Pending",
};

export default function ReportsPage() {
  const { canDownload, canShare, orgPlan } = useAuth();

  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  // =========================================
  // LOAD DATA
  // =========================================
  const loadData = async () => {
    setLoading(true);

    try {
      const [a, b] = await Promise.all([
        axios.get(`/api/leads/analytics?period=${period}`),
        axios.get("/api/leads/daily-report"),
      ]);

      setData(a.data.analytics);
      setDaily(b.data.report);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // SHARE REPORT
  // =========================================
  const shareReport = async () => {
    if (!navigator.share) {
      copyReportLink();
      return;
    }

    try {
      await navigator.share({
        title: "CRM Report",
        url: window.location.href,
      });
    } catch {
      copyReportLink();
    }
  };

  const copyReportLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() =>
        toast.success("Report link copied!")
      );
  };

  // =========================================
  // PPT DOWNLOAD
  // =========================================
  const downloadPPT = async () => {
    if (orgPlan !== "pro") {
      return toast.error(
        "PPT export is a Pro plan feature."
      );
    }

    try {
      toast.loading("Generating PPT...", {
        id: "ppt",
      });

      await buildPPT();

      toast.success("PPT downloaded!", {
        id: "ppt",
      });
    } catch (e) {
      console.error(e);

      toast.error("PPT generation failed", {
        id: "ppt",
      });
    }
  };

  // =========================================
  // BUILD PPT
  // =========================================
  const buildPPT = async () => {
    const pptx = new PptxGenJS();

    pptx.layout = "LAYOUT_WIDE";

    pptx.author = "CRM System";
    pptx.company = "Your Company";
    pptx.subject = "CRM Analytics Report";
    pptx.title = "CRM Report";
    pptx.lang = "en-US";

    const a = data || {};

    const slide1 = pptx.addSlide();

    slide1.background = {
      color: "0A0F1E",
    };

    slide1.addText("CRM Analytics Report", {
      x: 0.5,
      y: 1.2,
      w: 12,
      h: 1,
      fontSize: 28,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });

    slide1.addText(
      `Period: ${
        PERIODS.find((p) => p.k === period)?.lbl
      }`,
      {
        x: 0.5,
        y: 2.2,
        w: 12,
        h: 0.5,
        fontSize: 16,
        color: "3B6FFF",
        align: "center",
      }
    );

    slide1.addText(
      `Generated: ${new Date().toLocaleDateString()}`,
      {
        x: 0.5,
        y: 2.8,
        w: 12,
        h: 0.5,
        fontSize: 11,
        color: "94A3B8",
        align: "center",
      }
    );

    const slide2 = pptx.addSlide();

    slide2.addText("Summary Statistics", {
      x: 0.5,
      y: 0.4,
      w: 10,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: "0A0F1E",
    });

    const stats = [
      {
        label: "Total Leads",
        val: a.total || 0,
        color: "3B6FFF",
      },
      {
        label: "Pending",
        val: a.pending || 0,
        color: "FFA502",
      },
      {
        label: "In Progress",
        val: a.inProgress || 0,
        color: "0EA5E9",
      },
      {
        label: "Converted",
        val: a.converted || 0,
        color: "00C48C",
      },
      {
        label: "Not Converted",
        val: a.notConverted || 0,
        color: "FF4757",
      },
    ];

    stats.forEach((s, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);

      const x = 0.5 + col * 3.2;
      const y = 1.4 + row * 2;

      slide2.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 2.8,
        h: 1.5,
        fill: {
          color: "F8FAFC",
        },
        line: {
          color: s.color,
          width: 2,
        },
        radius: 0.08,
      });

      slide2.addText(String(s.val), {
        x,
        y: y + 0.2,
        w: 2.8,
        h: 0.5,
        fontSize: 26,
        bold: true,
        color: s.color,
        align: "center",
      });

      slide2.addText(s.label, {
        x,
        y: y + 0.95,
        w: 2.8,
        h: 0.4,
        fontSize: 11,
        color: "64748B",
        align: "center",
      });
    });

    const slide3 = pptx.addSlide();

    slide3.addText("Upload Trend", {
      x: 0.5,
      y: 0.4,
      w: 10,
      h: 0.5,
      fontSize: 24,
      bold: true,
    });

    const trendData = (
      a.monthlyUploads || []
    ).map((m) => ({
      label:
        MONTHS[m?._id?.m - 1] || "Unknown",
      value: m.count || 0,
    }));

    if (trendData.length) {
      slide3.addChart(
        pptx.ChartType.line,
        [
          {
            name: "Uploads",
            labels: trendData.map(
              (d) => d.label
            ),
            values: trendData.map(
              (d) => d.value
            ),
          },
        ],
        {
          x: 0.5,
          y: 1,
          w: 9.5,
          h: 4.5,
          showLegend: false,
          chartColors: ["3B6FFF"],
          catAxisLabelFontSize: 11,
          valAxisLabelFontSize: 11,
        }
      );
    }

    const slide4 = pptx.addSlide();

    slide4.addText("Lead Status Breakdown", {
      x: 0.5,
      y: 0.4,
      w: 10,
      h: 0.5,
      fontSize: 24,
      bold: true,
    });

    slide4.addChart(
      pptx.ChartType.pie,
      [
        {
          name: "Status",
          labels: [
            "Pending",
            "In Progress",
            "Converted",
            "Not Converted",
          ],
          values: [
            a.pending || 0,
            a.inProgress || 0,
            a.converted || 0,
            a.notConverted || 0,
          ],
        },
      ],
      {
        x: 1.5,
        y: 1,
        w: 6.5,
        h: 4.8,
        showLegend: true,
        showPercent: true,
        legendPos: "b",
        chartColors: [
          "94A3B8",
          "3B6FFF",
          "00C48C",
          "FF4757",
        ],
      }
    );

    const slide5 = pptx.addSlide();

    slide5.addText("Worker Performance", {
      x: 0.5,
      y: 0.4,
      w: 10,
      h: 0.5,
      fontSize: 24,
      bold: true,
    });

    const workers = a.workerPerf || [];

    if (workers.length) {
      slide5.addTable(
        [
          [
            {
              text: "Agent",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "3B6FFF",
              },
            },
            {
              text: "Role",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "3B6FFF",
              },
            },
            {
              text: "Leads Worked",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "3B6FFF",
              },
            },
          ],

          ...workers.map((w) => [
            w.name || "",
            w.role || "",
            String(w.count || 0),
          ]),
        ],
        {
          x: 0.5,
          y: 1.2,
          w: 8.8,
          fontSize: 11,
          border: {
            type: "solid",
            color: "E2E8F0",
          },
          rowH: 0.4,
        }
      );
    } else {
      slide5.addText("No worker data", {
        x: 1,
        y: 2.5,
        w: 7,
        h: 0.5,
        fontSize: 16,
        color: "94A3B8",
        align: "center",
      });
    }

    const slide6 = pptx.addSlide();

    slide6.addText("Daily Upload Report", {
      x: 0.5,
      y: 0.4,
      w: 10,
      h: 0.5,
      fontSize: 24,
      bold: true,
    });

    const dailyRows = daily.slice(0, 10);

    if (dailyRows.length) {
      slide6.addTable(
        [
          [
            {
              text: "Date",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "0A0F1E",
              },
            },
            {
              text: "Uploaded",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "0A0F1E",
              },
            },
            {
              text: "Pending",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "0A0F1E",
              },
            },
            {
              text: "Converted",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "0A0F1E",
              },
            },
            {
              text: "Not Conv.",
              options: {
                bold: true,
                color: "FFFFFF",
                fill: "0A0F1E",
              },
            },
          ],

          ...dailyRows.map((r) => [
            r._id || "",
            String(r.uploaded || 0),
            String(r.pending || 0),
            String(r.converted || 0),
            String(r.notConverted || 0),
          ]),
        ],
        {
          x: 0.5,
          y: 1.2,
          w: 9.2,
          fontSize: 10,
          border: {
            type: "solid",
            color: "E2E8F0",
          },
          rowH: 0.35,
        }
      );
    }

    await pptx.writeFile({
      fileName: `crm_report_${period}_${new Date()
        .toISOString()
        .slice(0, 10)}.pptx`,
    });
  };

  // =========================================
  // LOADING
  // =========================================
  if (loading || !data) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const a = data;

  // =========================================
  // TREND DATA
  // =========================================
  const trendLabels =
    period === "week"
      ? (a.dailyUploads || []).map(
          (d) => d._id
        )
      : (a.monthlyUploads || []).map(
          (m) =>
            MONTHS[m?._id?.m - 1] ||
            "Unknown"
        );

  const trendValues =
    period === "week"
      ? (a.dailyUploads || []).map(
          (d) => d.count
        )
      : (a.monthlyUploads || []).map(
          (m) => m.count
        );

  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Leads Uploaded",
        data: trendValues,
        backgroundColor:
          "rgba(59,111,255,.15)",
        borderColor: "#3B6FFF",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#3B6FFF",
        pointRadius: 4,
      },
    ],
  };

  const trendOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // =========================================
  // STATUS DATA
  // =========================================
  const statusData = {
    labels: [
      "Pending",
      "In Progress",
      "Converted",
      "Not Converted",
    ],

    datasets: [
      {
        data: [
          a.pending || 0,
          a.inProgress || 0,
          a.converted || 0,
          a.notConverted || 0,
        ],

        backgroundColor: [
          "#94A3B8",
          "#3B6FFF",
          "#00C48C",
          "#FF4757",
        ],

        borderWidth: 0,
      },
    ],
  };

  const statusOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",

    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // =========================================
  // DONUT DATA
  // =========================================
  const c1d = (
    a.c1Outcomes || []
  ).filter((o) => o._id);

  const c1DonutData = {
    labels: c1d.map(
      (o) =>
        OUTCOME_LABEL[o._id] || o._id
    ),

    datasets: [
      {
        data: c1d.map((o) => o.count),

        backgroundColor: [
          "#00C48C",
          "#FF4757",
          "#FFA502",
          "#94A3B8",
        ],

        borderWidth: 0,
      },
    ],
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
  };

  // =========================================
  // UI
  // =========================================
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.k}
              className={`period-tab${
                period === p.k
                  ? " active"
                  : ""
              }`}
              onClick={() =>
                setPeriod(p.k)
              }
            >
              {p.lbl}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          {canDownload && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                window.open(
                  "/api/leads/download"
                )
              }
            >
              <RiDownloadLine />
              Excel
            </button>
          )}

          {canShare && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={shareReport}
            >
              <RiShareLine />
              Share
            </button>
          )}

          <button
            className="btn btn-sm"
            onClick={downloadPPT}
            style={{
              background:
                orgPlan === "pro"
                  ? "#F59E0B"
                  : "#94A3B8",
              color: "#fff",
              border: "none",
            }}
          >
            <RiFilePpt2Line />
            PPT
          </button>
        </div>
      </div>

      {/* STATS */}
      <div
        className="grid4"
        style={{ gap: 10 }}
      >
        {[
          {
            lbl: "Total",
            val: a.total || 0,
            color: "#3B6FFF",
          },
          {
            lbl: "Converted",
            val: a.converted || 0,
            color: "#00C48C",
          },
          {
            lbl: "Not Converted",
            val:
              a.notConverted || 0,
            color: "#FF4757",
          },
          {
            lbl: "In Progress",
            val:
              a.inProgress || 0,
            color: "#FFA502",
          },
        ].map((s) => (
          <div
            key={s.lbl}
            className="card"
            style={{
              borderLeft: `4px solid ${s.color}`,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: s.color,
              }}
            >
              {s.val}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="row">
        <div
          className="card col"
        >
          <div className="card-header">
            <div>
              <div className="card-title">
                <RiBarChart2Line />
                Upload Trend
              </div>

              <div className="card-sub">
                Total leads uploaded
              </div>
            </div>

          </div>

          <div
            style={{ height: 220 }}
          >
            <Line
              data={trendData}
              options={trendOpts}
            />
          </div>
        </div>

        <div
          className="card"
          style={{
            width: 300,
          }}
        >
          <div className="card-header">
            <div className="card-title">
              Status Breakdown
            </div>

          </div>

          <div
            style={{ height: 220 }}
          >
            <Bar
              data={statusData}
              options={statusOpts}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="row">
        <div
          className="card"
          style={{
            width: 260,
          }}
        >
          <div className="card-header">
            <div className="card-title">
              C1 Outcomes
            </div>
          </div>

          <div
            style={{ height: 220 }}
          >
            {c1d.length ? (
              <Doughnut
                data={c1DonutData}
                options={donutOpts}
              />
            ) : (
              <div className="empty">
                No data
              </div>
            )}
          </div>
        </div>

        <div className="card col">
          <div className="card-header">
            <div className="card-title">
              Worker Performance
            </div>
          </div>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Leads Worked</th>
                </tr>
              </thead>

              <tbody>
                {(a.workerPerf || []).map(
                  (w, i) => (
                    <tr key={i}>
                      <td>
                        {w.name}
                      </td>

                      <td>
                        {w.role}
                      </td>

                      <td>
                        {w.count}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import axios from "axios";
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wf_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MODULES = {
  leaves: {
    title: "Leave Management",
    description: "Review employee leave requests and their current status.",
    endpoint: "/leaves/",
  },
  payroll: {
    title: "Payroll Management",
    description: "Review payroll records and payment status.",
    endpoint: "/payroll/",
  },
  shifts: {
    title: "Shift Management",
    description: "View configured employee shifts.",
    endpoint: "/shifts/",
  },
  reviews: {
    title: "Performance Reviews",
    description: "Review employee performance records.",
    endpoint: "/performance-reviews/",
  },
  notifications: {
    title: "Notifications",
    description: "View and manage your notifications.",
    endpoint: "/notifications/",
  },
  tasks: {
    title: "Workflow Tasks",
    description: "Track workforce workflow tasks.",
    endpoint: "/workflow-tasks/",
  },
  interventions: {
    title: "Retention Interventions",
    description: "Monitor interventions for workforce retention.",
    endpoint: "/interventions/",
  },
  recommendations: {
    title: "AI Recommendations",
    description: "Explore workforce retention recommendations.",
    endpoint: "/recommendations/",
  },
  forecasting: {
    title: "Workforce Forecasting",
    description: "View workforce forecast data.",
    endpoint: "/forecasting/overview",
  },
  risk: {
    title: "Risk Monitoring",
    description: "Monitor workforce risk indicators.",
    endpoint: "/risk-monitoring/summary",
  },
  alerts: {
    title: "Smart Alerts",
    description: "Review high-risk workforce alerts.",
    endpoint: "/smart-alerts/overview",
  },
  stability: {
    title: "Workforce Stability",
    description: "Review workforce stability and retention priorities.",
    endpoint: "/workforce-stability/overview",
  },
  activity: {
    title: "Activity Feed",
    description: "Review recent workforce activity.",
    endpoint: "/activity/feed",
  },
  audit: {
    title: "Audit Logs",
    description: "Review recorded system audit events.",
    endpoint: "/audit-logs/",
  },
  datasets: {
    title: "AI Datasets",
    description: "View datasets available for model training.",
    endpoint: "/datasets/",
  },
  chat: {
    title: "Workforce Chat",
    description: "View workforce messages.",
    endpoint: "/chat/messages",
  },
  documents: {
    title: "Employee Documents",
    description: "View uploaded employee documents.",
    endpoint: "/documents/",
  },
  attendanceReports: {
    title: "Attendance Reports",
    description: "Review attendance reporting data.",
    endpoint: "/attendance/reports",
  },
  attritionAnalytics: {
    title: "Attrition Analytics",
    description: "Explore attrition risk analytics.",
    endpoint: "/attrition-analytics/overview",
  },
  permissions: {
    title: "My Permissions",
    description: "View the permissions associated with your account.",
    endpoint: "/permissions/me",
  },
};

function readableLabel(value) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function DataTable({ rows, search }) {
  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  if (!filtered.length) {
    return (
      <div className="hrms-empty">
        <Search size={24} />
        <h3>No records found</h3>
        <p>Try another search or refresh the data.</p>
      </div>
    );
  }

  const columns = [
    ...new Set(filtered.flatMap((row) => Object.keys(row))),
  ].slice(0, 9);

  return (
    <div className="hrms-table-wrap">
      <table className="hrms-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{readableLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, index) => (
            <tr key={row.id ?? row.employee_id ?? index}>
              {columns.map((column) => (
                <td key={column}>
                  {displayValue(row[column]).length > 100
                    ? `${displayValue(row[column]).slice(0, 100)}…`
                    : displayValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function LeaveManagementWorkspace() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("APPROVED");
  const [reviewComments, setReviewComments] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "CASUAL",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canReview = ["ADMIN", "HR", "MANAGER"].includes(role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [leaveResponse, employeeResponse] = await Promise.all([
        api.get("/leaves/"),
        api.get("/employees/").catch(() => ({ data: [] })),
      ]);

      setRecords(
        Array.isArray(leaveResponse.data) ? leaveResponse.data : []
      );

      const employeeData = employeeResponse.data;
      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : Array.isArray(employeeData?.items)
            ? employeeData.items
            : Array.isArray(employeeData?.employees)
              ? employeeData.employees
              : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load leave requests. Please check your session and backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      employee_id: Number(form.employee_id),
    };

    try {
      await api.post("/leaves/", payload);
      setNotice("Leave request submitted successfully.");
      setForm({
        employee_id: "",
        leave_type: "CASUAL",
        start_date: "",
        end_date: "",
        reason: "",
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not submit the leave request."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (leaveId) => {
    if (!window.confirm("Cancel this pending leave request?")) return;

    setError("");
    setNotice("");

    try {
      await api.patch(`/leaves/${leaveId}/cancel`);
      setNotice("Leave request cancelled.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not cancel this request."
      );
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (
      reviewStatus === "REJECTED" &&
      !reviewComments.trim()
    ) {
      setError("A reason is required when rejecting a request.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.patch(`/leaves/${reviewItem.id}/review`, {
        status: reviewStatus,
        reviewer_comments: reviewComments.trim() || null,
      });

      setNotice(
        `Leave request #${reviewItem.id} ${reviewStatus.toLowerCase()}.`
      );
      setReviewItem(null);
      setReviewComments("");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not review this leave request."
      );
    } finally {
      setSaving(false);
    }
  };

  const visibleRecords = records.filter((record) => {
    const matchesStatus =
      statusFilter === "ALL" || record.status === statusFilter;

    const matchesSearch = JSON.stringify(record)
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const count = (status) =>
    records.filter((record) => record.status === status).length;

  const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    background: "#fff",
    color: "#172033",
    font: "inherit",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    border: "none",
    borderRadius: "9px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    font: "inherit",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e7ebf1",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
  };

  const statusStyle = (status) => {
    const styles = {
      PENDING: { background: "#fff3d6", color: "#946200" },
      APPROVED: { background: "#dcfce7", color: "#166534" },
      REJECTED: { background: "#fee2e2", color: "#991b1b" },
      CANCELLED: { background: "#e5e7eb", color: "#374151" },
    };

    return {
      display: "inline-block",
      padding: "5px 9px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 700,
      ...(styles[status] || styles.CANCELLED),
    };
  };

  return (
    <section className="hrms-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO</span>
          <h2>Leave Management</h2>
          <p>Submit requests and manage employee leave approvals.</p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert error hrms-alert">
          <AlertCircle size={17} />
          <span>{String(error)}</span>
        </div>
      )}

      {notice && (
        <div className="alert success">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
        </div>
      )}

      <div className="hrms-module-stats">
        {[
          ["Total Requests", records.length],
          ["Pending", count("PENDING")],
          ["Approved", count("APPROVED")],
          ["Rejected", count("REJECTED")],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px" }}>Leave requests</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Review dates, request reasons, and current status.
            </p>
          </div>

          <button
            type="button"
            style={{
              ...buttonStyle,
              background: "#2563eb",
              color: "#fff",
            }}
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
            }}
          >
            {showForm ? "Close form" : "+ New leave request"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={submitRequest}
            style={{
              marginTop: "22px",
              paddingTop: "20px",
              borderTop: "1px solid #e7ebf1",
            }}
          >
            <h3>Submit a leave request</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <label>
                Employee
                <select
                  name="employee_id"
                  value={form.employee_id}
                  onChange={updateForm}
                  required
                  style={inputStyle}
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                      disabled={employee.employment_status &&
                        employee.employment_status !== "ACTIVE"}
                    >
                      {employee.full_name ||
                        employee.name ||
                        employee.email ||
                        `Employee #${employee.id}`}
                      {" "} (ID: {employee.id})
                    </option>
                  ))}
                </select>
                {employees.length === 0 && (
                  <small>
                    No employee list available. Check your employee access.
                  </small>
                )}
              </label>

              <label>
                Leave type
                <select
                  name="leave_type"
                  value={form.leave_type}
                  onChange={updateForm}
                  style={inputStyle}
                >
                  {[
                    "CASUAL",
                    "SICK",
                    "ANNUAL",
                    "UNPAID",
                    "MATERNITY",
                    "PATERNITY",
                    "OTHER",
                  ].map((type) => (
                    <option key={type} value={type}>
                      {readableLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Start date
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={updateForm}
                  min={new Date().toLocaleDateString("en-CA")}
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                End date
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={updateForm}
                  min={form.start_date ||
                    new Date().toLocaleDateString("en-CA")}
                  required
                  style={inputStyle}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Reason
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={updateForm}
                  minLength={3}
                  maxLength={2000}
                  required
                  rows={3}
                  placeholder="Explain the reason for your leave..."
                  style={inputStyle}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || employees.length === 0}
              style={{
                ...buttonStyle,
                background: "#2563eb",
                color: "#fff",
                marginTop: "16px",
                opacity: saving || employees.length === 0 ? 0.6 : 1,
              }}
            >
              {saving ? "Submitting..." : "Submit request"}
            </button>
          </form>
        )}
      </div>

      {reviewItem && (
        <form onSubmit={submitReview} style={cardStyle}>
          <h3>
            Review request #{reviewItem.id}
          </h3>

          <p>
            Employee #{reviewItem.employee_id} ·{" "}
            {reviewItem.leave_type} ·{" "}
            {reviewItem.start_date} to {reviewItem.end_date}
          </p>

          <label>
            Decision
            <select
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
              style={inputStyle}
            >
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: "14px" }}>
            Reviewer comments
            <textarea
              value={reviewComments}
              onChange={(event) => setReviewComments(event.target.value)}
              required={reviewStatus === "REJECTED"}
              maxLength={2000}
              rows={3}
              placeholder={
                reviewStatus === "REJECTED"
                  ? "Explain why this request is rejected..."
                  : "Optional comments..."
              }
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                background: "#2563eb",
                color: "#fff",
              }}
            >
              {saving ? "Saving..." : "Save decision"}
            </button>

            <button
              type="button"
              onClick={() => setReviewItem(null)}
              style={{ ...buttonStyle, background: "#e5e7eb" }}
            >
              Close
            </button>
          </div>
        </form>
      )}

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leave requests..."
            aria-label="Search leave requests"
            style={{ ...inputStyle, flex: "1 1 220px" }}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter leave status"
            style={{ ...inputStyle, maxWidth: "200px" }}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading && records.length === 0 ? (
          <div className="hrms-empty">Loading leave requests...</div>
        ) : visibleRecords.length === 0 ? (
          <div className="hrms-empty">
            <Search size={24} />
            <h3>No leave requests found</h3>
            <p>Try changing the search or status filter.</p>
          </div>
        ) : (
          <div className="hrms-table-wrap">
            <table className="hrms-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Employee</th>
                  <th>Leave type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Review comments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.id}>
                    <td>#{record.id}</td>
                    <td>
                      {employees.find(
                        (employee) => employee.id === record.employee_id
                      )?.full_name ||
                        employees.find(
                          (employee) => employee.id === record.employee_id
                        )?.name ||
                        `Employee #${record.employee_id}`}
                    </td>
                    <td>{readableLabel(record.leave_type || "")}</td>
                    <td>
                      {record.start_date}
                      <br />
                      to {record.end_date}
                    </td>
                    <td>{record.reason || "—"}</td>
                    <td>
                      <span style={statusStyle(record.status)}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.reviewer_comments || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {canReview && record.status === "PENDING" && (
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              padding: "7px 10px",
                            }}
                            onClick={() => {
                              setReviewItem(record);
                              setReviewStatus("APPROVED");
                              setReviewComments("");
                              setError("");
                            }}
                          >
                            Review
                          </button>
                        )}

                        {record.status === "PENDING" && (
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              background: "#fee2e2",
                              color: "#991b1b",
                              padding: "7px 10px",
                            }}
                            onClick={() => cancelRequest(record.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}


function PayrollManagementWorkspace() {
  useEffect(() => {
    const styleId = "workforce-payroll-workspace-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = payrollStyles;
      document.head.appendChild(style);
    }
  }, []);

  const [tab, setTab] = useState("records");
  const [salaries, setSalaries] = useState([]);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState("");
  const [salaryForm, setSalaryForm] = useState({
    employee_id: "",
    basic_salary: "",
    allowances: "0",
    deductions: "0",
  });
  const [editingId, setEditingId] = useState(null);
  const [recordFilters, setRecordFilters] = useState({
    employee_id: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    status: "",
  });

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canManage = ["ADMIN", "HR"].includes(role);

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [salaryResponse, payrollResponse] = await Promise.all([
        api.get("/payroll/salaries"),
        api.get("/payroll/"),
      ]);
      setSalaries(Array.isArray(salaryResponse.data) ? salaryResponse.data : []);
      setRecords(Array.isArray(payrollResponse.data) ? payrollResponse.data : []);
      try {
        const employeeResponse = await api.get("/employees/");
        setEmployees(Array.isArray(employeeResponse.data) ? employeeResponse.data : []);
      } catch {
        setEmployees([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load payroll data. Check your access permissions and backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const submitSalary = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        employee_id: Number(salaryForm.employee_id),
        basic_salary: Number(salaryForm.basic_salary),
        allowances: Number(salaryForm.allowances || 0),
        deductions: Number(salaryForm.deductions || 0),
      };

      if (editingId) {
        await api.patch(`/payroll/salaries/${editingId}`, {
          basic_salary: payload.basic_salary,
          allowances: payload.allowances,
          deductions: payload.deductions,
        });
        setMessage("Salary structure updated successfully.");
      } else {
        await api.post("/payroll/salaries", payload);
        setMessage("Salary structure created successfully.");
      }

      setSalaryForm({
        employee_id: "",
        basic_salary: "",
        allowances: "0",
        deductions: "0",
      });
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save the salary structure.");
    }
  };

  const editSalary = (salary) => {
    setEditingId(salary.id);
    setSalaryForm({
      employee_id: String(salary.employee_id),
      basic_salary: String(salary.basic_salary),
      allowances: String(salary.allowances ?? 0),
      deductions: String(salary.deductions ?? 0),
    });
    setTab("salaries");
    setError("");
    setMessage("");
  };

  const deactivateSalary = async (salary) => {
    if (!window.confirm("Deactivate this salary structure?")) return;

    try {
      await api.patch(`/payroll/salaries/${salary.id}`, { is_active: false });
      setMessage("Salary structure deactivated.");
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to deactivate salary structure.");
    }
  };

  const generatePayroll = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        `/payroll/generate?month=${Number(month)}&year=${Number(year)}`
      );
      setMessage(
        typeof response.data === "string"
          ? response.data
          : response.data?.message || "Monthly payroll generation completed."
      );
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate monthly payroll.");
    }
  };

  const updateRecordStatus = async (record, action) => {
    const labels = {
      approve: "approve this payroll record",
      "mark-paid": "mark this payroll record as paid",
    };
    if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) return;

    setError("");
    setMessage("");
    try {
      await api.patch(`/payroll/${record.id}/${action}`);
      setMessage(
        action === "approve"
          ? "Payroll record approved."
          : "Payroll record marked as paid."
      );
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update payroll status.");
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    const employee = employees.find((item) => item.id === salary.employee_id);
    const text = [
      salary.id,
      salary.employee_id,
      employee?.name,
      employee?.full_name,
      employee?.email,
    ].join(" ").toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const filteredRecords = records.filter((record) => {
    const employee = employees.find((item) => item.id === record.employee_id);
    const text = [
      record.id,
      record.employee_id,
      employee?.name,
      employee?.full_name,
      employee?.email,
    ].join(" ").toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (!recordFilters.employee_id ||
        String(record.employee_id) === recordFilters.employee_id) &&
      (!recordFilters.month || Number(record.month) === Number(recordFilters.month)) &&
      (!recordFilters.year || Number(record.year) === Number(recordFilters.year)) &&
      (!recordFilters.status || record.status === recordFilters.status)
    );
  });

  const employeeName = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    return employee?.name || employee?.full_name || employee?.email ||
      `Employee #${employeeId}`;
  };

  const resetSalaryForm = () => {
    setEditingId(null);
    setSalaryForm({
      employee_id: "",
      basic_salary: "",
      allowances: "0",
      deductions: "0",
    });
    setError("");
    setMessage("");
  };

  const statusClass = (value) =>
    `payroll-status payroll-status-${String(value || "").toLowerCase()}`;

  return (
    <section className="hrms-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO</span>
          <h2>Payroll Management</h2>
          <p>Manage salary structures, monthly payroll, approvals, and payment status.</p>
        </div>
        <button
          className="secondary-btn"
          type="button"
          onClick={loadAll}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="hrms-module-stats">
        <article>
          <span>Salary structures</span>
          <strong>{salaries.length}</strong>
        </article>
        <article>
          <span>Payroll records</span>
          <strong>{records.length}</strong>
        </article>
        <article>
          <span>Pending approval</span>
          <strong>{records.filter((item) => item.status === "PENDING").length}</strong>
        </article>
        <article>
          <span>Paid records</span>
          <strong>{records.filter((item) => item.status === "PAID").length}</strong>
        </article>
      </div>

      {error && <div className="alert error" role="alert">{String(error)}</div>}
      {message && <div className="alert success" role="status">{String(message)}</div>}

      <div className="payroll-tabs">
        <button
          type="button"
          className={tab === "records" ? "payroll-tab active" : "payroll-tab"}
          onClick={() => setTab("records")}
        >
          Payroll Records
        </button>
        {canManage && (
          <button
            type="button"
            className={tab === "salaries" ? "payroll-tab active" : "payroll-tab"}
            onClick={() => setTab("salaries")}
          >
            Salary Structures
          </button>
        )}
      </div>

      {tab === "records" && (
        <>
          {canManage && (
            <form className="payroll-generate" onSubmit={generatePayroll}>
              <div>
                <h3>Generate Monthly Payroll</h3>
                <p>Create payroll records from active employee salary structures.</p>
              </div>
              <label>
                Month
                <select value={month} onChange={(event) => setMonth(event.target.value)}>
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {new Date(2000, index, 1).toLocaleString("en", { month: "long" })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  required
                />
              </label>
              <button className="primary-btn" type="submit" disabled={loading}>
                Generate Payroll
              </button>
            </form>
          )}

          <div className="payroll-filters">
            <label className="payroll-search">
              Search
              <input
                type="search"
                placeholder="Search employee or record..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Employee
              <select
                value={recordFilters.employee_id}
                onChange={(event) =>
                  setRecordFilters({ ...recordFilters, employee_id: event.target.value })
                }
              >
                <option value="">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.full_name || employee.email ||
                      `Employee #${employee.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Month
              <select
                value={recordFilters.month}
                onChange={(event) =>
                  setRecordFilters({ ...recordFilters, month: event.target.value })
                }
              >
                <option value="">All months</option>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(2000, index, 1).toLocaleString("en", { month: "short" })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Year
              <input
                type="number"
                placeholder="All years"
                value={recordFilters.year}
                onChange={(event) =>
                  setRecordFilters({ ...recordFilters, year: event.target.value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={recordFilters.status}
                onChange={(event) =>
                  setRecordFilters({ ...recordFilters, status: event.target.value })
                }
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </label>
          </div>

          <div className="payroll-table-card">
            <div className="payroll-table-heading">
              <h3>Payroll Records</h3>
              <span>{filteredRecords.length} records</span>
            </div>
            {loading ? (
              <div className="payroll-empty">Loading payroll records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="payroll-empty">No payroll records match your filters.</div>
            ) : (
              <div className="payroll-table-wrap">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Period</th>
                      <th>Basic</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Gross</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      {canManage && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{employeeName(record.employee_id)}</strong>
                          <small>Employee #{record.employee_id}</small>
                        </td>
                        <td>{String(record.month).padStart(2, "0")}/{record.year}</td>
                        <td>{money(record.basic_salary)}</td>
                        <td>{money(record.allowances)}</td>
                        <td>{money(record.deductions)}</td>
                        <td>{money(record.gross_salary)}</td>
                        <td><strong>{money(record.net_salary)}</strong></td>
                        <td>
                          <span className={statusClass(record.status)}>{record.status}</span>
                        </td>
                        {canManage && (
                          <td>
                            <div className="payroll-actions">
                              {record.status === "PENDING" && (
                                <button
                                  className="payroll-action approve"
                                  type="button"
                                  onClick={() => updateRecordStatus(record, "approve")}
                                >
                                  Approve
                                </button>
                              )}
                              {record.status === "APPROVED" && (
                                <button
                                  className="payroll-action paid"
                                  type="button"
                                  onClick={() => updateRecordStatus(record, "mark-paid")}
                                >
                                  Mark Paid
                                </button>
                              )}
                              {record.status === "PAID" && <span>Completed</span>}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "salaries" && canManage && (
        <>
          <form className="payroll-salary-form" onSubmit={submitSalary}>
            <div className="payroll-table-heading">
              <div>
                <h3>{editingId ? "Edit Salary Structure" : "Create Salary Structure"}</h3>
                <p>Set the employee's basic pay, allowances, and deductions.</p>
              </div>
              {editingId && (
                <button className="secondary-btn" type="button" onClick={resetSalaryForm}>
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="payroll-form-grid">
              <label>
                Employee
                <select
                  value={salaryForm.employee_id}
                  onChange={(event) =>
                    setSalaryForm({ ...salaryForm, employee_id: event.target.value })
                  }
                  required
                  disabled={Boolean(editingId)}
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name || employee.full_name || employee.email ||
                        `Employee #${employee.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Basic Salary (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={salaryForm.basic_salary}
                  onChange={(event) =>
                    setSalaryForm({ ...salaryForm, basic_salary: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Allowances (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryForm.allowances}
                  onChange={(event) =>
                    setSalaryForm({ ...salaryForm, allowances: event.target.value })
                  }
                />
              </label>
              <label>
                Deductions (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryForm.deductions}
                  onChange={(event) =>
                    setSalaryForm({ ...salaryForm, deductions: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="payroll-salary-summary">
              <span>Gross: <strong>{money(Number(salaryForm.basic_salary || 0) + Number(salaryForm.allowances || 0))}</strong></span>
              <span>Estimated net: <strong>{money(Number(salaryForm.basic_salary || 0) + Number(salaryForm.allowances || 0) - Number(salaryForm.deductions || 0))}</strong></span>
            </div>
            <button className="primary-btn" type="submit">
              {editingId ? "Save Changes" : "Create Salary Structure"}
            </button>
          </form>

          <div className="payroll-table-card">
            <div className="payroll-table-heading">
              <h3>Employee Salary Structures</h3>
              <span>{filteredSalaries.length} structures</span>
            </div>
            <div className="payroll-filters">
              <label className="payroll-search">
                Search
                <input
                  type="search"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            {filteredSalaries.length === 0 ? (
              <div className="payroll-empty">No salary structures found.</div>
            ) : (
              <div className="payroll-table-wrap">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Estimated Net</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalaries.map((salary) => (
                      <tr key={salary.id}>
                        <td>
                          <strong>{employeeName(salary.employee_id)}</strong>
                          <small>Employee #{salary.employee_id}</small>
                        </td>
                        <td>{money(salary.basic_salary)}</td>
                        <td>{money(salary.allowances)}</td>
                        <td>{money(salary.deductions)}</td>
                        <td>
                          <strong>
                            {money(
                              Number(salary.basic_salary) +
                              Number(salary.allowances) -
                              Number(salary.deductions)
                            )}
                          </strong>
                        </td>
                        <td>
                          <span className={statusClass(String(salary.is_active))}>
                            {String(salary.is_active).toLowerCase() === "true" ||
                            String(salary.is_active).toLowerCase() === "active"
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </td>
                        <td>
                          <div className="payroll-actions">
                            <button
                              className="payroll-action"
                              type="button"
                              onClick={() => editSalary(salary)}
                            >
                              Edit
                            </button>
                            {String(salary.is_active).toLowerCase() !== "false" &&
                              String(salary.is_active).toLowerCase() !== "inactive" && (
                                <button
                                  className="payroll-action danger"
                                  type="button"
                                  onClick={() => deactivateSalary(salary)}
                                >
                                  Deactivate
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}


const payrollStyles = `
.payroll-tabs{display:flex;gap:8px;margin:22px 0 18px;border-bottom:1px solid var(--border,#e5e7eb)}
.payroll-tab{border:0;background:transparent;padding:12px 16px;color:var(--muted,#667085);font-weight:600;cursor:pointer;border-bottom:2px solid transparent}
.payroll-tab.active{color:var(--primary,#3157d5);border-bottom-color:var(--primary,#3157d5)}
.payroll-generate,.payroll-salary-form,.payroll-table-card{background:var(--card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:20px;margin:18px 0}
.payroll-generate{display:flex;align-items:end;gap:14px;flex-wrap:wrap}
.payroll-generate>div{flex:1;min-width:220px}
.payroll-generate h3,.payroll-table-heading h3{margin:0 0 6px;font-size:16px}
.payroll-generate p,.payroll-table-heading p{margin:0;color:var(--muted,#667085);font-size:13px}
.payroll-generate label,.payroll-filters label,.payroll-form-grid label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:600;color:var(--muted,#667085);min-width:125px}
.payroll-generate input,.payroll-generate select,.payroll-filters input,.payroll-filters select,.payroll-form-grid input,.payroll-form-grid select{width:100%;min-height:40px;padding:9px 11px;border:1px solid var(--border,#d0d5dd);border-radius:8px;background:var(--input-bg,#fff);color:var(--text,#101828);font:inherit}
.payroll-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:18px 0}
.payroll-filters label{flex:1}
.payroll-filters .payroll-search{flex:2;min-width:210px}
.payroll-table-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}
.payroll-table-heading>span{font-size:12px;color:var(--muted,#667085)}
.payroll-table-wrap{overflow-x:auto}
.payroll-table{width:100%;border-collapse:collapse;white-space:nowrap}
.payroll-table th,.payroll-table td{text-align:left;padding:13px 12px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px}
.payroll-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#667085);background:var(--table-head,#f9fafb)}
.payroll-table td strong{font-size:12px}
.payroll-table td small{display:block;margin-top:4px;color:var(--muted,#667085);font-size:11px}
.payroll-status{display:inline-flex;padding:5px 9px;border-radius:20px;font-size:10px;font-weight:700;background:#f2f4f7;color:#475467}
.payroll-status-pending{background:#fff4d6;color:#975a00}
.payroll-status-approved,.payroll-status-active,.payroll-status-true{background:#dcfae6;color:#067647}
.payroll-status-paid{background:#dbeafe;color:#1d4ed8}
.payroll-status-rejected,.payroll-status-inactive,.payroll-status-false{background:#fee4e2;color:#b42318}
.payroll-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.payroll-action{border:1px solid var(--border,#d0d5dd);border-radius:7px;background:var(--card,#fff);padding:7px 9px;font-size:11px;font-weight:600;cursor:pointer;color:var(--text,#344054)}
.payroll-action.approve,.payroll-action.paid{background:#ecfdf3;border-color:#abefc6;color:#067647}
.payroll-action.danger{color:#b42318}
.payroll-form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:20px 0}
.payroll-salary-summary{display:flex;gap:24px;flex-wrap:wrap;margin:10px 0 18px;font-size:13px;color:var(--muted,#667085)}
.payroll-salary-summary strong{color:var(--text,#101828)}
.payroll-empty{padding:32px 16px;text-align:center;color:var(--muted,#667085);font-size:13px}
@media(max-width:800px){.payroll-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.payroll-generate{align-items:stretch}.payroll-generate label{flex:1}}
@media(max-width:480px){.payroll-form-grid{grid-template-columns:1fr}.payroll-generate,.payroll-salary-form,.payroll-table-card{padding:14px}}
`;


const shiftWorkspaceStyles = `
.shift-form-card,.shift-list-card{background:var(--card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:20px;margin:18px 0}
.shift-card-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:18px}
.shift-card-heading h3{font-size:16px;margin:0 0 6px}
.shift-card-heading p{font-size:13px;color:var(--muted,#667085);margin:0}
.shift-form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.shift-form-grid label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:600;color:var(--muted,#667085)}
.shift-form-grid input,.shift-form-grid select,.shift-search-row input{width:100%;min-height:41px;padding:9px 11px;border:1px solid var(--border,#d0d5dd);border-radius:8px;background:var(--input-bg,#fff);color:var(--text,#101828);font:inherit}
.shift-form-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:20px;font-size:13px;color:var(--muted,#667085)}
.shift-form-footer strong{color:var(--text,#101828)}
.shift-inactive-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted,#667085);white-space:nowrap}
.shift-inactive-toggle input{width:15px;height:15px}
.shift-search-row{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.shift-search-row input{flex:1}
.shift-search-row span{font-size:12px;color:var(--muted,#667085);white-space:nowrap}
.shift-table-wrap{overflow-x:auto}
.shift-table{width:100%;border-collapse:collapse;white-space:nowrap}
.shift-table th,.shift-table td{text-align:left;padding:13px 12px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px}
.shift-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#667085);background:var(--table-head,#f9fafb)}
.shift-name-cell{display:flex;align-items:center;gap:10px}
.shift-name-cell strong{display:block;font-size:12px}
.shift-name-cell small{display:block;margin-top:4px;color:var(--muted,#667085);font-size:11px}
.shift-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#eef2ff;color:#4338ca;font-size:10px;font-weight:800}
.shift-status{display:inline-flex;padding:5px 9px;border-radius:20px;font-size:10px;font-weight:700}
.shift-active{background:#dcfae6;color:#067647}
.shift-inactive{background:#fee4e2;color:#b42318}
.shift-actions{display:flex;align-items:center;gap:7px}
.shift-action{border:1px solid var(--border,#d0d5dd);border-radius:7px;padding:7px 9px;background:var(--card,#fff);color:var(--text,#344054);font-size:11px;font-weight:600;cursor:pointer}
.shift-action-danger{color:#b42318}
.shift-empty{padding:34px 14px;text-align:center;color:var(--muted,#667085);font-size:13px}
.shift-empty h4{margin:0 0 6px;color:var(--text,#101828)}
.shift-empty p{margin:0}
@media(max-width:850px){.shift-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:500px){.shift-form-grid{grid-template-columns:1fr}.shift-form-card,.shift-list-card{padding:14px}.shift-card-heading{align-items:flex-start;flex-direction:column}}
`;

function ShiftManagementWorkspace() {
  useEffect(() => {
    const styleId = "workforce-shift-workspace-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = shiftWorkspaceStyles;
      document.head.appendChild(style);
    }
  }, []);

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    start_time: "09:00",
    end_time: "18:00",
    break_minutes: "60",
  });

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canManage = ["ADMIN", "HR"].includes(role);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/shifts/?active_only=${showInactive ? "false" : "true"}`
      );
      setShifts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load shifts. Check your access permissions and backend."
      );
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      start_time: "09:00",
      end_time: "18:00",
      break_minutes: "60",
    });
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.start_time === form.end_time) {
      setError("Shift start and end times cannot be identical.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: Number(form.break_minutes),
      };

      if (editingId !== null) {
        await api.patch(`/shifts/${editingId}`, payload);
        setMessage("Shift updated successfully.");
      } else {
        await api.post("/shifts/", payload);
        setMessage("Shift created successfully.");
      }

      resetForm();
      setMessage(
        editingId !== null
          ? "Shift updated successfully."
          : "Shift created successfully."
      );
      await loadShifts();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save this shift.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (shift) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      start_time: String(shift.start_time).slice(0, 5),
      end_time: String(shift.end_time).slice(0, 5),
      break_minutes: String(shift.break_minutes ?? 60),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deactivateShift = async (shift) => {
    if (!window.confirm(`Deactivate the "${shift.name}" shift?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/shifts/${shift.id}/deactivate`);
      setMessage(`"${shift.name}" was deactivated successfully.`);
      await loadShifts();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to deactivate this shift.");
    }
  };

  const filteredShifts = shifts.filter((shift) =>
    `${shift.name} ${shift.start_time} ${shift.end_time}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const getDuration = (shift) => {
    const [startHour, startMinute] = String(shift.start_time).split(":").map(Number);
    const [endHour, endMinute] = String(shift.end_time).split(":").map(Number);

    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 24 * 60;

    minutes = Math.max(0, minutes - Number(shift.break_minutes || 0));

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <section className="hrms-workspace shift-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO</span>
          <h2>Shift Management</h2>
          <p>Configure working shifts, hours, and break durations.</p>
        </div>

        <button
          className="secondary-btn"
          type="button"
          onClick={loadShifts}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="hrms-module-stats">
        <article>
          <span>Shifts displayed</span>
          <strong>{shifts.length}</strong>
        </article>
        <article>
          <span>Active shifts</span>
          <strong>{shifts.filter((shift) => shift.is_active).length}</strong>
        </article>
        <article>
          <span>Inactive shifts</span>
          <strong>{shifts.filter((shift) => !shift.is_active).length}</strong>
        </article>
      </div>

      {error && <div className="alert error" role="alert">{String(error)}</div>}
      {message && <div className="alert success" role="status">{String(message)}</div>}

      {canManage && (
        <form className="shift-form-card" onSubmit={handleSubmit}>
          <div className="shift-card-heading">
            <div>
              <h3>{editingId !== null ? "Edit Shift" : "Create New Shift"}</h3>
              <p>Configure the shift name, working hours, and break duration.</p>
            </div>

            {editingId !== null && (
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="shift-form-grid">
            <label>
              Shift Name
              <input
                type="text"
                minLength={2}
                maxLength={100}
                placeholder="e.g. Morning Shift"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>

            <label>
              Start Time
              <input
                type="time"
                value={form.start_time}
                onChange={(event) =>
                  setForm({ ...form, start_time: event.target.value })
                }
                required
              />
            </label>

            <label>
              End Time
              <input
                type="time"
                value={form.end_time}
                onChange={(event) =>
                  setForm({ ...form, end_time: event.target.value })
                }
                required
              />
            </label>

            <label>
              Break Duration
              <select
                value={form.break_minutes}
                onChange={(event) =>
                  setForm({ ...form, break_minutes: event.target.value })
                }
              >
                <option value="0">No break</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
                <option value="180">180 minutes</option>
                <option value="240">240 minutes</option>
              </select>
            </label>
          </div>

          <div className="shift-form-footer">
            <span>
              Net working time:{" "}
              <strong>
                {(() => {
                  const [sh, sm] = form.start_time.split(":").map(Number);
                  const [eh, em] = form.end_time.split(":").map(Number);
                  let duration = eh * 60 + em - (sh * 60 + sm);
                  if (duration < 0) duration += 1440;
                  duration = Math.max(0, duration - Number(form.break_minutes));
                  return `${Math.floor(duration / 60)}h ${duration % 60}m`;
                })()}
              </strong>
            </span>

            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Create Shift"}
            </button>
          </div>
        </form>
      )}

      <div className="shift-list-card">
        <div className="shift-card-heading">
          <div>
            <h3>Shift Directory</h3>
            <p>View and manage configured working shifts.</p>
          </div>

          <label className="shift-inactive-toggle">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Include inactive
          </label>
        </div>

        <div className="shift-search-row">
          <input
            type="search"
            placeholder="Search by shift name or time..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>{filteredShifts.length} shifts</span>
        </div>

        {loading ? (
          <div className="shift-empty">Loading shifts...</div>
        ) : filteredShifts.length === 0 ? (
          <div className="shift-empty">
            <h4>No shifts found</h4>
            <p>Create a shift or change your search filters.</p>
          </div>
        ) : (
          <div className="shift-table-wrap">
            <table className="shift-table">
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Break</th>
                  <th>Net Hours</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      <div className="shift-name-cell">
                        <span className="shift-icon">
                          {shift.start_time < "12:00:00" ? "AM" : "PM"}
                        </span>
                        <div>
                          <strong>{shift.name}</strong>
                          <small>Shift #{shift.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{String(shift.start_time).slice(0, 5)}</td>
                    <td>{String(shift.end_time).slice(0, 5)}</td>
                    <td>{shift.break_minutes} min</td>
                    <td><strong>{getDuration(shift)}</strong></td>
                    <td>
                      <span
                        className={
                          shift.is_active
                            ? "shift-status shift-active"
                            : "shift-status shift-inactive"
                        }
                      >
                        {shift.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="shift-actions">
                          {shift.is_active && (
                            <>
                              <button
                                type="button"
                                className="shift-action"
                                onClick={() => startEditing(shift)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="shift-action shift-action-danger"
                                onClick={() => deactivateShift(shift)}
                              >
                                Deactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}





function PerformanceReviewWorkspace() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ total_reviews: 0, draft: 0, published: 0, acknowledged: 0, average_published_rating: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", review_period: "", review_date: new Date().toISOString().slice(0, 10),
    rating: "3", strengths: "", improvement_areas: "", feedback: "", goals: "",
  });

  const managerRole = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canManage = ["ADMIN", "HR", "MANAGER"].includes(managerRole);
  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };
  const primaryButtonStyle = { ...buttonStyle, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" };

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const requests = [api.get("/performance-reviews/")];
      if (canManage) requests.push(api.get("/performance-reviews/summary"));
      const results = await Promise.all(requests);
      setReviews(Array.isArray(results[0].data) ? results[0].data : []);
      if (canManage && results[1]?.data) setSummary(results[1].data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load performance reviews. Please check your access and API connection.");
    } finally { setLoading(false); }
  }, [canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ employee_id: "", review_period: "", review_date: new Date().toISOString().slice(0, 10), rating: "3", strengths: "", improvement_areas: "", feedback: "", goals: "" });
    setEditingId(null); setFormOpen(false);
  };

  const startEdit = (review) => {
    setForm({
      employee_id: String(review.employee_id), review_period: review.review_period || "",
      review_date: review.review_date || new Date().toISOString().slice(0, 10),
      rating: String(review.rating || 3), strengths: review.strengths || "",
      improvement_areas: review.improvement_areas || "", feedback: review.feedback || "", goals: review.goals || "",
    });
    setEditingId(review.id); setFormOpen(true); setError(""); setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = {
        review_period: form.review_period.trim(), review_date: form.review_date, rating: Number(form.rating),
        strengths: form.strengths.trim() || null, improvement_areas: form.improvement_areas.trim() || null,
        feedback: form.feedback.trim(), goals: form.goals.trim() || null,
      };
      if (editingId) {
        await api.patch(`/performance-reviews/${editingId}`, payload);
        setNotice("Draft review updated successfully.");
      } else {
        await api.post("/performance-reviews/", { ...payload, employee_id: Number(form.employee_id) });
        setNotice("Performance review created as a draft.");
      }
      resetForm(); await loadData();
    } catch (err) { setError(err.response?.data?.detail || "Unable to save this review."); }
    finally { setSaving(false); }
  };

  const publishReview = async (reviewId) => {
    if (!window.confirm("Publish this review? The employee will be able to view it.")) return;
    setError(""); setNotice("");
    try {
      await api.post(`/performance-reviews/${reviewId}/publish`);
      setNotice("Review published successfully."); await loadData();
    } catch (err) { setError(err.response?.data?.detail || "Unable to publish this review."); }
  };

  const acknowledgeReview = async (reviewId) => {
    setError(""); setNotice("");
    try {
      await api.post(`/performance-reviews/${reviewId}/acknowledge`);
      setNotice("Review acknowledged successfully."); await loadData();
    } catch (err) { setError(err.response?.data?.detail || "Unable to acknowledge this review."); }
  };

  const visibleReviews = reviews.filter((review) => {
    const matchesStatus = statusFilter === "ALL" || review.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [review.employee_name, review.reviewer_name, review.review_period, review.status, String(review.employee_id), String(review.id)]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const statusColors = {
    DRAFT: { color: "#92400e", background: "#fef3c7" },
    PUBLISHED: { color: "#1d4ed8", background: "#dbeafe" },
    ACKNOWLEDGED: { color: "#166534", background: "#dcfce7" },
  };
  const metricCards = [
    ["Total reviews", summary.total_reviews ?? reviews.length],
    ["Drafts", summary.draft ?? reviews.filter((r) => r.status === "DRAFT").length],
    ["Published", summary.published ?? reviews.filter((r) => r.status === "PUBLISHED").length],
    ["Acknowledged", summary.acknowledged ?? reviews.filter((r) => r.status === "ACKNOWLEDGED").length],
  ];

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Performance Reviews</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Create reviews, track ratings, and manage the publish and acknowledgement workflow.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={loadData}>Refresh</button>
          {canManage && <button type="button" style={primaryButtonStyle} onClick={() => {
            if (formOpen && !editingId) resetForm();
            else { setEditingId(null); setFormOpen(true); setError(""); setNotice(""); }
          }}>{formOpen && !editingId ? "Close form" : "Create review"}</button>}
        </div>
      </div>

      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}
      {notice && <div role="status" style={{ ...panelStyle, color: "#166534", background: "#f0fdf4", borderColor: "#bbf7d0" }}>{notice}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
        {metricCards.map(([label, value]) => <div key={label} style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>{label}</div><div style={{ fontSize: 28, fontWeight: 750, marginTop: 8 }}>{value}</div></div>)}
        <div style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>Average published rating</div><div style={{ fontSize: 28, fontWeight: 750, marginTop: 8 }}>{summary.average_published_rating == null ? "—" : `${summary.average_published_rating} / 5`}</div></div>
      </div>

      {canManage && formOpen && <form onSubmit={handleSubmit} style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <h3 style={{ margin: 0 }}>{editingId ? `Edit draft review #${editingId}` : "Create performance review"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {!editingId && <label style={{ display: "grid", gap: 6 }}>Employee ID<input style={fieldStyle} type="number" min="1" required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="Enter employee ID" /></label>}
          <label style={{ display: "grid", gap: 6 }}>Review period<input style={fieldStyle} required minLength={2} maxLength={100} value={form.review_period} onChange={(e) => setForm({ ...form, review_period: e.target.value })} placeholder="e.g. Q3 2026" /></label>
          <label style={{ display: "grid", gap: 6 }}>Review date<input style={fieldStyle} type="date" required value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 6 }}>Rating<select style={fieldStyle} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5{rating === 5 ? " — Outstanding" : rating === 4 ? " — Exceeds expectations" : rating === 3 ? " — Meets expectations" : rating === 2 ? " — Needs improvement" : " — Unsatisfactory"}</option>)}</select></label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>Strengths<textarea style={fieldStyle} rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} placeholder="Key strengths and achievements" /></label>
        <label style={{ display: "grid", gap: 6 }}>Areas for improvement<textarea style={fieldStyle} rows={2} value={form.improvement_areas} onChange={(e) => setForm({ ...form, improvement_areas: e.target.value })} placeholder="Skills or areas to develop" /></label>
        <label style={{ display: "grid", gap: 6 }}>Feedback — required<textarea style={fieldStyle} rows={3} required minLength={3} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} placeholder="Write constructive performance feedback" /></label>
        <label style={{ display: "grid", gap: 6 }}>Goals<textarea style={fieldStyle} rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Goals for the next review period" /></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="submit" style={primaryButtonStyle} disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create draft"}</button><button type="button" style={buttonStyle} onClick={resetForm} disabled={saving}>Cancel</button></div>
      </form>}

      <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 240px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, period, reviewer, or review ID..." />
          <select style={{ ...fieldStyle, maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ACKNOWLEDGED">Acknowledged</option></select>
        </div>
        {loading ? <p>Loading performance reviews...</p> : visibleReviews.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "var(--muted, #6b7280)" }}><h3 style={{ margin: "0 0 6px", color: "var(--text, #111827)" }}>No reviews found</h3><p style={{ margin: 0 }}>Try changing the search or status filter.</p></div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {visibleReviews.map((review) => <article key={review.id} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h3 style={{ margin: 0 }}>{review.employee_name || `Employee #${review.employee_id}`}</h3><p style={{ margin: "5px 0 0", color: "var(--muted, #6b7280)", fontSize: 13 }}>Review #{review.id} · {review.review_period} · {review.review_date || "No date"}</p></div><span style={{ ...statusColors[review.status], borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{review.status}</span></div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}><span><strong>Rating:</strong> {review.rating} / 5</span><span><strong>Reviewer:</strong> {review.reviewer_name || "—"}</span>{review.employee_acknowledged && <span><strong>Acknowledged:</strong> {review.employee_acknowledged}</span>}</div>
              {review.strengths && <div><strong>Strengths</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{review.strengths}</p></div>}
              {review.improvement_areas && <div><strong>Areas for improvement</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{review.improvement_areas}</p></div>}
              <div><strong>Feedback</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{review.feedback}</p></div>
              {review.goals && <div><strong>Goals</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{review.goals}</p></div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canManage && review.status === "DRAFT" && <><button type="button" style={buttonStyle} onClick={() => startEdit(review)}>Edit draft</button><button type="button" style={primaryButtonStyle} onClick={() => publishReview(review.id)}>Publish review</button></>}
                {!canManage && review.status === "PUBLISHED" && <button type="button" style={primaryButtonStyle} onClick={() => acknowledgeReview(review.id)}>Acknowledge review</button>}
              </div>
            </article>)}
          </div>
        )}
      </div>
    </section>
  );
}



function NotificationsWorkspace() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [sending, setSending] = useState(false);

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canSend = ["ADMIN", "HR"].includes(role);
  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };
  const primaryStyle = { ...buttonStyle, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" };

  const loadNotifications = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [listResult, countResult] = await Promise.all([
        api.get("/notifications/", { params: { limit: 100 } }),
        api.get("/notifications/unread-count"),
      ]);
      setNotifications(Array.isArray(listResult.data) ? listResult.data : []);
      setUnreadCount(Number(countResult.data?.unread_count || 0));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load notifications. Please check your access and API connection.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (notification, isRead) => {
    setBusyId(notification.id); setError(""); setNotice("");
    try {
      await api.patch(`/notifications/${notification.id}/read`, { is_read: isRead });
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: isRead, read_at: isRead ? new Date().toISOString() : null } : item));
      setUnreadCount((count) => Math.max(0, count + (isRead ? -1 : 1)));
      setNotice(isRead ? "Notification marked as read." : "Notification marked as unread.");
    } catch (err) { setError(err.response?.data?.detail || "Could not update notification status."); }
    finally { setBusyId(null); }
  };

  const markAllRead = async () => {
    setBusyId("all"); setError(""); setNotice("");
    try {
      const result = await api.patch("/notifications/read-all");
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0);
      setNotice(result.data?.message || "All notifications marked as read.");
    } catch (err) { setError(err.response?.data?.detail || "Could not mark all notifications as read."); }
    finally { setBusyId(null); }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm("Delete this notification?")) return;
    setBusyId(notificationId); setError(""); setNotice("");
    try {
      await api.delete(`/notifications/${notificationId}`);
      const removed = notifications.find((item) => item.id === notificationId);
      setNotifications((items) => items.filter((item) => item.id !== notificationId));
      if (removed && !removed.is_read) setUnreadCount((count) => Math.max(0, count - 1));
      setNotice("Notification deleted.");
    } catch (err) { setError(err.response?.data?.detail || "Could not delete notification."); }
    finally { setBusyId(null); }
  };

  const sendNotification = async (event) => {
    event.preventDefault(); setSending(true); setError(""); setNotice("");
    try {
      await api.post("/notifications/", { user_id: Number(recipientId), title: title.trim(), message: message.trim(), category: category.trim().toUpperCase() });
      setNotice("Notification sent successfully.");
      setRecipientId(""); setTitle(""); setMessage(""); setCategory("GENERAL"); setShowComposer(false);
    } catch (err) { setError(err.response?.data?.detail || "Could not send notification. Confirm the recipient user ID and try again."); }
    finally { setSending(false); }
  };

  const filtered = notifications.filter((item) => {
    const matchesCategory = categoryFilter === "ALL" || String(item.category || "").toUpperCase() === categoryFilter;
    const matchesUnread = !unreadOnly || !item.is_read;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [item.title, item.message, item.category, String(item.id)].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesCategory && matchesUnread && matchesSearch;
  });
  const categoryOptions = [...new Set(notifications.map((item) => String(item.category || "GENERAL").toUpperCase()))].sort();
  const dateText = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  };

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Notifications</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>View alerts, manage read status, and keep your notification inbox organized.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={loadNotifications}>Refresh</button>
          {unreadCount > 0 && <button type="button" style={buttonStyle} onClick={markAllRead} disabled={busyId === "all"}>{busyId === "all" ? "Updating..." : "Mark all read"}</button>}
          {canSend && <button type="button" style={primaryStyle} onClick={() => { setShowComposer((open) => !open); setError(""); setNotice(""); }}>{showComposer ? "Close composer" : "Send notification"}</button>}
        </div>
      </div>
      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}
      {notice && <div role="status" style={{ ...panelStyle, color: "#166534", background: "#f0fdf4", borderColor: "#bbf7d0" }}>{notice}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={panelStyle}><div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>Total loaded</div><div style={{ fontSize: 28, fontWeight: 750, marginTop: 8 }}>{notifications.length}</div></div>
        <div style={panelStyle}><div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>Unread notifications</div><div style={{ fontSize: 28, fontWeight: 750, marginTop: 8 }}>{unreadCount}</div></div>
        <div style={panelStyle}><div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>Read notifications</div><div style={{ fontSize: 28, fontWeight: 750, marginTop: 8 }}>{notifications.filter((item) => item.is_read).length}</div></div>
      </div>

      {canSend && showComposer && <form onSubmit={sendNotification} style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <h3 style={{ margin: 0 }}>Send a notification</h3>
        <p style={{ margin: 0, color: "var(--muted, #6b7280)", fontSize: 13 }}>Available to Admin and HR. Enter the recipient's active user ID.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>Recipient user ID<input style={fieldStyle} type="number" min="1" required value={recipientId} onChange={(e) => setRecipientId(e.target.value)} placeholder="e.g. 12" /></label>
          <label style={{ display: "grid", gap: 6 }}>Category<input style={fieldStyle} required maxLength={50} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="GENERAL, HR, PAYROLL..." /></label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>Title<input style={fieldStyle} required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" /></label>
        <label style={{ display: "grid", gap: 6 }}>Message<textarea style={fieldStyle} required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the notification message" /></label>
        <div><button type="submit" style={primaryStyle} disabled={sending}>{sending ? "Sending..." : "Send notification"}</button></div>
      </form>}

      <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 240px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, message, category, or ID..." />
          <select style={{ ...fieldStyle, maxWidth: 220 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="ALL">All categories</option>{categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          <label style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only</label>
        </div>
        {loading ? <p>Loading notifications...</p> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "var(--muted, #6b7280)" }}><h3 style={{ margin: "0 0 6px", color: "var(--text, #111827)" }}>No notifications found</h3><p style={{ margin: 0 }}>You're all caught up, or no notifications match your filters.</p></div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((item) => <article key={item.id} style={{ border: `1px solid ${item.is_read ? "var(--border, #e5e7eb)" : "#93c5fd"}`, borderRadius: 12, padding: 16, display: "grid", gap: 10, background: item.is_read ? "var(--card, #fff)" : "var(--unread-bg, #eff6ff)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 7, flexShrink: 0, background: item.is_read ? "#9ca3af" : "#2563eb" }} /><div><h3 style={{ margin: 0, fontSize: 16 }}>{item.title}</h3><p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted, #6b7280)" }}>#{item.id} · {String(item.category || "GENERAL").toUpperCase()} · {dateText(item.created_at)}</p></div></div>
                <span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, color: item.is_read ? "#4b5563" : "#1d4ed8", background: item.is_read ? "#f3f4f6" : "#dbeafe" }}>{item.is_read ? "READ" : "UNREAD"}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{item.message}</p>
              {item.read_at && <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>Read at: {dateText(item.read_at)}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={buttonStyle} disabled={busyId === item.id} onClick={() => markRead(item, !item.is_read)}>{busyId === item.id ? "Updating..." : item.is_read ? "Mark unread" : "Mark read"}</button><button type="button" style={buttonStyle} disabled={busyId === item.id} onClick={() => deleteNotification(item.id)}>Delete</button></div>
            </article>)}
          </div>
        )}
      </div>
    </section>
  );
}



function WorkflowTaskWorkspace() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("TODO");
  const [completionNotes, setCompletionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canManage = ["ADMIN", "HR", "MANAGER"].includes(role);
  const canDelete = ["ADMIN", "HR"].includes(role);
  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };
  const primaryStyle = { ...buttonStyle, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" };

  const loadTasks = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [taskResult, summaryResult] = await Promise.all([
        api.get("/workflow-tasks/", { params: { limit: 500 } }),
        api.get("/workflow-tasks/summary"),
      ]);
      setTasks(Array.isArray(taskResult.data) ? taskResult.data : []);
      setSummary(summaryResult.data || {});
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load tasks. Please check your access and API connection.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const resetForm = () => {
    setEditingTask(null); setTitle(""); setDescription(""); setAssignedTo("");
    setPriority("MEDIUM"); setDueDate(""); setStatus("TODO"); setCompletionNotes("");
  };
  const startCreate = () => { resetForm(); setShowForm(true); setError(""); setNotice(""); };
  const startEdit = (task) => {
    setEditingTask(task); setTitle(task.title || ""); setDescription(task.description || "");
    setAssignedTo(String(task.assigned_to || "")); setPriority(task.priority || "MEDIUM");
    setDueDate(task.due_date || ""); setStatus(task.status || "TODO");
    setCompletionNotes(task.completion_notes || ""); setShowForm(true); setError(""); setNotice("");
  };

  const saveTask = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (editingTask) {
        const payload = canManage
          ? { title: title.trim(), description: description.trim() || null, assigned_to: Number(assignedTo), priority, status, due_date: dueDate || null, completion_notes: completionNotes.trim() || null }
          : { status, completion_notes: completionNotes.trim() || null };
        await api.patch(`/workflow-tasks/${editingTask.id}`, payload);
        setNotice("Task updated successfully.");
      } else {
        await api.post("/workflow-tasks/", { title: title.trim(), description: description.trim() || null, assigned_to: Number(assignedTo), priority, due_date: dueDate || null });
        setNotice("Task created successfully.");
      }
      setShowForm(false); resetForm(); await loadTasks();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save task. Please check the entered details.");
    } finally { setSaving(false); }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setBusyId(task.id); setError(""); setNotice("");
    try {
      await api.delete(`/workflow-tasks/${task.id}`);
      setTasks((items) => items.filter((item) => item.id !== task.id));
      setNotice("Task deleted successfully.");
      await loadTasks();
    } catch (err) { setError(err.response?.data?.detail || "Could not delete task."); }
    finally { setBusyId(null); }
  };

  const filtered = tasks.filter((task) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [task.title, task.description, task.assignee_name, task.creator_name, String(task.id)].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "ALL" || task.status === statusFilter) && (priorityFilter === "ALL" || task.priority === priorityFilter) && (!overdueOnly || task.is_overdue);
  });
  const dateText = (value) => {
    if (!value) return "No due date";
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };
  const statusColors = { TODO: ["#f3f4f6", "#374151"], IN_PROGRESS: ["#dbeafe", "#1d4ed8"], COMPLETED: ["#dcfce7", "#166534"], CANCELLED: ["#fee2e2", "#991b1b"] };
  const priorityColors = { LOW: ["#f3f4f6", "#4b5563"], MEDIUM: ["#e0f2fe", "#075985"], HIGH: ["#ffedd5", "#9a3412"], URGENT: ["#fee2e2", "#991b1b"] };

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Workflow &amp; Task Management</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Assign work, track progress, and manage due dates and priorities.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={buttonStyle} onClick={loadTasks}>Refresh</button>{canManage && <button type="button" style={primaryStyle} onClick={startCreate}>Create task</button>}</div>
      </div>
      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}
      {notice && <div role="status" style={{ ...panelStyle, color: "#166534", background: "#f0fdf4", borderColor: "#bbf7d0" }}>{notice}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 }}>
        {[["Total tasks", summary.total ?? 0], ["To do", summary.todo ?? 0], ["In progress", summary.in_progress ?? 0], ["Completed", summary.completed ?? 0], ["Overdue", summary.overdue ?? 0], ["High priority", summary.high_priority ?? 0]].map(([label, value]) => <div key={label} style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>{label}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{value}</div></div>)}
      </div>
      {showForm && <form onSubmit={saveTask} style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h3 style={{ margin: 0 }}>{editingTask ? `Update task #${editingTask.id}` : "Create a task"}</h3><button type="button" style={buttonStyle} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button></div>
        {canManage ? <>
          <label style={{ display: "grid", gap: 6 }}>Task title<input style={fieldStyle} required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title" /></label>
          <label style={{ display: "grid", gap: 6 }}>Description<textarea style={fieldStyle} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the task and expected outcome" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>Assigned user ID<input style={fieldStyle} type="number" min="1" required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Active user ID" /></label>
            <label style={{ display: "grid", gap: 6 }}>Priority<select style={fieldStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={{ display: "grid", gap: 6 }}>Due date<input style={fieldStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            {editingTask && <label style={{ display: "grid", gap: 6 }}>Status<select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value)}>{["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label>}
          </div>
        </> : <div style={{ padding: 12, borderRadius: 8, background: "var(--subtle-bg, #f9fafb)" }}>You can update the status and completion notes for tasks assigned to you.</div>}
        <label style={{ display: "grid", gap: 6 }}>Completion notes<textarea style={fieldStyle} rows={2} value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="Add progress or completion notes" /></label>
        <div><button type="submit" style={primaryStyle} disabled={saving}>{saving ? "Saving..." : editingTask ? "Save changes" : "Create task"}</button></div>
      </form>}
      <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 220px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search task, assignee, or ID..." />
          <select style={{ ...fieldStyle, maxWidth: 190 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select>
          <select style={{ ...fieldStyle, maxWidth: 170 }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="ALL">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
        </div>
        {loading ? <p>Loading tasks...</p> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 28, color: "var(--muted, #6b7280)" }}><h3 style={{ margin: "0 0 6px", color: "var(--text, #111827)" }}>No tasks found</h3><p style={{ margin: 0 }}>Try changing your filters or create a task if you have permission.</p></div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((task) => <article key={task.id} style={{ border: `1px solid ${task.is_overdue ? "#fca5a5" : "var(--border, #e5e7eb)"}`, borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div><h3 style={{ margin: 0, fontSize: 17 }}>{task.title}</h3><p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted, #6b7280)" }}>Task #{task.id}{task.assignee_name ? ` · Assigned to ${task.assignee_name}` : ` · User ${task.assigned_to}`}{task.creator_name ? ` · Created by ${task.creator_name}` : ""}</p></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, background: (statusColors[task.status] || statusColors.TODO)[0], color: (statusColors[task.status] || statusColors.TODO)[1] }}>{String(task.status || "TODO").replace("_", " ")}</span><span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, background: (priorityColors[task.priority] || priorityColors.MEDIUM)[0], color: (priorityColors[task.priority] || priorityColors.MEDIUM)[1] }}>{task.priority}</span>{task.is_overdue && <span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>OVERDUE</span>}</div>
              </div>
              {task.description && <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{task.description}</p>}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: task.is_overdue ? "#b91c1c" : "var(--muted, #6b7280)" }}><span>Due: {dateText(task.due_date)}</span>{task.completed_at && <span>Completed: {new Date(task.completed_at).toLocaleString()}</span>}</div>
              {task.completion_notes && <div style={{ padding: 10, borderRadius: 8, background: "var(--subtle-bg, #f9fafb)" }}><strong style={{ fontSize: 13 }}>Completion notes</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{task.completion_notes}</p></div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={buttonStyle} onClick={() => startEdit(task)}>{canManage ? "Edit task" : "Update progress"}</button>{canDelete && <button type="button" style={buttonStyle} disabled={busyId === task.id} onClick={() => deleteTask(task)}>{busyId === task.id ? "Deleting..." : "Delete task"}</button>}</div>
            </article>)}
          </div>
        )}
      </div>
    </section>
  );
}


function InterventionManagementWorkspace() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [predictionId, setPredictionId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [interventionType, setInterventionType] = useState("RETENTION");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [actionPlan, setActionPlan] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canManage = ["ADMIN", "HR", "MANAGER"].includes(role);
  const canDelete = ["ADMIN", "HR"].includes(role);
  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };
  const primaryStyle = { ...buttonStyle, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" };

  const loadItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [listResult, summaryResult] = await Promise.all([
        api.get("/interventions/", { params: { limit: 500 } }),
        api.get("/interventions/summary"),
      ]);
      setItems(Array.isArray(listResult.data) ? listResult.data : []);
      setSummary(summaryResult.data || {});
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load interventions. Admin, HR, or Manager access is required.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const resetForm = () => {
    setEditingItem(null); setEmployeeId(""); setPredictionId(""); setAssignedTo("");
    setInterventionType("RETENTION"); setTitle(""); setDescription(""); setPriority("MEDIUM");
    setActionPlan(""); setDueDate(""); setStatus("OPEN"); setOutcomeNotes("");
  };

  const startCreate = () => { resetForm(); setShowForm(true); setError(""); setNotice(""); };
  const startEdit = (item) => {
    setEditingItem(item); setEmployeeId(String(item.employee_id || ""));
    setPredictionId(item.prediction_id ? String(item.prediction_id) : "");
    setAssignedTo(item.assigned_to ? String(item.assigned_to) : "");
    setInterventionType(item.intervention_type || "RETENTION"); setTitle(item.title || "");
    setDescription(item.description || ""); setPriority(item.priority || "MEDIUM");
    setActionPlan(item.action_plan || ""); setDueDate(item.due_date || "");
    setStatus(item.status || "OPEN"); setOutcomeNotes(item.outcome_notes || "");
    setShowForm(true); setError(""); setNotice("");
  };

  const saveItem = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (editingItem) {
        await api.patch(`/interventions/${editingItem.id}`, {
          assigned_to: assignedTo ? Number(assignedTo) : null,
          priority, status, action_plan: actionPlan.trim() || null,
          outcome_notes: outcomeNotes.trim() || null, due_date: dueDate || null,
        });
        setNotice("Intervention updated successfully.");
      } else {
        await api.post("/interventions/", {
          employee_id: Number(employeeId),
          prediction_id: predictionId ? Number(predictionId) : null,
          assigned_to: assignedTo ? Number(assignedTo) : null,
          intervention_type: interventionType.trim(),
          title: title.trim(),
          description: description.trim(),
          priority,
          action_plan: actionPlan.trim() || null,
          due_date: dueDate || null,
        });
        setNotice("Intervention created successfully.");
      }
      setShowForm(false); resetForm(); await loadItems();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save intervention. Check the employee, user, and prediction IDs.");
    } finally { setSaving(false); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete intervention "${item.title}"? This cannot be undone.`)) return;
    setBusyId(item.id); setError(""); setNotice("");
    try {
      await api.delete(`/interventions/${item.id}`);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setNotice("Intervention deleted successfully.");
      await loadItems();
    } catch (err) { setError(err.response?.data?.detail || "Could not delete intervention."); }
    finally { setBusyId(null); }
  };

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [item.title, item.description, item.employee_name, item.intervention_type, String(item.employee_id), String(item.id)].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "ALL" || item.status === statusFilter) && (priorityFilter === "ALL" || item.priority === priorityFilter);
  });
  const dateText = (value) => {
    if (!value) return "No due date";
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };
  const statusColors = { OPEN: ["#dbeafe", "#1d4ed8"], IN_PROGRESS: ["#ffedd5", "#9a3412"], COMPLETED: ["#dcfce7", "#166534"], CANCELLED: ["#f3f4f6", "#4b5563"] };
  const priorityColors = { LOW: ["#f3f4f6", "#4b5563"], MEDIUM: ["#e0f2fe", "#075985"], HIGH: ["#ffedd5", "#9a3412"], URGENT: ["#fee2e2", "#991b1b"] };

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Employee Interventions</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Coordinate employee retention actions and track their outcomes.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={buttonStyle} onClick={loadItems}>Refresh</button>{canManage && <button type="button" style={primaryStyle} onClick={startCreate}>Create intervention</button>}</div>
      </div>
      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}
      {notice && <div role="status" style={{ ...panelStyle, color: "#166534", background: "#f0fdf4", borderColor: "#bbf7d0" }}>{notice}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 }}>
        {[["Total", summary.total ?? 0], ["Open", summary.open ?? 0], ["In progress", summary.in_progress ?? 0], ["Completed", summary.completed ?? 0], ["Overdue", summary.overdue ?? 0], ["High priority", summary.high_priority ?? 0]].map(([label, value]) => <div key={label} style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>{label}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{value}</div></div>)}
      </div>

      {showForm && <form onSubmit={saveItem} style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h3 style={{ margin: 0 }}>{editingItem ? `Update intervention #${editingItem.id}` : "Create an intervention"}</h3><button type="button" style={buttonStyle} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button></div>
        {!editingItem ? <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>Employee ID<input style={fieldStyle} type="number" min="1" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee record ID" /></label>
            <label style={{ display: "grid", gap: 6 }}>Prediction ID (optional)<input style={fieldStyle} type="number" min="1" value={predictionId} onChange={(e) => setPredictionId(e.target.value)} placeholder="Related attrition prediction ID" /></label>
            <label style={{ display: "grid", gap: 6 }}>Assigned user ID (optional)<input style={fieldStyle} type="number" min="1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Active user ID" /></label>
            <label style={{ display: "grid", gap: 6 }}>Intervention type<input style={fieldStyle} required minLength={2} maxLength={80} value={interventionType} onChange={(e) => setInterventionType(e.target.value)} placeholder="RETENTION, COACHING..." /></label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>Title<input style={fieldStyle} required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intervention title" /></label>
          <label style={{ display: "grid", gap: 6 }}>Description<textarea style={fieldStyle} required minLength={3} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the concern and intended support" /></label>
        </> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>Priority<select style={fieldStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6 }}>Status<select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value)}>{["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6 }}>Due date<input style={fieldStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
          {editingItem && <label style={{ display: "grid", gap: 6 }}>Assigned user ID (blank to clear)<input style={fieldStyle} type="number" min="1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Active user ID" /></label>}
        </div>
        <label style={{ display: "grid", gap: 6 }}>Action plan<textarea style={fieldStyle} rows={3} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} placeholder="Planned support, follow-up, or retention action" /></label>
        {editingItem && <label style={{ display: "grid", gap: 6 }}>Outcome notes<textarea style={fieldStyle} rows={3} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} placeholder="Record the result or follow-up outcome" /></label>}
        <div><button type="submit" style={primaryStyle} disabled={saving}>{saving ? "Saving..." : editingItem ? "Save changes" : "Create intervention"}</button></div>
      </form>}

      <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 220px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, employee, type, or ID..." />
          <select style={{ ...fieldStyle, maxWidth: 190 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select>
          <select style={{ ...fieldStyle, maxWidth: 170 }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="ALL">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {loading ? <p>Loading interventions...</p> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 28, color: "var(--muted, #6b7280)" }}><h3 style={{ margin: "0 0 6px", color: "var(--text, #111827)" }}>No interventions found</h3><p style={{ margin: 0 }}>Try changing the filters or create an intervention.</p></div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((item) => <article key={item.id} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div><h3 style={{ margin: 0, fontSize: 17 }}>{item.title}</h3><p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted, #6b7280)" }}>Intervention #{item.id} · {item.employee_name || `Employee ${item.employee_id}`} · {item.intervention_type}</p></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, background: (statusColors[item.status] || statusColors.OPEN)[0], color: (statusColors[item.status] || statusColors.OPEN)[1] }}>{String(item.status || "OPEN").replace("_", " ")}</span><span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, background: (priorityColors[item.priority] || priorityColors.MEDIUM)[0], color: (priorityColors[item.priority] || priorityColors.MEDIUM)[1] }}>{item.priority}</span></div>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.description}</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--muted, #6b7280)" }}><span>Due: {dateText(item.due_date)}</span>{item.prediction_id && <span>Prediction #{item.prediction_id}</span>}{item.assigned_to && <span>Assigned user #{item.assigned_to}</span>}</div>
              {item.action_plan && <div style={{ padding: 10, borderRadius: 8, background: "var(--subtle-bg, #f9fafb)" }}><strong style={{ fontSize: 13 }}>Action plan</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{item.action_plan}</p></div>}
              {item.outcome_notes && <div style={{ padding: 10, borderRadius: 8, background: "var(--subtle-bg, #f9fafb)" }}><strong style={{ fontSize: 13 }}>Outcome notes</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{item.outcome_notes}</p></div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={buttonStyle} onClick={() => startEdit(item)}>Update intervention</button>{canDelete && <button type="button" style={buttonStyle} disabled={busyId === item.id} onClick={() => deleteItem(item)}>{busyId === item.id ? "Deleting..." : "Delete"}</button>}</div>
            </article>)}
          </div>
        )}
      </div>
    </section>
  );
}


function EmployeeRecommendationsWorkspace() {
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [employeeResult, setEmployeeResult] = useState(null);

  const role = (localStorage.getItem("wf_role") || "").toUpperCase();
  const canViewAll = ["ADMIN", "HR", "MANAGER"].includes(role);
  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };
  const primaryStyle = { ...buttonStyle, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" };

  const loadRecommendations = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (canViewAll) {
        const [overviewResult, listResult] = await Promise.all([
          api.get("/recommendations/overview"),
          api.get("/recommendations/", { params: { limit: 200 } }),
        ]);
        setOverview(overviewResult.data || {});
        setRecords(Array.isArray(listResult.data?.items) ? listResult.data.items : []);
      } else {
        setOverview(null);
        setRecords([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load recommendations. HR overview access requires an Admin, HR, or Manager account.");
    } finally { setLoading(false); }
  }, [canViewAll]);

  useEffect(() => { loadRecommendations(); }, [loadRecommendations]);

  const openEmployeeRecommendations = async (idValue) => {
    const id = Number(idValue);
    if (!Number.isInteger(id) || id <= 0) {
      setEmployeeError("Enter a valid employee ID.");
      return;
    }
    setEmployeeLoading(true); setEmployeeError(""); setEmployeeResult(null);
    try {
      const result = await api.get(`/recommendations/employee/${id}`);
      setEmployeeResult(result.data);
      setSelectedEmployee(id);
    } catch (err) {
      setEmployeeError(err.response?.data?.detail || "Could not retrieve recommendations for this employee.");
    } finally { setEmployeeLoading(false); }
  };

  const allRecommendations = records.flatMap((record) =>
    (record.recommendations || []).map((recommendation, index) => ({
      ...recommendation,
      employee_id: record.employee_id,
      employee_name: record.employee_name || `Employee ${record.employee_id}`,
      recommendation_key: `${record.employee_id}-${index}-${recommendation.title}`,
    }))
  );
  const categories = [...new Set(allRecommendations.map((item) => item.category).filter(Boolean))].sort();
  const filtered = allRecommendations.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [item.title, item.reason, item.action, item.employee_name, item.category, String(item.employee_id)].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (priorityFilter === "ALL" || item.priority === priorityFilter) && (categoryFilter === "ALL" || item.category === categoryFilter);
  });
  const priorityColors = { LOW: ["#dcfce7", "#166534"], MEDIUM: ["#fef3c7", "#92400e"], HIGH: ["#ffedd5", "#9a3412"], URGENT: ["#fee2e2", "#991b1b"] };
  const dateText = (value) => value ? new Date(value).toLocaleString() : "Not available";

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Employee Recommendations</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Review evidence-based prompts for retention, development, and workforce support.</p></div>
        <button type="button" style={buttonStyle} onClick={loadRecommendations}>Refresh</button>
      </div>
      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}

      {canViewAll && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {[["Total employees", overview?.total_employees ?? "—"], ["High risk", overview?.high_risk_employees ?? "—"], ["Medium risk", overview?.medium_risk_employees ?? "—"], ["No predictions", overview?.employees_without_predictions ?? "—"], ["No published reviews", overview?.employees_without_published_reviews ?? "—"]].map(([label, value]) => <div key={label} style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>{label}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{value}</div></div>)}
      </div>}

      <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>View recommendations for an employee</h3>
        <p style={{ margin: 0, color: "var(--muted, #6b7280)" }}>{canViewAll ? "Enter an employee record ID to see recommendations generated from their latest prediction and published performance review." : "Enter your own employee record ID. Employees can only access their own recommendations."}</p>
        <form onSubmit={(event) => { event.preventDefault(); openEmployeeRecommendations(employeeIdInput); }} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 200px", maxWidth: 340 }} type="number" min="1" required value={employeeIdInput} onChange={(event) => setEmployeeIdInput(event.target.value)} placeholder="Employee ID" />
          <button style={primaryStyle} type="submit" disabled={employeeLoading}>{employeeLoading ? "Loading..." : "Get recommendations"}</button>
        </form>
        {employeeError && <div role="alert" style={{ color: "#b91c1c" }}>{employeeError}</div>}
      </div>

      {employeeResult && <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h3 style={{ margin: 0 }}>{employeeResult.employee_name || `Employee ${employeeResult.employee_id}`}</h3><p style={{ margin: "5px 0 0", color: "var(--muted, #6b7280)" }}>Employee ID: {employeeResult.employee_id} · Generated {dateText(employeeResult.generated_at)}</p></div><button type="button" style={buttonStyle} onClick={() => setEmployeeResult(null)}>Close</button></div>
        {(employeeResult.recommendations || []).map((item, index) => {
          const colors = priorityColors[item.priority] || priorityColors.MEDIUM;
          return <article key={`${item.title}-${index}`} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 10, padding: 14, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><h4 style={{ margin: 0 }}>{item.title}</h4><span style={{ padding: "4px 9px", borderRadius: 999, background: colors[0], color: colors[1], fontSize: 12, fontWeight: 700 }}>{item.priority} PRIORITY</span></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #6b7280)" }}>{item.category}</div><p style={{ margin: 0 }}><strong>Reason:</strong> {item.reason}</p><p style={{ margin: 0 }}><strong>Suggested action:</strong> {item.action}</p>
          </article>;
        })}
        <div style={{ borderRadius: 8, padding: 12, background: "var(--subtle-bg, #f9fafb)", fontSize: 13, lineHeight: 1.5 }}>{employeeResult.disclaimer || "These recommendations are decision-support suggestions and should be verified by HR before action."}</div>
      </div>}

      {canViewAll && <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
        <div><h3 style={{ margin: 0 }}>Organization recommendations</h3><p style={{ margin: "5px 0 0", color: "var(--muted, #6b7280)" }}>Browse generated suggestions by employee, priority, and category.</p></div>
        {overview?.note && <div style={{ padding: 12, borderRadius: 8, background: "#fffbeb", color: "#92400e", fontSize: 13 }}>{overview.note}</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...fieldStyle, flex: "1 1 220px" }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or recommendation..." />
          <select style={{ ...fieldStyle, maxWidth: 170 }} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="ALL">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select>
          <select style={{ ...fieldStyle, maxWidth: 190 }} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {loading ? <p>Loading recommendations...</p> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 26, color: "var(--muted, #6b7280)" }}>No recommendations match these filters.</div> : <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((item) => {
            const colors = priorityColors[item.priority] || priorityColors.MEDIUM;
            return <article key={item.recommendation_key} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 10, padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h4 style={{ margin: 0 }}>{item.title}</h4><p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted, #6b7280)" }}>{item.employee_name} · Employee ID {item.employee_id} · {item.category}</p></div><span style={{ padding: "4px 9px", borderRadius: 999, background: colors[0], color: colors[1], fontSize: 12, fontWeight: 700, height: "fit-content" }}>{item.priority}</span></div>
              <p style={{ margin: 0 }}><strong>Reason:</strong> {item.reason}</p><p style={{ margin: 0 }}><strong>Suggested action:</strong> {item.action}</p>
              <div><button type="button" style={buttonStyle} onClick={() => { setEmployeeIdInput(String(item.employee_id)); openEmployeeRecommendations(item.employee_id); }}>View employee details</button></div>
            </article>;
          })}
        </div>}
      </div>}
      <p style={{ margin: 0, color: "var(--muted, #6b7280)", fontSize: 12 }}>Recommendations are rule-based decision-support suggestions from available records, not definitive AI conclusions. Verify the evidence and discuss concerns with employees before making employment decisions.</p>
    </section>
  );
}


function WorkforceForecastingWorkspace() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [monthsCount, setMonthsCount] = useState(12);
  const [yearsCount, setYearsCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [error, setError] = useState("");

  const panelStyle = { background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 14, padding: 18, minWidth: 0 };
  const fieldStyle = { padding: "9px 11px", border: "1px solid var(--border, #d1d5db)", borderRadius: 8, background: "var(--input-bg, #fff)", color: "var(--text, #111827)", font: "inherit" };
  const buttonStyle = { padding: "9px 13px", borderRadius: 8, border: "1px solid var(--border, #d1d5db)", cursor: "pointer", fontWeight: 600, background: "var(--button-bg, #fff)", color: "var(--text, #111827)" };

  const loadOverview = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [overviewResult, departmentResult] = await Promise.all([
        api.get("/forecasting/overview"),
        api.get("/forecasting/departments"),
      ]);
      setOverview(overviewResult.data || {});
      setDepartments(Array.isArray(departmentResult.data) ? departmentResult.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load workforce forecasting data. This module requires an Admin or HR account.");
    } finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (monthCount = monthsCount, yearCount = yearsCount) => {
    setRefreshingHistory(true); setError("");
    try {
      const [monthlyResult, yearlyResult] = await Promise.all([
        api.get("/forecasting/monthly", { params: { months: monthCount } }),
        api.get("/forecasting/yearly", { params: { years: yearCount } }),
      ]);
      setMonthly(monthlyResult.data || {});
      setYearly(yearlyResult.data || {});
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load workforce history.");
    } finally { setRefreshingHistory(false); }
  }, [monthsCount, yearsCount]);

  useEffect(() => { loadOverview(); loadHistory(12, 5); }, [loadOverview, loadHistory]);

  const number = (value) => Number(value || 0).toLocaleString();
  const monthLabel = (value) => {
    if (!value) return "—";
    const parsed = new Date(`${value}-01T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  const maxBar = (rows, key) => Math.max(1, ...rows.map((row) => Number(row[key] || 0)));
  const barColor = (key) => key === "high_risk_predictions" ? "#dc2626" : key === "predictions_generated" ? "#2563eb" : "#16a34a";

  const renderTrend = (title, rows, labelKey, series, note) => (
    <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
      <div><h3 style={{ margin: 0 }}>{title}</h3>{note && <p style={{ margin: "5px 0 0", color: "var(--muted, #6b7280)", fontSize: 13 }}>{note}</p>}</div>
      {rows.length === 0 ? <p>No historical records available.</p> : <>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{series.map((item) => <span key={item.key} style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: barColor(item.key) }} />{item.label}</span>)}</div>
        <div style={{ display: "grid", gap: 13 }}>
          {rows.map((row) => {
            const maximum = maxBar(rows, series[0].key);
            return <div key={String(row[labelKey])} style={{ display: "grid", gridTemplateColumns: "minmax(78px, 110px) 1fr", gap: 12, alignItems: "center" }}>
              <strong style={{ fontSize: 12 }}>{labelKey === "month" ? monthLabel(row[labelKey]) : row[labelKey]}</strong>
              <div style={{ display: "grid", gap: 5 }}>
                {series.map((item) => {
                  const value = Number(row[item.key] || 0);
                  const scale = Math.max(maximum, ...series.map((entry) => maxBar(rows, entry.key)));
                  return <div key={item.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 40px", gap: 8, alignItems: "center" }}><div title={`${item.label}: ${value}`} style={{ height: 10, borderRadius: 99, background: "var(--subtle-bg, #f3f4f6)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, value / scale * 100)}%`, height: "100%", background: barColor(item.key), borderRadius: 99, minWidth: value ? 2 : 0 }} /></div><span style={{ fontSize: 12, textAlign: "right" }}>{number(value)}</span></div>;
                })}
              </div>
            </div>;
          })}
        </div>
      </>}
    </div>
  );

  return (
    <section style={{ display: "grid", gap: 18, color: "var(--text, #111827)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 24 }}>Workforce Forecasting</h2><p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Explore workforce trends, prediction activity, and department-level risk signals.</p></div>
        <button type="button" style={buttonStyle} onClick={() => { loadOverview(); loadHistory(); }}>Refresh data</button>
      </div>
      {error && <div role="alert" style={{ ...panelStyle, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}>{String(error)}</div>}
      {loading ? <div style={panelStyle}>Loading workforce overview...</div> : overview && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12 }}>
          {[["Active employees", overview.active_employees], ["Total employees", overview.total_employees], ["Active departments", overview.active_departments], ["Predictions this month", overview.predictions_this_month], ["High-risk predictions this month", overview.high_risk_predictions_this_month]].map(([label, value]) => <div key={label} style={panelStyle}><div style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>{label}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{number(value)}</div></div>)}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #6b7280)" }}>As of {overview.as_of || "—"}. {overview.note}</p>
      </>}

      <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h3 style={{ margin: 0 }}>Historical activity range</h3><p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted, #6b7280)" }}>Choose the period displayed in the monthly and yearly charts.</p></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>Months<select style={fieldStyle} value={monthsCount} onChange={(e) => setMonthsCount(Number(e.target.value))}>{[3, 6, 12, 18, 24, 36, 60].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>Years<select style={fieldStyle} value={yearsCount} onChange={(e) => setYearsCount(Number(e.target.value))}>{[1, 3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" style={buttonStyle} disabled={refreshingHistory} onClick={() => loadHistory(monthsCount, yearsCount)}>{refreshingHistory ? "Loading..." : "Apply range"}</button>
        </div>
      </div>

      {monthly && renderTrend("Monthly workforce activity", monthly.history || [], "month", [{ key: "employees_joined", label: "Employees joined" }, { key: "predictions_generated", label: "Predictions generated" }, { key: "high_risk_predictions", label: "High-risk predictions" }], monthly.note)}
      {yearly && renderTrend("Yearly workforce activity", yearly.history || [], "year", [{ key: "employees_joined", label: "Employees joined" }, { key: "predictions_generated", label: "Predictions generated" }, { key: "high_risk_predictions", label: "High-risk predictions" }], yearly.note)}

      <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
        <div><h3 style={{ margin: 0 }}>Department workforce summary</h3><p style={{ margin: "5px 0 0", color: "var(--muted, #6b7280)", fontSize: 13 }}>Current headcount and latest high-risk prediction signals by department.</p></div>
        {departments.length === 0 ? <p>No departments found.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr>{["Department", "Status", "Active employees", "Total employees", "Latest high-risk employees"].map((label) => <th key={label} style={{ textAlign: "left", padding: "11px 10px", borderBottom: "1px solid var(--border, #e5e7eb)", fontSize: 12, color: "var(--muted, #6b7280)" }}>{label}</th>)}</tr></thead><tbody>{departments.map((department) => <tr key={department.department_id}><td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border, #e5e7eb)", fontWeight: 600 }}>{department.department}</td><td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border, #e5e7eb)" }}><span style={{ borderRadius: 999, padding: "4px 8px", fontSize: 12, background: department.active ? "#dcfce7" : "#f3f4f6", color: department.active ? "#166534" : "#4b5563" }}>{department.active ? "Active" : "Inactive"}</span></td><td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border, #e5e7eb)" }}>{number(department.active_employees)}</td><td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border, #e5e7eb)" }}>{number(department.total_employees)}</td><td style={{ padding: "12px 10px", borderBottom: "1px solid var(--border, #e5e7eb)", fontWeight: 700, color: department.employees_with_latest_high_risk ? "#dc2626" : "inherit" }}>{number(department.employees_with_latest_high_risk)}</td></tr>)}</tbody></table></div>}
      </div>
      <div style={{ borderRadius: 10, padding: 14, background: "#fffbeb", color: "#92400e", fontSize: 13, lineHeight: 1.55 }}>Important: this module displays historical workforce activity and current model prediction signals. It does not calculate validated future resignation forecasts. The backend notes that reliable departure analysis requires employee exit-date data.</div>
    </section>
  );
}


function RiskMonitoringWorkspace() {
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRiskData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, e, a] = await Promise.all([
        api.get("/risk-monitoring/summary"),
        api.get("/risk-monitoring/employees", { params: { limit: 500, ...(riskFilter !== "ALL" ? { risk_level: riskFilter } : {}) } }),
        api.get("/risk-monitoring/alerts", { params: { days } }),
      ]);
      setSummary(s.data);
      setEmployees(Array.isArray(e.data) ? e.data : []);
      setAlerts(Array.isArray(a.data) ? a.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load risk monitoring data. Check your access and backend connection.");
    } finally {
      setLoading(false);
    }
  }, [riskFilter, days]);

  useEffect(() => { loadRiskData(); }, [loadRiskData]);

  const loadHistory = async (employeeId) => {
    setSelectedEmployee(String(employeeId));
    setHistory(null);
    setHistoryLoading(true);
    setError("");
    try {
      const response = await api.get(`/risk-monitoring/employees/${employeeId}/history`, { params: { limit: 50 } });
      setHistory(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load employee risk history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const notifyRisk = async (predictionId) => {
    setError("");
    setNotice("");
    try {
      const response = await api.post(`/risk-monitoring/alerts/${predictionId}/notify`);
      setNotice(response.data?.message || "Risk notification created.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create notification.");
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const term = search.trim().toLowerCase();
    return !term || [employee.employee_name, employee.employee_code, employee.department, employee.job_title, String(employee.employee_id)]
      .some((value) => String(value || "").toLowerCase().includes(term));
  });
  const riskClass = (level) => {
    const value = String(level || "").toLowerCase();
    return `risk-badge risk-${["high", "medium", "low"].includes(value) ? value : "low"}`;
  };
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <section className="hrms-workspace risk-monitoring-workspace">
      <div className="hrms-workspace-header">
        <div><p className="hrms-eyebrow">WORKFORCE INTELLIGENCE</p><h2>Risk Monitoring</h2>
          <p className="hrms-muted">Monitor model-estimated attrition risk, review history, and send internal alerts.</p></div>
        <button type="button" className="hrms-button" onClick={loadRiskData} disabled={loading}>{loading ? "Refreshing..." : "Refresh data"}</button>
      </div>
      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}
      {notice && <div className="hrms-alert hrms-alert-success" role="status">{notice}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Employees with predictions</span><strong>{summary?.employees_with_predictions ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>High risk</span><strong>{summary?.high_risk ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Medium risk</span><strong>{summary?.medium_risk ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Low risk</span><strong>{summary?.low_risk ?? "—"}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Monitored employees</h3><p className="hrms-muted">Latest available prediction for each active employee.</p></div>
          <div className="hrms-toolbar">
            <input className="hrms-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." aria-label="Search employees" />
            <select className="hrms-input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} aria-label="Filter risk level">
              <option value="ALL">All risk levels</option><option value="HIGH">High risk</option><option value="MEDIUM">Medium risk</option><option value="LOW">Low risk</option>
            </select>
          </div>
        </div>
        {loading ? <p className="hrms-muted">Loading monitored employees...</p> :
          <div className="hrms-table-wrap"><table className="hrms-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Job title</th><th>Estimated risk</th><th>Level</th><th>Last prediction</th><th>History</th></tr></thead>
            <tbody>{filteredEmployees.map((employee) => <tr key={employee.employee_id}>
              <td><strong>{employee.employee_name || "—"}</strong><small>{employee.employee_code || `ID ${employee.employee_id}`}</small></td>
              <td>{employee.department || "—"}</td><td>{employee.job_title || "—"}</td>
              <td><div className="risk-progress"><span style={{ width: `${Math.min(100, Math.max(0, Number(employee.risk_percentage) || 0))}%` }} /></div>{Number(employee.risk_percentage || 0).toFixed(2)}%</td>
              <td><span className={riskClass(employee.risk_level)}>{employee.risk_level || "UNKNOWN"}</span></td><td>{formatDate(employee.last_prediction_at)}</td>
              <td><button className="hrms-button hrms-button-secondary" type="button" onClick={() => loadHistory(employee.employee_id)}>View history</button></td>
            </tr>)}{!filteredEmployees.length && <tr><td colSpan="7" className="hrms-empty">No employees match these filters.</td></tr>}</tbody>
          </table></div>}
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>High-risk alerts</h3><p className="hrms-muted">Recent high-risk predictions for active employees.</p></div>
          <select className="hrms-input" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Alert date range">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 180 days</option><option value={365}>Last 365 days</option>
          </select>
        </div>
        <div className="hrms-card-list">{alerts.map((alert) => <article className="hrms-list-card" key={alert.prediction_id}>
          <div className="hrms-list-card-main"><div className="hrms-list-card-title"><strong>{alert.employee_name || `Employee ${alert.employee_id}`}</strong><span className={riskClass("HIGH")}>HIGH RISK</span></div>
            <p className="hrms-muted">{alert.department || "Department not set"} · {formatDate(alert.created_at)}</p>
            <p>Model-estimated attrition risk: <strong>{Number(alert.risk_percentage || 0).toFixed(2)}%</strong></p><p className="hrms-muted">{alert.suggested_action}</p>
          </div><button type="button" className="hrms-button" onClick={() => notifyRisk(alert.prediction_id)}>Send notification</button>
        </article>)}{!alerts.length && <p className="hrms-empty">{loading ? "Loading alerts..." : "No high-risk alerts found in this date range."}</p>}</div>
      </div>

      {selectedEmployee && <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Employee risk history</h3><p className="hrms-muted">{history?.employee_name || `Employee ID ${selectedEmployee}`}</p></div>
          <button type="button" className="hrms-button hrms-button-secondary" onClick={() => { setSelectedEmployee(""); setHistory(null); }}>Close history</button>
        </div>
        {historyLoading ? <p className="hrms-muted">Loading prediction history...</p> : history && <div className="hrms-table-wrap"><table className="hrms-table">
          <thead><tr><th>Date</th><th>Risk</th><th>Level</th><th>Previous probability</th><th>Change</th></tr></thead>
          <tbody>{history.history?.map((item) => <tr key={item.prediction_id}><td>{formatDate(item.created_at)}</td><td>{Number(item.risk_percentage || 0).toFixed(2)}%</td><td><span className={riskClass(item.risk_level)}>{item.risk_level}</span></td>
            <td>{item.previous_risk_probability == null ? "—" : `${(Number(item.previous_risk_probability) * 100).toFixed(2)}%`}</td>
            <td>{item.risk_change == null ? "—" : `${item.risk_change > 0 ? "+" : ""}${(Number(item.risk_change) * 100).toFixed(2)} percentage points`}</td></tr>)}
            {!history.history?.length && <tr><td colSpan="5" className="hrms-empty">No prediction history is available.</td></tr>}</tbody>
        </table></div>}
      </div>}
      <p className="hrms-muted risk-monitoring-note">Risk scores are model estimates, not proof that an employee intends to leave. Use them responsibly and supportively; do not make employment decisions based only on a prediction.</p>
    </section>
  );
}



function SmartAlertsWorkspace() {
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState(50);
  const [overdueDays, setOverdueDays] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSmartAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, alertsResponse] = await Promise.all([
        api.get("/smart-alerts/overview"),
        api.get("/smart-alerts/high-risk", { params: { days, limit } }),
      ]);
      setOverview(overviewResponse.data);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load Smart Alerts. Check permissions and backend connection.");
    } finally {
      setLoading(false);
    }
  }, [days, limit]);

  useEffect(() => { loadSmartAlerts(); }, [loadSmartAlerts]);

  const notifyHighRisk = async (predictionId) => {
    setBusyAction(`notify-${predictionId}`);
    setError("");
    setNotice("");
    try {
      const response = await api.post(`/smart-alerts/high-risk/${predictionId}/notify`);
      const created = response.data?.notifications_created ?? 0;
      setNotice(`${response.data?.message || "High-risk notification processed."} Notifications created: ${created}.`);
      await loadSmartAlerts();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to send the high-risk notification.");
    } finally {
      setBusyAction("");
    }
  };

  const escalateOverdue = async () => {
    setBusyAction("escalate");
    setError("");
    setNotice("");
    try {
      const response = await api.post("/smart-alerts/escalate-overdue", null, {
        params: { overdue_days: overdueDays },
      });
      const data = response.data;
      const details = data && typeof data === "object"
        ? Object.entries(data).map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`).join(" | ")
        : String(data ?? "Escalation completed.");
      setNotice(details || "Overdue intervention escalation completed.");
      await loadSmartAlerts();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to escalate overdue interventions.");
    } finally {
      setBusyAction("");
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <section className="hrms-workspace smart-alerts-workspace">
      <div className="hrms-workspace-header">
        <div>
          <p className="hrms-eyebrow">WORKFORCE INTELLIGENCE</p>
          <h2>Smart Alerts</h2>
          <p className="hrms-muted">Review high-risk predictions, notify HR, and escalate overdue interventions.</p>
        </div>
        <button type="button" className="hrms-button" onClick={loadSmartAlerts} disabled={loading || Boolean(busyAction)}>
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}
      {notice && <div className="hrms-alert hrms-alert-success" role="status">{notice}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Active employees</span><strong>{overview?.active_employees ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>High-risk predictions (30 days)</span><strong>{overview?.high_risk_predictions_last_30_days ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Unread HR alerts</span><strong>{overview?.unread_hr_alerts ?? "—"}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Recent high-risk predictions</h3><p className="hrms-muted">Predictions in the selected time window.</p></div>
          <div className="hrms-toolbar">
            <select className="hrms-input" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="High-risk date range">
              <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 180 days</option><option value={365}>Last 365 days</option>
            </select>
            <select className="hrms-input" value={limit} onChange={(event) => setLimit(Number(event.target.value))} aria-label="Number of alerts">
              <option value={25}>Show 25</option><option value={50}>Show 50</option><option value={100}>Show 100</option><option value={200}>Show 200</option>
            </select>
          </div>
        </div>
        {loading ? <p className="hrms-muted">Loading smart alerts...</p> : (
          <div className="hrms-table-wrap"><table className="hrms-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Risk</th><th>Prediction date</th><th>Action</th></tr></thead>
            <tbody>
              {alerts.map((alert) => <tr key={alert.prediction_id}>
                <td><strong>{alert.employee_name || `Employee ${alert.employee_id}`}</strong><small>Employee ID: {alert.employee_id}</small></td>
                <td>{alert.department || "—"}</td>
                <td><span className="risk-badge risk-high">HIGH</span><strong className="smart-alert-risk">{(Number(alert.risk_probability || 0) * 100).toFixed(2)}%</strong></td>
                <td>{formatDate(alert.created_at)}</td>
                <td><button type="button" className="hrms-button" disabled={Boolean(busyAction)} onClick={() => notifyHighRisk(alert.prediction_id)}>{busyAction === `notify-${alert.prediction_id}` ? "Sending..." : "Notify HR"}</button></td>
              </tr>)}
              {!alerts.length && <tr><td colSpan="5" className="hrms-empty">No high-risk predictions found in this time window.</td></tr>}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Overdue intervention escalation</h3><p className="hrms-muted">Escalate interventions overdue by the selected number of days.</p></div></div>
        <div className="smart-alert-escalation">
          <label className="smart-alert-field">Overdue threshold
            <select className="hrms-input" value={overdueDays} onChange={(event) => setOverdueDays(Number(event.target.value))}>
              <option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={5}>5 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
            </select>
          </label>
          <button type="button" className="hrms-button" disabled={Boolean(busyAction)} onClick={escalateOverdue}>{busyAction === "escalate" ? "Escalating..." : "Escalate overdue interventions"}</button>
        </div>
        <p className="hrms-muted smart-alert-warning">This action can trigger notifications. Use it only when you intend to run escalation.</p>
      </div>
      <p className="hrms-muted smart-alert-footer">Risk scores are model estimates, not proof of an employee's intentions. Review context fairly and confidentially before taking action.</p>
    </section>
  );
}



function WorkforceStabilityWorkspace() {
  const [overview, setOverview] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStability = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, priorityResponse] = await Promise.all([
        api.get("/workforce-stability/overview"),
        api.get("/workforce-stability/retention-priorities", { params: { limit } }),
      ]);
      setOverview(overviewResponse.data);
      setPriorities(Array.isArray(priorityResponse.data?.items) ? priorityResponse.data.items : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load Workforce Stability data. Check permissions and backend connection.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { loadStability(); }, [loadStability]);

  const filteredPriorities = priorities.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      item.employee_name,
      item.department,
      String(item.employee_id),
    ].some((value) => String(value || "").toLowerCase().includes(term));
    const matchesRisk = riskFilter === "ALL" || item.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const percent = (value) => value == null ? "—" : `${Number(value).toFixed(2)}%`;
  const riskClass = (level) => `risk-badge risk-${String(level || "low").toLowerCase()}`;
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <section className="hrms-workspace workforce-stability-workspace">
      <div className="hrms-workspace-header">
        <div>
          <p className="hrms-eyebrow">WORKFORCE INTELLIGENCE</p>
          <h2>Workforce Stability</h2>
          <p className="hrms-muted">Review the latest model-estimated risk distribution and retention priorities across departments.</p>
        </div>
        <button type="button" className="hrms-button" onClick={loadStability} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Total employees</span><strong>{overview?.total_employees ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Employees assessed</span><strong>{overview?.employees_assessed ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>High risk</span><strong>{overview?.high_risk ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Medium risk</span><strong>{overview?.medium_risk ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Low risk</span><strong>{overview?.low_risk ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Risk unavailable</span><strong>{overview?.risk_unavailable ?? "—"}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Stability indicator</h3><p className="hrms-muted">Based on assessed employees whose latest model risk is below 40%.</p></div>
          <strong className="stability-rate">{percent(overview?.stability_rate_percent)}</strong>
        </div>
        <p className="hrms-muted workforce-stability-interpretation">{overview?.interpretation || "Stability rate is an indicator derived from model-estimated risk, not actual employee retention."}</p>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Department risk distribution</h3><p className="hrms-muted">Risk counts and average predicted risk by department.</p></div>
        </div>
        {loading ? <p className="hrms-muted">Loading department statistics...</p> : (
          <div className="hrms-table-wrap"><table className="hrms-table">
            <thead><tr><th>Department</th><th>Employees</th><th>High</th><th>Medium</th><th>Low</th><th>Unavailable</th><th>Average predicted risk</th></tr></thead>
            <tbody>
              {(overview?.departments || []).map((department) => <tr key={department.department}>
                <td><strong>{department.department}</strong></td>
                <td>{department.employees}</td><td><span className="risk-badge risk-high">{department.high_risk}</span></td>
                <td><span className="risk-badge risk-medium">{department.medium_risk}</span></td>
                <td><span className="risk-badge risk-low">{department.low_risk}</span></td>
                <td>{department.unavailable}</td>
                <td>{department.average_predicted_risk == null ? "—" : `${(Number(department.average_predicted_risk) * 100).toFixed(2)}%`}</td>
              </tr>)}
              {!overview?.departments?.length && <tr><td colSpan="7" className="hrms-empty">No department data is available.</td></tr>}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Retention priorities</h3><p className="hrms-muted">Employees with latest estimated risk of at least 40%, ordered by risk.</p></div>
          <select className="hrms-input" value={limit} onChange={(event) => setLimit(Number(event.target.value))} aria-label="Number of retention priorities">
            <option value={10}>Top 10</option><option value={20}>Top 20</option><option value={50}>Top 50</option><option value={100}>Top 100</option>
          </select>
        </div>
        <div className="workforce-stability-filters">
          <input className="hrms-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or department..." aria-label="Search retention priorities" />
          <select className="hrms-input" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="Filter retention risk">
            <option value="ALL">All priority levels</option><option value="HIGH">High risk</option><option value="MEDIUM">Medium risk</option>
          </select>
        </div>
        {loading ? <p className="hrms-muted">Loading retention priorities...</p> : (
          <div className="hrms-card-list">
            {filteredPriorities.map((item) => <article className="hrms-list-card" key={item.employee_id}>
              <div className="workforce-stability-priority-main">
                <div className="hrms-list-card-title"><strong>{item.employee_name || `Employee ${item.employee_id}`}</strong><span className={riskClass(item.risk_level)}>{item.risk_level}</span></div>
                <p className="hrms-muted">Employee ID: {item.employee_id} · {item.department || "Unassigned"}</p>
                <p>Predicted risk: <strong>{(Number(item.predicted_risk || 0) * 100).toFixed(2)}%</strong></p>
                <p>{item.suggested_action}</p>
              </div>
            </article>)}
            {!filteredPriorities.length && <p className="hrms-empty">No retention priorities match these filters.</p>}
          </div>
        )}
        <p className="hrms-muted workforce-stability-disclaimer">{overview?.interpretation || "Risk estimates are not facts about employee intentions."}</p>
      </div>
      <p className="hrms-muted workforce-stability-footer">Use risk estimates as prompts for supportive, confidential conversations—not as proof of intent or as the sole basis for employment decisions.</p>
    </section>
  );
}



function ActivityFeedWorkspace() {
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [hours, setHours] = useState(24);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit };
      if (category !== "ALL") params.category = category;
      const [feedResponse, summaryResponse] = await Promise.all([
        api.get("/activity/feed", { params }),
        api.get("/activity/summary", { params: { hours } }),
      ]);
      const data = feedResponse.data;
      setActivities(Array.isArray(data?.items) ? data.items : []);
      setSummary(summaryResponse.data || null);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load workforce activity. Check your access permissions and backend connection.");
    } finally {
      setLoading(false);
    }
  }, [category, hours, limit]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const categories = Array.from(new Set([
    ...Object.keys(summary?.categories || {}),
    ...activities.map((item) => item.category).filter(Boolean),
  ])).sort();

  const filtered = activities.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      item.actor_name, item.actor_id, item.employee_id, item.event_type,
      item.category, item.description, item.entity_type, item.entity_id,
      typeof item.details === "string" ? item.details : JSON.stringify(item.details || {}),
    ].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const pretty = (value) => String(value || "OTHER").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <section className="hrms-workspace activity-feed-workspace">
      <div className="hrms-workspace-header">
        <div>
          <p className="hrms-eyebrow">WORKFORCE INTELLIGENCE</p>
          <h2>Activity Feed</h2>
          <p className="hrms-muted">Review recent workforce events and activity categories recorded by the platform.</p>
        </div>
        <button type="button" className="hrms-button" onClick={loadActivity} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh feed"}
        </button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Events in selected period</span><strong>{summary?.total_events ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Feed items loaded</span><strong>{activities.length}</strong></article>
        <article className="hrms-metric-card"><span>Categories in period</span><strong>{Object.keys(summary?.categories || {}).length}</strong></article>
        <article className="hrms-metric-card"><span>Latest event</span><strong className="activity-latest-time">{formatDate(summary?.latest_event_at)}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Activity summary</h3><p className="hrms-muted">Category counts for the selected period.</p></div>
          <select className="hrms-input" value={hours} onChange={(event) => setHours(Number(event.target.value))} aria-label="Activity summary period">
            <option value={24}>Last 24 hours</option><option value={72}>Last 3 days</option><option value={168}>Last 7 days</option><option value={720}>Last 30 days</option>
          </select>
        </div>
        <div className="activity-category-grid">
          {Object.entries(summary?.categories || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
            <button type="button" className={`activity-category-card ${category === name ? "selected" : ""}`} key={name} onClick={() => setCategory(category === name ? "ALL" : name)}>
              <span>{pretty(name)}</span><strong>{count}</strong><small>{category === name ? "Selected · click to clear" : "Click to filter feed"}</small>
            </button>
          ))}
          {!Object.keys(summary?.categories || {}).length && !loading && <p className="hrms-empty">No activity was recorded during this period.</p>}
        </div>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Recent events</h3><p className="hrms-muted">Newest events appear first. Use search to find a person, event, or record.</p></div>
          <select className="hrms-input" value={limit} onChange={(event) => setLimit(Number(event.target.value))} aria-label="Number of activity events">
            <option value={25}>Latest 25</option><option value={50}>Latest 50</option><option value={100}>Latest 100</option><option value={200}>Latest 200</option>
          </select>
        </div>
        <div className="activity-feed-filters">
          <input className="hrms-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events, people, categories..." aria-label="Search activity feed" />
          <select className="hrms-input" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter activity category">
            <option value="ALL">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}
          </select>
        </div>
        {loading ? <p className="hrms-muted">Loading activity feed...</p> : (
          <div className="activity-timeline">
            {filtered.map((item) => (
              <article className="activity-timeline-item" key={item.id}>
                <div className="activity-timeline-marker" aria-hidden="true" />
                <div className="activity-timeline-content">
                  <div className="activity-timeline-top">
                    <strong>{item.description || pretty(item.event_type)}</strong>
                    <span className="activity-category-pill">{pretty(item.category)}</span>
                  </div>
                  <p className="hrms-muted">{item.actor_name || (item.actor_id ? `User ${item.actor_id}` : "System")} · {formatDate(item.created_at)}</p>
                  <div className="activity-event-meta">
                    {item.event_type && <span>Event: {pretty(item.event_type)}</span>}
                    {item.employee_id != null && <span>Employee ID: {item.employee_id}</span>}
                    {item.entity_type && <span>Entity: {pretty(item.entity_type)}{item.entity_id != null ? ` #${item.entity_id}` : ""}</span>}
                  </div>
                  {item.details && <details className="activity-details"><summary>View event details</summary><pre>{typeof item.details === "string" ? item.details : JSON.stringify(item.details, null, 2)}</pre></details>}
                </div>
              </article>
            ))}
            {!filtered.length && <p className="hrms-empty">No events match the current search and filters.</p>}
          </div>
        )}
        <p className="hrms-muted activity-feed-footer">Feed items are limited to the latest selected number of records; the summary period applies separately to the category counts.</p>
      </div>
    </section>
  );
}



function AuditLogsWorkspace() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [days, setDays] = useState(7);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: pageSize };
      if (action.trim()) params.action = action.trim().toUpperCase();
      if (entityType.trim()) params.entity_type = entityType.trim().toUpperCase();
      if (userId.trim()) params.user_id = Number(userId);
      if (startDate) params.start_date = new Date(`${startDate}T00:00:00`).toISOString();
      if (endDate) params.end_date = new Date(`${endDate}T23:59:59.999`).toISOString();

      const [listResponse, summaryResponse] = await Promise.all([
        api.get("/audit-logs/", { params }),
        api.get("/audit-logs/summary", { params: { days } }),
      ]);
      setLogs(Array.isArray(listResponse.data?.items) ? listResponse.data.items : []);
      setTotal(Number(listResponse.data?.total || 0));
      setTotalPages(Number(listResponse.data?.total_pages || 0));
      setSummary(summaryResponse.data || null);
      setSelectedLog((current) => current ? (listResponse.data?.items || []).find((item) => item.id === current.id) || current : null);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load audit logs. Audit Logs access is limited to Admin and HR roles.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, entityType, userId, startDate, endDate, days]);

  useEffect(() => { loadAuditLogs(); }, [loadAuditLogs]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const pretty = (value) => String(value || "OTHER").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

  const filteredLogs = logs.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      item.username, item.user_id, item.action, item.entity_type, item.entity_id,
      item.description, item.ip_address,
      typeof item.details === "string" ? item.details : JSON.stringify(item.details || {}),
    ].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const clearFilters = () => {
    setAction(""); setEntityType(""); setUserId(""); setStartDate(""); setEndDate("");
    setSearch(""); setPage(1); setSelectedLog(null);
  };

  return (
    <section className="hrms-workspace audit-logs-workspace">
      <div className="hrms-workspace-header">
        <div>
          <p className="hrms-eyebrow">SECURITY & GOVERNANCE</p>
          <h2>Audit Logs</h2>
          <p className="hrms-muted">Review recorded system actions with filters, pagination, and event details.</p>
        </div>
        <button type="button" className="hrms-button" onClick={loadAuditLogs} disabled={loading}>{loading ? "Refreshing..." : "Refresh logs"}</button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Events in selected period</span><strong>{summary?.total_events ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Users with recorded actions</span><strong>{summary?.unique_users ?? "—"}</strong></article>
        <article className="hrms-metric-card"><span>Matching records</span><strong>{total}</strong></article>
        <article className="hrms-metric-card"><span>Current page</span><strong>{totalPages ? `${page} / ${totalPages}` : "0 / 0"}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading">
          <div><h3>Audit summary</h3><p className="hrms-muted">Action and entity counts for the selected time window.</p></div>
          <select className="hrms-input" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Audit summary time period">
            <option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option>
          </select>
        </div>
        <div className="audit-summary-columns">
          <div><h4>Actions</h4><div className="audit-count-list">
            {Object.entries(summary?.actions || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => <button key={name} type="button" className="audit-count-row" onClick={() => { setAction(name); setPage(1); }}><span>{pretty(name)}</span><strong>{count}</strong></button>)}
            {!Object.keys(summary?.actions || {}).length && <p className="hrms-muted">No actions in this period.</p>}
          </div></div>
          <div><h4>Entities</h4><div className="audit-count-list">
            {Object.entries(summary?.entities || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => <button key={name} type="button" className="audit-count-row" onClick={() => { setEntityType(name); setPage(1); }}><span>{pretty(name)}</span><strong>{count}</strong></button>)}
            {!Object.keys(summary?.entities || {}).length && <p className="hrms-muted">No entities in this period.</p>}
          </div></div>
        </div>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Search and filter records</h3><p className="hrms-muted">Filters are applied to the server-side record list.</p></div><button type="button" className="hrms-button hrms-button-secondary" onClick={clearFilters}>Clear filters</button></div>
        <div className="audit-filter-grid">
          <label>Action<input className="hrms-input" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder="e.g. CREATE" /></label>
          <label>Entity type<input className="hrms-input" value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }} placeholder="e.g. EMPLOYEE" /></label>
          <label>User ID<input className="hrms-input" type="number" min="1" value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }} placeholder="User ID" /></label>
          <label>Start date<input className="hrms-input" type="date" value={startDate} max={endDate || undefined} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /></label>
          <label>End date<input className="hrms-input" type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></label>
          <label>Page size<select className="hrms-input" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25 records</option><option value={50}>50 records</option><option value={100}>100 records</option><option value={200}>200 records</option></select></label>
        </div>
        <input className="hrms-input audit-quick-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Quick search loaded records by user, description, IP, or details..." aria-label="Quick search loaded audit records" />
        <p className="hrms-muted audit-filter-note">Quick search filters records on the current server-loaded page. Use the fields above to narrow records across pages.</p>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Audit records</h3><p className="hrms-muted">Newest records first. Select a row to inspect its full details.</p></div><span className="audit-total-label">{total.toLocaleString()} records</span></div>
        {loading ? <p className="hrms-muted">Loading audit records...</p> : (
          <div className="hrms-table-wrap"><table className="hrms-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Description</th><th>IP address</th><th>Details</th></tr></thead>
            <tbody>
              {filteredLogs.map((item) => <tr key={item.id} className={selectedLog?.id === item.id ? "audit-selected-row" : ""}>
                <td>{formatDate(item.created_at)}</td>
                <td>{item.username || (item.user_id ? `User ${item.user_id}` : "System")}</td>
                <td><span className="audit-action-pill">{pretty(item.action)}</span></td>
                <td>{pretty(item.entity_type)}{item.entity_id != null ? ` #${item.entity_id}` : ""}</td>
                <td>{item.description || "—"}</td><td>{item.ip_address || "—"}</td>
                <td><button type="button" className="hrms-button hrms-button-secondary audit-view-button" onClick={() => setSelectedLog(item)}>View</button></td>
              </tr>)}
              {!filteredLogs.length && <tr><td colSpan="7" className="hrms-empty">No audit records match the current filters.</td></tr>}
            </tbody>
          </table></div>
        )}
        <div className="audit-pagination">
          <span className="hrms-muted">Page {page} of {Math.max(totalPages, 1)}</span>
          <div><button type="button" className="hrms-button hrms-button-secondary" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button type="button" className="hrms-button hrms-button-secondary" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
        </div>
      </div>

      {selectedLog && <div className="hrms-panel audit-detail-panel">
        <div className="hrms-panel-heading"><div><h3>Audit record #{selectedLog.id}</h3><p className="hrms-muted">Full details for the selected event.</p></div><button type="button" className="hrms-button hrms-button-secondary" onClick={() => setSelectedLog(null)}>Close details</button></div>
        <dl className="audit-detail-grid">
          <div><dt>Timestamp</dt><dd>{formatDate(selectedLog.created_at)}</dd></div>
          <div><dt>User</dt><dd>{selectedLog.username || "System"} {selectedLog.user_id ? `(ID ${selectedLog.user_id})` : ""}</dd></div>
          <div><dt>Action</dt><dd>{pretty(selectedLog.action)}</dd></div>
          <div><dt>Entity</dt><dd>{pretty(selectedLog.entity_type)} {selectedLog.entity_id != null ? `#${selectedLog.entity_id}` : ""}</dd></div>
          <div><dt>IP address</dt><dd>{selectedLog.ip_address || "Not recorded"}</dd></div>
          <div><dt>Description</dt><dd>{selectedLog.description || "No description recorded"}</dd></div>
        </dl>
        <h4>Recorded details</h4><pre className="audit-json-details">{typeof selectedLog.details === "string" ? selectedLog.details : JSON.stringify(selectedLog.details ?? {}, null, 2)}</pre>
        <p className="hrms-muted audit-filter-note">Audit records are displayed for review only. This interface does not edit or delete audit history.</p>
      </div>}
    </section>
  );
}



function DatasetsWorkspace() {
  const [datasets, setDatasets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState({ total: 0, valid: 0, warning: 0, rows: 0 });
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trainingResult, setTrainingResult] = useState(null);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/datasets/", { params: { skip: 0, limit: 100 } });
      const items = Array.isArray(response.data) ? response.data : [];
      setDatasets(items);
      setSummary({
        total: items.length,
        valid: items.filter((item) => String(item.validation_status).toUpperCase() === "VALID").length,
        warning: items.filter((item) => String(item.validation_status).toUpperCase() !== "VALID").length,
        rows: items.reduce((sum, item) => sum + Number(item.row_count || 0), 0),
      });
      setSelected((current) => current ? items.find((item) => item.id === current.id) || current : null);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load datasets. Dataset management requires Admin or HR access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDatasets(); }, [loadDatasets]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const statusLabel = (value) => String(value || "UNKNOWN").toUpperCase();
  const filtered = datasets.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [item.filename, item.id, item.validation_status].some((value) => String(value ?? "").toLowerCase().includes(term));
    const matchesStatus = statusFilter === "ALL" || statusLabel(item.validation_status) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uploadDataset = async (event) => {
    event.preventDefault();
    if (!file) { setError("Choose a CSV file before uploading."); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Only CSV files are supported."); return; }
    setUploading(true); setError(""); setNotice(""); setTrainingResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/datasets/upload", formData);
      setNotice(response.data?.message || "Dataset uploaded and analyzed.");
      setFile(null);
      const input = document.getElementById("workforce-dataset-file");
      if (input) input.value = "";
      await loadDatasets();
      if (response.data?.dataset_id) {
        const details = await api.get(`/datasets/${response.data.dataset_id}`);
        setSelected(details.data);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : detail?.message || "Dataset upload failed. Check the CSV file and try again.");
    } finally {
      setUploading(false);
    }
  };

  const viewDetails = async (dataset) => {
    setBusyId(dataset.id); setError(""); setNotice(""); setTrainingResult(null);
    try {
      const response = await api.get(`/datasets/${dataset.id}`);
      setSelected(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load dataset details.");
    } finally {
      setBusyId(null);
    }
  };

  const trainModel = async (dataset) => {
    const accepted = window.confirm(`Train the attrition model using "${dataset.filename}"? This may replace the current model bundle.`);
    if (!accepted) return;
    setBusyId(dataset.id); setError(""); setNotice(""); setTrainingResult(null);
    try {
      const response = await api.post(`/datasets/${dataset.id}/train`);
      setTrainingResult(response.data);
      setNotice(response.data?.message || "Model training completed.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : detail?.message || "Model training failed. Review the backend error and dataset columns.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteDataset = async (dataset) => {
    const accepted = window.confirm(`Permanently delete dataset "${dataset.filename}" and its stored CSV? This cannot be undone.`);
    if (!accepted) return;
    setBusyId(dataset.id); setError(""); setNotice(""); setTrainingResult(null);
    try {
      const response = await api.delete(`/datasets/${dataset.id}`);
      setNotice(response.data?.message || "Dataset deleted successfully.");
      if (selected?.id === dataset.id) setSelected(null);
      await loadDatasets();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete this dataset.");
    } finally {
      setBusyId(null);
    }
  };

  const report = selected?.report || {};
  const showReport = selected && typeof selected.report === "object";
  const statusClass = (status) => `dataset-status dataset-status-${String(status || "unknown").toLowerCase()}`;

  return (
    <section className="hrms-workspace datasets-workspace">
      <div className="hrms-workspace-header">
        <div><p className="hrms-eyebrow">AI MODEL DATA MANAGEMENT</p><h2>Datasets</h2><p className="hrms-muted">Upload employee CSV data, review validation results, and initiate model training.</p></div>
        <button type="button" className="hrms-button" onClick={loadDatasets} disabled={loading}>{loading ? "Refreshing..." : "Refresh datasets"}</button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}
      {notice && <div className="hrms-alert hrms-alert-success" role="status">{notice}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Datasets loaded</span><strong>{summary.total}</strong></article>
        <article className="hrms-metric-card"><span>Valid datasets</span><strong>{summary.valid}</strong></article>
        <article className="hrms-metric-card"><span>Datasets with warnings</span><strong>{summary.warning}</strong></article>
        <article className="hrms-metric-card"><span>Total rows</span><strong>{summary.rows.toLocaleString()}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Upload a CSV dataset</h3><p className="hrms-muted">Maximum file size: 25 MB. The server checks columns, missing cells, and duplicate rows.</p></div></div>
        <form className="dataset-upload-form" onSubmit={uploadDataset}>
          <label className="dataset-file-field" htmlFor="workforce-dataset-file"><span>Choose CSV file</span><input id="workforce-dataset-file" type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); setNotice(""); }} /></label>
          <div className="dataset-upload-meta"><span>{file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "No file selected"}</span><button type="submit" className="hrms-button" disabled={uploading || !file}>{uploading ? "Uploading and analyzing..." : "Upload and validate"}</button></div>
        </form>
        <p className="hrms-muted dataset-note">An “OK” or warning result describes structural checks only; it does not guarantee that the dataset is suitable for production model training.</p>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Dataset library</h3><p className="hrms-muted">Review validation status, inspect reports, train, or remove uploaded datasets.</p></div><span className="dataset-total-label">{datasets.length} loaded</span></div>
        <div className="dataset-filters">
          <input className="hrms-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename or dataset ID..." aria-label="Search datasets" />
          <select className="hrms-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter dataset status"><option value="ALL">All validation statuses</option><option value="VALID">Valid</option><option value="WARNING">Warning</option></select>
        </div>
        {loading ? <p className="hrms-muted">Loading datasets...</p> : (
          <div className="hrms-table-wrap"><table className="hrms-table">
            <thead><tr><th>Dataset</th><th>Rows</th><th>Columns</th><th>Duplicate rows</th><th>Missing cells</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map((item) => <tr key={item.id}>
              <td><strong>{item.filename}</strong><small className="dataset-id">ID: {item.id}</small></td><td>{Number(item.row_count || 0).toLocaleString()}</td><td>{item.column_count}</td><td>{item.duplicate_rows}</td><td>{item.missing_values}</td>
              <td><span className={statusClass(item.validation_status)}>{statusLabel(item.validation_status)}</span></td><td>{formatDate(item.created_at)}</td>
              <td><div className="dataset-row-actions"><button type="button" className="hrms-button hrms-button-secondary" disabled={busyId === item.id} onClick={() => viewDetails(item)}>Details</button><button type="button" className="hrms-button" disabled={busyId === item.id} onClick={() => trainModel(item)}>{busyId === item.id ? "Working..." : "Train model"}</button><button type="button" className="hrms-button dataset-delete-button" disabled={busyId === item.id} onClick={() => deleteDataset(item)}>Delete</button></div></td>
            </tr>)}{!filtered.length && <tr><td colSpan="8" className="hrms-empty">No datasets match the current filters.</td></tr>}</tbody>
          </table></div>
        )}
        <p className="hrms-muted dataset-note">Training invokes the existing backend training route and may replace the active model bundle. Only train with authorized, representative data.</p>
      </div>

      {selected && <div className="hrms-panel dataset-report-panel">
        <div className="hrms-panel-heading"><div><h3>Validation report: {selected.filename}</h3><p className="hrms-muted">Dataset ID {selected.id} · uploaded {formatDate(selected.created_at)}</p></div><button type="button" className="hrms-button hrms-button-secondary" onClick={() => setSelected(null)}>Close report</button></div>
        <div className="dataset-report-metrics">
          <div><span>Rows</span><strong>{selected.row_count ?? report.rows ?? "—"}</strong></div><div><span>Columns</span><strong>{selected.column_count ?? report.columns ?? "—"}</strong></div><div><span>Duplicate rows</span><strong>{selected.duplicate_rows ?? report.duplicate_rows ?? "—"}</strong></div><div><span>Missing cells</span><strong>{selected.missing_values ?? report.missing_cells ?? "—"}</strong></div>
        </div>
        <div className="dataset-validation-grid">
          <div><h4>Validation checks</h4><p>Attrition target found: <strong>{report.attrition_target_found == null ? "Not reported" : report.attrition_target_found ? "Yes" : "No"}</strong></p><p>Recommended columns found: <strong>{report.recommended_columns_found?.length ?? 0}</strong></p><p>Recommended columns missing: <strong>{report.recommended_columns_missing?.length ?? 0}</strong></p></div>
          <div><h4>Detected columns</h4><div className="dataset-column-tags">{(report.column_names || []).map((name) => <span key={name}>{name}</span>)}{!report.column_names?.length && <span>No column list available.</span>}</div></div>
        </div>
        {report.recommended_columns_missing?.length > 0 && <div className="dataset-warning-box"><strong>Recommended columns not found</strong><p>{report.recommended_columns_missing.join(", ")}</p></div>}
        {report.recommended_columns_found?.length > 0 && <div className="dataset-success-box"><strong>Recommended columns found</strong><p>{report.recommended_columns_found.join(", ")}</p></div>}
      </div>}

      {trainingResult && <div className="hrms-panel dataset-training-panel">
        <div className="hrms-panel-heading"><div><h3>Model training result</h3><p className="hrms-muted">{trainingResult.message}</p></div><span className="dataset-status dataset-status-valid">SUCCESS</span></div>
        <p>Dataset ID: <strong>{trainingResult.dataset_id}</strong> · Model version: <strong>{trainingResult.model_version || "—"}</strong></p>
        <h4>Reported metrics</h4><pre className="dataset-json">{JSON.stringify(trainingResult.metrics || {}, null, 2)}</pre>
        {trainingResult.warning && <div className="dataset-warning-box">{trainingResult.warning}</div>}
      </div>}
    </section>
  );
}



function EmployeeChatWorkspace() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationWith, setConversationWith] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentUserId = Number(localStorage.getItem("wf_user_id") || localStorage.getItem("user_id") || 0);

  const loadChat = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { skip: 0, limit: 100 };
      if (conversationWith.trim()) params.conversation_with = Number(conversationWith);
      if (unreadOnly) params.unread_only = true;
      const [messageResponse, unreadResponse] = await Promise.all([
        api.get("/chat/messages", { params }),
        api.get("/chat/unread-count"),
      ]);
      const items = Array.isArray(messageResponse.data) ? messageResponse.data : [];
      setMessages(items);
      setUnreadCount(Number(unreadResponse.data?.unread_count || 0));
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load messages. Check your login session and chat access.");
    } finally {
      setLoading(false);
    }
  }, [conversationWith, unreadOnly]);

  useEffect(() => { loadChat(); }, [loadChat]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const isOwnMessage = (message) => currentUserId > 0 && Number(message.sender_id) === currentUserId;
  const visibleMessages = messages.filter((message) => {
    const term = search.trim().toLowerCase();
    return !term || [message.message, message.sender_id, message.receiver_id, message.id].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const sendMessage = async (event) => {
    event.preventDefault();
    const recipient = Number(receiverId);
    const content = messageText.trim();
    if (!Number.isInteger(recipient) || recipient <= 0) { setError("Enter a valid recipient user ID."); return; }
    if (!content) { setError("Enter a message before sending."); return; }
    if (currentUserId && recipient === currentUserId) { setError("You cannot send a message to yourself."); return; }
    setSending(true); setError(""); setNotice("");
    try {
      await api.post("/chat/messages", { receiver_id: recipient, message: content });
      setMessageText("");
      setConversationWith(String(recipient));
      setUnreadOnly(false);
      setNotice("Message sent.");
      await loadChat();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const markRead = async (message) => {
    setBusyId(message.id); setError(""); setNotice("");
    try {
      await api.patch(`/chat/messages/${message.id}/read`);
      setNotice("Message marked as read.");
      await loadChat();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to mark message as read. Only the recipient can mark it read.");
    } finally {
      setBusyId(null);
    }
  };

  const markConversationRead = async () => {
    const otherId = Number(conversationWith);
    if (!Number.isInteger(otherId) || otherId <= 0) { setError("Enter a conversation user ID first."); return; }
    setError(""); setNotice("");
    try {
      const response = await api.patch(`/chat/conversations/${otherId}/read`);
      setNotice(`${response.data?.updated_count ?? 0} message(s) marked as read.`);
      await loadChat();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to mark this conversation as read.");
    }
  };

  const deleteMessage = async (message) => {
    if (!window.confirm("Delete this message? This action cannot be undone.")) return;
    setBusyId(message.id); setError(""); setNotice("");
    try {
      const response = await api.delete(`/chat/messages/${message.id}`);
      setNotice(response.data?.message || "Message deleted.");
      await loadChat();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete this message. You can delete only messages you sent.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="hrms-workspace employee-chat-workspace">
      <div className="hrms-workspace-header">
        <div><p className="hrms-eyebrow">WORKPLACE COMMUNICATION</p><h2>Employee Chat</h2><p className="hrms-muted">Send direct messages and manage read status for your conversations.</p></div>
        <button type="button" className="hrms-button" onClick={loadChat} disabled={loading}>{loading ? "Refreshing..." : "Refresh messages"}</button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}
      {notice && <div className="hrms-alert hrms-alert-success" role="status">{notice}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Messages loaded</span><strong>{messages.length}</strong></article>
        <article className="hrms-metric-card"><span>Unread messages</span><strong>{unreadCount}</strong></article>
        <article className="hrms-metric-card"><span>Conversation filter</span><strong>{conversationWith || "All"}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Send a message</h3><p className="hrms-muted">Use the recipient's active user ID. The chat API does not provide a user directory endpoint.</p></div></div>
        <form className="chat-compose-form" onSubmit={sendMessage}>
          <label>Recipient user ID<input className="hrms-input" type="number" min="1" value={receiverId} onChange={(event) => setReceiverId(event.target.value)} placeholder="e.g. 12" required /></label>
          <label className="chat-message-field">Message<textarea className="hrms-input" rows="3" maxLength="5000" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a workplace message..." required /></label>
          <div className="chat-compose-footer"><span className="hrms-muted">{messageText.length}/5000 characters</span><button type="submit" className="hrms-button" disabled={sending || !receiverId.trim() || !messageText.trim()}>{sending ? "Sending..." : "Send message"}</button></div>
        </form>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Messages</h3><p className="hrms-muted">Most recent messages are returned first by the API.</p></div><button type="button" className="hrms-button hrms-button-secondary" onClick={markConversationRead}>Mark conversation read</button></div>
        <div className="chat-filters">
          <input className="hrms-input" type="number" min="1" value={conversationWith} onChange={(event) => setConversationWith(event.target.value)} placeholder="Filter by other user ID" aria-label="Filter conversation by user ID" />
          <input className="hrms-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message text or IDs..." aria-label="Search messages" />
          <label className="chat-checkbox"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> Unread only</label>
          <button type="button" className="hrms-button hrms-button-secondary" onClick={loadChat} disabled={loading}>Apply filters</button>
        </div>
        {loading ? <p className="hrms-muted">Loading messages...</p> : (
          <div className="chat-message-list">
            {visibleMessages.map((message) => {
              const own = isOwnMessage(message);
              return <article className={`chat-message-card ${own ? "chat-message-own" : "chat-message-incoming"}`} key={message.id}>
                <div className="chat-message-top"><div><strong>{own ? "You" : `User ${message.sender_id}`}</strong><span className="chat-message-route">{own ? `To user ${message.receiver_id}` : `Sent by user ${message.sender_id}`}</span></div><span className={`chat-read-state ${message.is_read ? "chat-read" : "chat-unread"}`}>{message.is_read ? "Read" : "Unread"}</span></div>
                <p className="chat-message-body">{message.message}</p>
                <div className="chat-message-bottom"><span>{formatDate(message.created_at)}</span><div className="chat-message-actions">
                  {!own && !message.is_read && <button type="button" className="hrms-button hrms-button-secondary" disabled={busyId === message.id} onClick={() => markRead(message)}>{busyId === message.id ? "Working..." : "Mark read"}</button>}
                  {own && <button type="button" className="hrms-button chat-delete-button" disabled={busyId === message.id} onClick={() => deleteMessage(message)}>Delete sent message</button>}
                </div></div>
              </article>;
            })}
            {!visibleMessages.length && <div className="hrms-empty">No messages match these filters.</div>}
          </div>
        )}
        <p className="hrms-muted chat-note">The API returns up to 100 messages per request. Message deletion is available only to the original sender; read status is managed by the recipient.</p>
      </div>
    </section>
  );
}



function EmployeeDocumentsWorkspace() {
  const [documents, setDocuments] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploadEmployeeId, setUploadEmployeeId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("OTHER");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const role = String(localStorage.getItem("wf_role") || localStorage.getItem("user_role") || "").toUpperCase();
  const isHR = ["ADMIN", "HR"].includes(role);
  const categories = ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CONTRACT", "PAYROLL", "OTHER"];

  const loadDocuments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { skip: 0, limit: 100 };
      if (employeeId.trim()) params.employee_id = Number(employeeId);
      if (category !== "ALL") params.category = category;
      const response = await api.get("/documents/", { params });
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load documents. Please check your login session.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, category]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const formatSize = (value) => {
    const size = Number(value || 0);
    return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };
  const filteredDocuments = documents.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || [item.original_filename, item.filename, item.category, item.description, item.employee_id, item.id].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const uploadDocument = async (event) => {
    event.preventDefault();
    const id = Number(uploadEmployeeId);
    if (!Number.isInteger(id) || id <= 0) { setError("Enter a valid employee ID."); return; }
    if (!file) { setError("Choose a document file first."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Maximum document size is 10 MB."); return; }
    setUploading(true); setError(""); setNotice("");
    try {
      const formData = new FormData();
      formData.append("employee_id", String(id));
      formData.append("category", uploadCategory);
      formData.append("description", description.trim());
      formData.append("file", file);
      const response = await api.post("/documents/", formData);
      setNotice(`Document "${response.data?.original_filename || file.name}" uploaded successfully.`);
      setFile(null); setDescription("");
      const input = document.getElementById("employee-document-file");
      if (input) input.value = "";
      if (employeeId && Number(employeeId) !== id) setEmployeeId(String(id));
      else await loadDocuments();
      if (employeeId && Number(employeeId) !== id) return;
    } catch (err) {
      setError(err.response?.data?.detail || "Document upload failed. Check the file type and employee ID.");
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (documentItem) => {
    setBusyId(documentItem.id); setError(""); setNotice("");
    try {
      const response = await api.get(`/documents/${documentItem.id}/download`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = documentItem.original_filename || documentItem.filename || `document-${documentItem.id}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setNotice(`Download started for "${anchor.download}".`);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const detail = JSON.parse(text).detail;
          setError(typeof detail === "string" ? detail : "Unable to download document.");
        } catch { setError("Unable to download document."); }
      } else setError(err.response?.data?.detail || "Unable to download document.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteDocument = async (documentItem) => {
    if (!window.confirm(`Permanently delete "${documentItem.original_filename || documentItem.filename}"?`)) return;
    setBusyId(documentItem.id); setError(""); setNotice("");
    try {
      const response = await api.delete(`/documents/${documentItem.id}`);
      setNotice(response.data?.message || "Document deleted successfully.");
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete document. Deletion requires Admin or HR access.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="hrms-workspace employee-documents-workspace">
      <div className="hrms-workspace-header">
        <div><p className="hrms-eyebrow">EMPLOYEE RECORDS</p><h2>Documents</h2><p className="hrms-muted">Securely upload, browse, and download employee documents.</p></div>
        <button type="button" className="hrms-button" onClick={loadDocuments} disabled={loading}>{loading ? "Refreshing..." : "Refresh documents"}</button>
      </div>

      {error && <div className="hrms-alert hrms-alert-error" role="alert">{error}</div>}
      {notice && <div className="hrms-alert hrms-alert-success" role="status">{notice}</div>}

      <div className="hrms-metric-grid">
        <article className="hrms-metric-card"><span>Documents loaded</span><strong>{documents.length}</strong></article>
        <article className="hrms-metric-card"><span>Identity</span><strong>{documents.filter((item) => String(item.category).toUpperCase() === "IDENTITY").length}</strong></article>
        <article className="hrms-metric-card"><span>Employment</span><strong>{documents.filter((item) => String(item.category).toUpperCase() === "EMPLOYMENT").length}</strong></article>
        <article className="hrms-metric-card"><span>Other categories</span><strong>{documents.filter((item) => !["IDENTITY", "EMPLOYMENT"].includes(String(item.category).toUpperCase())).length}</strong></article>
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Upload employee document</h3><p className="hrms-muted">Accepted formats: PDF, JPG, PNG, DOCX. Maximum size: 10 MB.</p></div></div>
        <form className="employee-document-upload" onSubmit={uploadDocument}>
          <label>Employee ID<input className="hrms-input" type="number" min="1" value={uploadEmployeeId} onChange={(event) => setUploadEmployeeId(event.target.value)} placeholder="Enter employee ID" required /></label>
          <label>Category<select className="hrms-input" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="document-file-input">File<input id="employee-document-file" className="hrms-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
          <label className="document-description-field">Description <span className="hrms-muted">(optional)</span><textarea className="hrms-input" rows="2" maxLength="2000" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a short description..." /></label>
          <div className="document-upload-footer"><span className="hrms-muted">{file ? `${file.name} · ${formatSize(file.size)}` : "No file selected"}</span><button type="submit" className="hrms-button" disabled={uploading || !file || !uploadEmployeeId.trim()}>{uploading ? "Uploading..." : "Upload document"}</button></div>
        </form>
        {!isHR && <p className="hrms-muted document-note">Employee access is limited to your own employee record. Your employee ID must match the employee profile associated with your account.</p>}
      </div>

      <div className="hrms-panel">
        <div className="hrms-panel-heading"><div><h3>Document library</h3><p className="hrms-muted">Documents are listed newest first. Downloads are served through authenticated access.</p></div><span className="document-count-label">{filteredDocuments.length} shown</span></div>
        <div className="document-filters">
          {isHR && <input className="hrms-input" type="number" min="1" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Filter by employee ID" aria-label="Filter by employee ID" />}
          <select className="hrms-input" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="ALL">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input className="hrms-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, description, ID..." aria-label="Search documents" />
          <button type="button" className="hrms-button hrms-button-secondary" onClick={loadDocuments} disabled={loading}>Apply filters</button>
        </div>
        {loading ? <p className="hrms-muted">Loading documents...</p> : <div className="hrms-table-wrap"><table className="hrms-table">
          <thead><tr><th>Document</th><th>Employee</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>{filteredDocuments.map((item) => <tr key={item.id}>
            <td><strong>{item.original_filename || item.filename || `Document ${item.id}`}</strong><small className="document-id">ID: {item.id}</small></td><td>{item.employee_id}</td><td><span className="document-category-pill">{item.category || "OTHER"}</span></td><td>{formatSize(item.file_size)}</td><td>{formatDate(item.created_at)}</td><td className="document-description-cell">{item.description || "—"}</td>
            <td><div className="document-row-actions"><button type="button" className="hrms-button hrms-button-secondary" disabled={busyId === item.id} onClick={() => downloadDocument(item)}>{busyId === item.id ? "Working..." : "Download"}</button>{isHR && <button type="button" className="hrms-button document-delete-button" disabled={busyId === item.id} onClick={() => deleteDocument(item)}>Delete</button>}</div></td>
          </tr>)}{!filteredDocuments.length && <tr><td colSpan="7" className="hrms-empty">No documents match the current filters.</td></tr>}</tbody>
        </table></div>}
        <p className="hrms-muted document-note">The list endpoint returns up to 100 documents per request. Upload, download, and delete permissions are enforced by the backend.</p>
      </div>
    </section>
  );
}



function AttendanceReportsWorkspace() {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 20;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department.trim()) params.department = department.trim();

    try {
      const requests = [
        api.get("/attendance/reports", {
          params: { ...params, skip: page * pageSize, limit: pageSize },
        }),
      ];

      if (localStorage.getItem("wf_token")) {
        requests.push(
          api.get("/attendance/analytics", { params }).catch(() => null)
        );
      }

      const responses = await Promise.all(requests);
      const report = responses[0].data || {};
      setRecords(Array.isArray(report.records) ? report.records : []);
      setTotal(Number(report.count || 0));
      setAnalytics(responses[1]?.data || null);
    } catch (err) {
      setRecords([]);
      setTotal(0);
      setAnalytics(null);
      setError(
        err.response?.data?.detail ||
        "Could not load attendance reports. Please check your access and backend."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, department, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(0);
    // The effect loads the report when filters/page change.
  }

  function exportCSV() {
    if (!records.length) return;

    const columns = [
      ["Employee ID", "employee_id"],
      ["Employee Code", "employee_code"],
      ["Employee Name", "employee_name"],
      ["Department", "department"],
      ["Date", "attendance_date"],
      ["Check In", "check_in"],
      ["Check Out", "check_out"],
      ["Status", "status"],
      ["Shift", "shift_name"],
      ["Worked Hours", "worked_hours"],
      ["Overtime Hours", "overtime_hours"],
      ["Late", "is_late"],
      ["Late Minutes", "late_minutes"],
    ];

    const escapeCell = (value) => {
      const text = value == null ? "" : String(value);
      return '"' + text.replace(/"/g, '""') + '"';
    };

    const csv = [
      columns.map(([label]) => escapeCell(label)).join(","),
      ...records.map((row) =>
        columns.map(([, key]) => escapeCell(row[key])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    {
      label: "Total Records",
      value: analytics?.total_records ?? total,
      note: "Attendance entries",
    },
    {
      label: "Completed",
      value: analytics?.completed_records ?? "—",
      note: "Check-in and check-out recorded",
    },
    {
      label: "Late Arrivals",
      value: analytics?.late_arrivals ?? "—",
      note: `${analytics?.late_arrival_percentage ?? 0}% of records`,
    },
    {
      label: "Overtime Hours",
      value: analytics?.total_overtime_hours ?? "—",
      note: "Total recorded overtime",
    },
  ];

  return (
    <section className="hrms-workspace attendance-reports-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO / REPORTS</span>
          <h2>Attendance Reports</h2>
          <p>Monitor attendance, punctuality, working hours and overtime.</p>
        </div>
        <button
          className="secondary-btn"
          type="button"
          onClick={loadReports}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      <div className="attendance-report-stats">
        {statCards.map((card) => (
          <article className="attendance-report-stat" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </div>

      {analytics && (
        <div className="attendance-report-insights">
          <span>Incomplete records: <strong>{analytics.incomplete_records ?? 0}</strong></span>
          <span>Worked hours: <strong>{analytics.total_worked_hours ?? 0}</strong></span>
          <span>Missing shift schedules: <strong>{analytics.records_missing_shift_schedule ?? 0}</strong></span>
          <span>Late grace period: <strong>{analytics.late_grace_minutes ?? 5} minutes</strong></span>
        </div>
      )}

      <form className="attendance-report-filters" onSubmit={applyFilters}>
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Department
          <input
            type="text"
            placeholder="Enter department"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <button className="primary-btn" type="submit">Apply filters</button>
        <button
          className="secondary-btn"
          type="button"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setDepartment("");
            setPage(0);
          }}
        >
          Clear
        </button>
      </form>

      {error && <div className="alert error hrms-alert">{String(error)}</div>}

      <div className="attendance-report-table-card">
        <div className="attendance-report-table-heading">
          <div>
            <h3>Attendance records</h3>
            <p>{total} record(s) on this page of results</p>
          </div>
          <button
            className="secondary-btn"
            type="button"
            onClick={exportCSV}
            disabled={!records.length}
          >
            Export CSV
          </button>
        </div>

        <div className="attendance-report-table-scroll">
          <table className="attendance-report-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Status</th>
                <th>Worked hours</th>
                <th>Overtime</th>
                <th>Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr><td colSpan="9" className="attendance-report-empty">Loading attendance records…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="9" className="attendance-report-empty">No attendance records found for these filters.</td></tr>
              ) : (
                records.map((record) => (
                  <tr key={record.attendance_id}>
                    <td>
                      <strong>{record.employee_name || "—"}</strong>
                      <small>{record.employee_code || `ID ${record.employee_id}`}</small>
                    </td>
                    <td>{record.department || "—"}</td>
                    <td>{record.attendance_date || "—"}</td>
                    <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td><span className="attendance-report-status">{record.status || "Unknown"}</span></td>
                    <td>{record.worked_hours ?? "—"}</td>
                    <td>{record.overtime_hours ?? "—"}</td>
                    <td>
                      <span className={record.is_late ? "attendance-punctuality late" : "attendance-punctuality"}>
                        {record.is_late ? `Late ${record.late_minutes} min` : "On time"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="attendance-report-pagination">
          <span>Page {page + 1} · Showing {records.length} record(s)</span>
          <div>
            <button
              className="secondary-btn"
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </button>
            <button
              className="secondary-btn"
              type="button"
              disabled={records.length < pageSize || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


function AttritionAnalyticsWorkspace() {
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState({ labels: [], values: [], total: 0 });
  const [highRisk, setHighRisk] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [months, setMonths] = useState("12");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        api.get("/attrition-analytics/overview"),
        api.get("/attrition-analytics/departments"),
        api.get("/attrition-analytics/monthly-trends", {
          params: { months: Number(months) },
        }),
        api.get("/attrition-analytics/risk-distribution"),
        api.get("/attrition-analytics/high-risk", {
          params: { limit: 20 },
        }),
      ]);

      setOverview(results[0].data || {});
      setDepartments(Array.isArray(results[1].data) ? results[1].data : []);
      setTrends(Array.isArray(results[2].data?.history) ? results[2].data.history : []);
      setDistribution(results[3].data || { labels: [], values: [], total: 0 });
      setHighRisk(Array.isArray(results[4].data) ? results[4].data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load attrition analytics. This page requires Admin or HR access."
      );
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartData = (trends || []).map((item) => ({
    month: item.month,
    High: Number(item.high_risk || 0),
    Medium: Number(item.medium_risk || 0),
    Low: Number(item.low_risk || 0),
    Average: Number(item.average_risk_percentage || 0),
  }));

  const riskData = [
    { name: "Low risk", value: Number(distribution.values?.[0] || 0), color: "#16a34a" },
    { name: "Medium risk", value: Number(distribution.values?.[1] || 0), color: "#d97706" },
    { name: "High risk", value: Number(distribution.values?.[2] || 0), color: "#dc2626" },
  ];

  const statCards = [
    {
      label: "Active Employees",
      value: overview?.active_employees ?? "—",
      note: "Currently active",
    },
    {
      label: "Employees Predicted",
      value: overview?.employees_with_predictions ?? "—",
      note: "Employees with predictions",
    },
    {
      label: "High Risk",
      value: overview?.high_risk ?? "—",
      note: `${overview?.high_risk_percentage ?? 0}% of predicted employees`,
    },
    {
      label: "Average Risk",
      value: overview ? `${overview.average_risk_percentage ?? 0}%` : "—",
      note: "Average model probability",
    },
  ];

  return (
    <section className="hrms-workspace attrition-analytics-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO / INTELLIGENCE</span>
          <h2>Attrition Analytics</h2>
          <p>Explore model-estimated attrition risk across the workforce.</p>
        </div>
        <button
          className="secondary-btn"
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="alert error hrms-alert">{String(error)}</div>}

      <div className="attrition-analytics-stats">
        {statCards.map((card) => (
          <article className="attrition-analytics-stat" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </div>

      <div className="attrition-analytics-grid">
        <article className="attrition-analytics-card">
          <div className="attrition-analytics-card-heading">
            <div>
              <h3>Risk Distribution</h3>
              <p>Latest prediction per employee</p>
            </div>
            <span className="attrition-total-badge">
              {distribution.total ?? 0} predictions
            </span>
          </div>
          <div className="attrition-risk-chart">
            <div className="attrition-risk-donut">
              <div>
                <strong>{distribution.total ?? 0}</strong>
                <span>Employees</span>
              </div>
            </div>
            <div className="attrition-risk-legend">
              {riskData.map((item) => (
                <div key={item.name}>
                  <span className="attrition-risk-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="attrition-analytics-card">
          <div className="attrition-analytics-card-heading">
            <div>
              <h3>Monthly Prediction Trends</h3>
              <p>Prediction counts by risk level</p>
            </div>
            <select
              aria-label="Months of prediction history"
              value={months}
              onChange={(event) => setMonths(event.target.value)}
            >
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
              <option value="24">Last 24 months</option>
              <option value="36">Last 36 months</option>
            </select>
          </div>
          <div className="attrition-trend-chart">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Low" stackId="risk" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Medium" stackId="risk" fill="#d97706" />
                  <Bar dataKey="High" stackId="risk" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="attrition-chart-empty">
                {loading ? "Loading prediction history…" : "No monthly prediction history available."}
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="attrition-analytics-card">
        <div className="attrition-analytics-card-heading">
          <div>
            <h3>Department Risk Comparison</h3>
            <p>Departments ranked by average predicted risk</p>
          </div>
        </div>
        {departments.length ? (
          <div className="attrition-department-list">
            {departments.map((item) => {
              const percentage = Math.max(0, Math.min(100, Number(item.average_risk_percentage || 0)));
              return (
                <div className="attrition-department-row" key={item.department}>
                  <div className="attrition-department-title">
                    <strong>{item.department}</strong>
                    <span>{item.employees_with_predictions} employees</span>
                  </div>
                  <div className="attrition-department-track">
                    <div
                      className="attrition-department-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <strong className="attrition-department-percent">{percentage}%</strong>
                  <div className="attrition-department-breakdown">
                    <span className="low">Low {item.low_risk}</span>
                    <span className="medium">Medium {item.medium_risk}</span>
                    <span className="high">High {item.high_risk}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="attrition-chart-empty">
            {loading ? "Loading departments…" : "No department prediction data available."}
          </div>
        )}
      </article>

      <article className="attrition-analytics-card">
        <div className="attrition-analytics-card-heading">
          <div>
            <h3>High-Risk Employees</h3>
            <p>Active employees ranked by latest predicted risk</p>
          </div>
          <span className="attrition-total-badge">{highRisk.length} shown</span>
        </div>
        <div className="attrition-table-scroll">
          <table className="attrition-risk-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Predicted Risk</th>
                <th>Last Prediction</th>
              </tr>
            </thead>
            <tbody>
              {highRisk.length ? highRisk.map((employee) => (
                <tr key={employee.employee_id}>
                  <td>
                    <strong>{employee.employee_name || "—"}</strong>
                    <small>{employee.employee_code || `ID ${employee.employee_id}`}</small>
                  </td>
                  <td>{employee.department || "Unassigned"}</td>
                  <td>{employee.job_title || "—"}</td>
                  <td>
                    <div className="attrition-risk-cell">
                      <strong>{employee.risk_percentage}%</strong>
                      <div className="attrition-risk-cell-track">
                        <div style={{ width: `${Math.min(100, Number(employee.risk_percentage || 0))}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>{employee.last_prediction_at ? new Date(employee.last_prediction_at).toLocaleString() : "—"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="attrition-table-empty">
                    {loading ? "Loading high-risk employees…" : "No high-risk employees found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {overview?.disclaimer && (
        <div className="attrition-disclaimer">
          <strong>Important:</strong> {overview.disclaimer} Use predictions as decision-support signals, not as the sole basis for employment decisions.
        </div>
      )}
    </section>
  );
}


function MyPermissionsWorkspace() {
  const [permissionData, setPermissionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/permissions/me");
      setPermissionData(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load your permissions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const role = String(permissionData?.role || "UNKNOWN").toUpperCase();
  const permissions = Array.isArray(permissionData?.permissions)
    ? permissionData.permissions
    : [];

  const permissionDescriptions = {
    "employee:read": {
      title: "View employees",
      description: "View employee records and available employee information.",
      category: "Employee Management",
      icon: "👥",
    },
    "employee:create": {
      title: "Create employees",
      description: "Add new employee records.",
      category: "Employee Management",
      icon: "👥",
    },
    "employee:update": {
      title: "Update employees",
      description: "Edit employee records.",
      category: "Employee Management",
      icon: "👥",
    },
    "employee:delete": {
      title: "Delete employees",
      description: "Delete employee records where the system permits it.",
      category: "Employee Management",
      icon: "👥",
    },
    "attendance:read": {
      title: "View attendance",
      description: "View attendance records and attendance information.",
      category: "Attendance",
      icon: "🕒",
    },
    "attendance:manage": {
      title: "Manage attendance",
      description: "Manage attendance records where authorized.",
      category: "Attendance",
      icon: "🕒",
    },
    "leave:read": {
      title: "View leave",
      description: "View leave requests and leave information.",
      category: "Leave Management",
      icon: "📅",
    },
    "leave:manage": {
      title: "Manage leave",
      description: "Manage leave requests where authorized.",
      category: "Leave Management",
      icon: "📅",
    },
    "payroll:read": {
      title: "View payroll",
      description: "View payroll information where authorized.",
      category: "Payroll",
      icon: "💳",
    },
    "payroll:manage": {
      title: "Manage payroll",
      description: "Manage payroll operations where authorized.",
      category: "Payroll",
      icon: "💳",
    },
    "reports:read": {
      title: "View reports",
      description: "Access available workforce reports.",
      category: "Reports & Analytics",
      icon: "📊",
    },
    "analytics:read": {
      title: "View analytics",
      description: "Access available workforce analytics.",
      category: "Reports & Analytics",
      icon: "📊",
    },
    "users:manage": {
      title: "Manage users",
      description: "Manage user accounts where authorized.",
      category: "Administration",
      icon: "🔐",
    },
  };

  const readablePermission = (permission) => {
    const info = permissionDescriptions[permission];
    if (info) return info;
    const [resource, action] = String(permission).split(":");
    return {
      title: `${action || "Access"} ${resource || "resource"}`.replace(
        /\b\w/g,
        (character) => character.toUpperCase()
      ),
      description: "Permission assigned to your account.",
      category: "Other Permissions",
      icon: "🔑",
    };
  };

  const filteredPermissions = permissions.filter((permission) => {
    const info = readablePermission(permission);
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      permission,
      info.title,
      info.description,
      info.category,
    ].some((value) => String(value).toLowerCase().includes(query));
  });

  const groups = filteredPermissions.reduce((result, permission) => {
    const info = readablePermission(permission);
    if (!result[info.category]) result[info.category] = [];
    result[info.category].push({ permission, ...info });
    return result;
  }, {});

  const roleDescriptions = {
    ADMIN: "Full administrative access to the permissions assigned to this role.",
    HR: "Access to employee, attendance, leave, payroll and workforce analytics functions.",
    MANAGER: "Access to employee information, attendance, leave and workforce reports.",
    EMPLOYEE: "Access to employee information, attendance and leave features.",
  };

  if (loading) {
    return (
      <section className="permissions-workspace">
        <div className="permissions-loading">
          <span className="permissions-spinner" />
          <h3>Loading your permissions</h3>
          <p>Checking the access assigned to your account...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="permissions-workspace">
        <div className="permissions-error">
          <h3>Unable to load permissions</h3>
          <p>{error}</p>
          <button type="button" onClick={loadPermissions}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="permissions-workspace">
      <header className="permissions-header">
        <div>
          <span className="permissions-eyebrow">ACCOUNT ACCESS</span>
          <h1>My Permissions</h1>
          <p>Understand your role and the features you are authorized to access.</p>
        </div>
        <button
          type="button"
          className="permissions-refresh"
          onClick={loadPermissions}
        >
          Refresh permissions
        </button>
      </header>

      <div className="permissions-role-card">
        <div className="permissions-role-icon">🔐</div>
        <div className="permissions-role-details">
          <span className="permissions-label">YOUR CURRENT ROLE</span>
          <h2>{role.replace(/_/g, " ")}</h2>
          <p>{roleDescriptions[role] || "Your access is determined by the role assigned to your account."}</p>
        </div>
        <span className="permissions-role-badge">Active role</span>
      </div>

      <div className="permissions-summary-grid">
        <article className="permissions-summary-card">
          <span className="permissions-summary-label">Assigned permissions</span>
          <strong>{permissions.length}</strong>
          <span>Permissions returned by your account</span>
        </article>
        <article className="permissions-summary-card">
          <span className="permissions-summary-label">Permission categories</span>
          <strong>{new Set(permissions.map((permission) => readablePermission(permission).category)).size}</strong>
          <span>Categories represented in your access</span>
        </article>
        <article className="permissions-summary-card">
          <span className="permissions-summary-label">Account role</span>
          <strong className="permissions-role-value">{role}</strong>
          <span>Provided by the authenticated API</span>
        </article>
      </div>

      <div className="permissions-list-header">
        <div>
          <h2>Permission details</h2>
          <p>These permissions are assigned to your role by the system.</p>
        </div>
        <label className="permissions-search">
          <span className="permissions-search-icon">⌕</span>
          <input
            type="search"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search permissions"
          />
        </label>
      </div>

      {permissions.length === 0 ? (
        <div className="permissions-empty">
          <h3>No permissions assigned</h3>
          <p>Your account currently has no permissions returned by the API.</p>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="permissions-empty">
          <h3>No matching permissions</h3>
          <p>Try another search term.</p>
        </div>
      ) : (
        <div className="permissions-groups">
          {Object.entries(groups).map(([category, items]) => (
            <article className="permissions-group" key={category}>
              <div className="permissions-group-header">
                <div>
                  <span className="permissions-group-kicker">ACCESS CATEGORY</span>
                  <h3>{category}</h3>
                </div>
                <span className="permissions-count">
                  {items.length} {items.length === 1 ? "permission" : "permissions"}
                </span>
              </div>
              <div className="permissions-items">
                {items.map((item) => (
                  <div className="permissions-item" key={item.permission}>
                    <span className="permissions-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="permissions-item-copy">
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <code>{item.permission}</code>
                    </div>
                    <span className="permissions-granted">
                      <span aria-hidden="true">✓</span> Assigned
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="permissions-notice">
        <strong>Access and security</strong>
        <p>This page displays permissions returned by the server for your current role. It does not change access settings. If you need additional access, contact your HR or system administrator.</p>
      </footer>
    </section>
  );
}

export default function HRMSWorkspace({ moduleKey }) {
  const config = MODULES[moduleKey];
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!config) {
      setError("This module is not configured.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.get(config.endpoint);
      const result = response.data;

      setData(
        Array.isArray(result)
          ? result
          : result && typeof result === "object"
            ? [result]
            : []
      );
    } catch (err) {
      setData([]);
      setError(
        err.response?.data?.detail ||
        `Could not load ${config.title}. Check your access permissions and backend.`
      );
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!config) {
    return <div className="alert error">Unknown HRMS module.</div>;
  }

  if (moduleKey === "leaves") {
    return <LeaveManagementWorkspace />;
  }

  if (moduleKey === "shifts") {
    return <ShiftManagementWorkspace />;
  }
  if (moduleKey === "reviews") {
    return <PerformanceReviewWorkspace />;
  }
  if (moduleKey === "notifications") {
    return <NotificationsWorkspace />;
  }
  if (moduleKey === "tasks") {
    return <WorkflowTaskWorkspace />;
  }
  if (moduleKey === "interventions") {
    return <InterventionManagementWorkspace />;
  }
  if (moduleKey === "recommendations") {
    return <EmployeeRecommendationsWorkspace />;
  }
  if (moduleKey === "forecasting") {
    return <WorkforceForecastingWorkspace />;
  }
  if (moduleKey === "risk") {
    return <RiskMonitoringWorkspace />;
  }
  if (moduleKey === "alerts") {
    return <SmartAlertsWorkspace />;
  }
  if (moduleKey === "stability") {
    return <WorkforceStabilityWorkspace />;
  }
  if (moduleKey === "activity") {
    return <ActivityFeedWorkspace />;
  }
  if (moduleKey === "audit") {
    return <AuditLogsWorkspace />;
  }
  if (moduleKey === "datasets") {
    return <DatasetsWorkspace />;
  }
  if (moduleKey === "chat") {
    return <EmployeeChatWorkspace />;
  }
  if (moduleKey === "documents") {
    return <EmployeeDocumentsWorkspace />;
  }

  if (moduleKey === "attendanceReports") {
    return <AttendanceReportsWorkspace />;
  }

  if (moduleKey === "attritionAnalytics") {
    return <AttritionAnalyticsWorkspace />;
  }


  if (moduleKey === "permissions") {
    return <MyPermissionsWorkspace />;
  }

  if (moduleKey === "payroll") {
    return <PayrollManagementWorkspace />;
  }

  return (
    <section className="hrms-workspace">
      <div className="hrms-module-heading">
        <div>
          <span className="hrms-eyebrow">WORKFORCE AI PRO</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>

        <button
          className="secondary-btn"
          onClick={loadData}
          disabled={loading}
          type="button"
        >
          {loading ? (
            <LoaderCircle size={16} className="hrms-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      <div className="hrms-module-stats">
        <article>
          <span>Records loaded</span>
          <strong>{data.length}</strong>
        </article>
        <article>
          <span>Connection</span>
          <strong>{error ? "Needs attention" : loading ? "Loading" : "Connected"}</strong>
        </article>
      </div>

      {error && (
        <div className="alert error hrms-alert">
          <AlertCircle size={17} />
          <span>{String(error)}</span>
        </div>
      )}

      {message && (
        <div className="alert success">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      <div className="hrms-data-card">
        <div className="hrms-data-toolbar">
          <div>
            <h3>{config.title} records</h3>
            <p>Data retrieved from your authenticated backend.</p>
          </div>

          <input
            aria-label="Search records"
            placeholder="Search records..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading && data.length === 0 ? (
          <div className="hrms-empty">Loading records…</div>
        ) : (
          <DataTable rows={data} search={search} />
        )}
      </div>
    </section>
  );
}

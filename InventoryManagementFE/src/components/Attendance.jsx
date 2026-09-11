import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";
import { 
  FaUserCircle, 
  FaClock, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaHistory,
  FaChartLine,
  FaSignInAlt,
  FaSignOutAlt,
  FaUsers,
  FaPlaneDeparture,
  FaClipboardList,
  FaSearch,
  FaPlusCircle,
  FaTimes,
  FaEdit
} from "react-icons/fa";

const Attendance = () => {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [toast, setToast] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [stats, setStats] = useState({ totalDays: 0, presentDays: 0, attendanceRate: 0 });
  const [companyStats, setCompanyStats] = useState({
    total_employees: 0,
    present_employees: 0,
    absent_employees: 0,
    on_leave_employees: 0,
    today_summary: [],
    employees_on_leave: [],
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Admin section state
  const [adminTab, setAdminTab] = useState("summary"); // "summary" | "leave" | "punch"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal for Mark Leave / Update Status
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [targetStatus, setTargetStatus] = useState("on_leave");

  // Real-time digital clock ticker (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Safely parse user info from localStorage
  let userObj = {};
  try {
    userObj = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (_) {
    userObj = {};
  }

  const username = userObj.full_name || userObj.username || localStorage.getItem("username") || "Employee";
  const email = userObj.email || localStorage.getItem("email") || "";
  const employeeId = userObj.employee_id || (userObj.user_type?.toLowerCase() === "admin" ? null : userObj.id);
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");

  const userType = userObj.user_type || localStorage.getItem("userType") || "";
  const isAdmin = userType.toLowerCase() === "admin" || email === "admin@m3cars.com";

  // Configure axios
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  useEffect(() => {
    fetchToday();
    fetchHistory();
    if (isAdmin) {
      fetchCompanySummary();
    }
  }, [isAdmin]);

  const fetchCompanySummary = async () => {
    try {
      const res = await api.get("/attendance/summary");
      if (res.data) {
        setCompanyStats({
          total_employees: res.data.total_employees || 0,
          present_employees: res.data.present_employees || 0,
          absent_employees: res.data.absent_employees || 0,
          on_leave_employees: res.data.on_leave_employees || 0,
          today_summary: res.data.today_summary || [],
          employees_on_leave: res.data.employees_on_leave || [],
        });
      }
    } catch (err) {
      console.error("Error fetching company summary:", err);
    }
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchToday = async () => {
    try {
      const params = {};
      if (employeeId) params.employee_id = employeeId;
      if (email) params.email = email;
      
      const res = await api.get("/attendance/today", { params });
      if (res.data && !res.data.error) {
        setTodayAttendance(res.data);
      }
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const params = {};
      if (employeeId) params.employee_id = employeeId;
      if (email) params.email = email;

      const res = await api.get("/attendance/history", { params });
      let historyList = [];
      if (Array.isArray(res.data)) {
        historyList = res.data;
      } else if (res.data && Array.isArray(res.data.attendances)) {
        historyList = res.data.attendances;
      }
      setAttendanceHistory(historyList);
      calculateStats(historyList);
    } catch (err) {
      console.error("Error fetching history:", err);
      setAttendanceHistory([]);
      calculateStats([]);
    }
  };

  const calculateStats = (history) => {
    if (!Array.isArray(history)) {
      setStats({ totalDays: 0, presentDays: 0, attendanceRate: 0 });
      return;
    }
    const total = history.length;
    const present = history.filter((r) => r && r.status === "present").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    setStats({ totalDays: total, presentDays: present, attendanceRate: rate });
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const body = {};
      if (employeeId) body.employee_id = employeeId;
      if (email) body.email = email;

      const res = await api.post("/attendance/check-in", body);
      if (res.data?.data) {
        setTodayAttendance(res.data.data);
      }
      showToast("✓ Checked in successfully!");
      fetchHistory();
      if (isAdmin) fetchCompanySummary();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to check in";
      showToast(errorMsg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const body = {};
      if (employeeId) body.employee_id = employeeId;
      if (email) body.email = email;

      const res = await api.put("/attendance/check-out", body);
      if (res.data?.data) {
        setTodayAttendance(res.data.data);
      }
      showToast("✓ Checked out successfully!");
      fetchHistory();
      if (isAdmin) fetchCompanySummary();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to check out";
      showToast(errorMsg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkLeaveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEmp) {
      showToast("Please select an employee", true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/attendance/mark-leave", {
        employee_id: selectedEmp,
        status: targetStatus,
        notes: leaveReason || (targetStatus === "on_leave" ? "On Leave" : ""),
      });
      showToast(res.data?.message || "Employee status updated successfully!");
      setLeaveModalOpen(false);
      setSelectedEmp("");
      setLeaveReason("");
      setTargetStatus("on_leave");
      fetchCompanySummary();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update employee status", true);
    } finally {
      setLoading(false);
    }
  };

  const openMarkLeaveFor = (empId, currentStatus = "on_leave") => {
    setSelectedEmp(empId);
    setTargetStatus(currentStatus);
    setLeaveReason("");
    setLeaveModalOpen(true);
  };

  const isCheckedIn = !!todayAttendance?.check_in_time;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  const safeFormatDate = (dateStr, fmtStr = "MMM dd, yyyy") => {
    if (!dateStr) return "—";
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return "—";
      return format(parsed, fmtStr);
    } catch (_) {
      return "—";
    }
  };

  const formatTime = (time) => {
    if (!time) return "--:--";
    try {
      const parsed = new Date(time);
      if (isNaN(parsed.getTime())) return "--:--";
      return format(parsed, "hh:mm a");
    } catch (_) {
      return "--:--";
    }
  };

  const getDuration = () => {
    if (!todayAttendance?.check_in_time) return null;
    try {
      const start = new Date(todayAttendance.check_in_time);
      if (isNaN(start.getTime())) return null;
      const end = todayAttendance?.check_out_time
        ? new Date(todayAttendance.check_out_time)
        : currentTime;
      if (isNaN(end.getTime())) return null;
      const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours}h ${minutes}m ${seconds}s`;
    } catch (_) {
      return null;
    }
  };

  // Filtered list for Admin Summary
  const filteredSummary = (companyStats.today_summary || []).filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (item.full_name && item.full_name.toLowerCase().includes(query)) ||
      (item.employee_id && String(item.employee_id).toLowerCase().includes(query)) ||
      (item.department && item.department.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "present" && (item.status === "present" || item.status === "late")) ||
      (statusFilter === "on_leave" && item.status === "on_leave") ||
      (statusFilter === "absent" && item.status === "absent");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case "present":
        return { bg: "#10b981", color: "#ffffff", label: "✓ Present" };
      case "late":
        return { bg: "#f59e0b", color: "#ffffff", label: "⚠ Late" };
      case "on_leave":
        return { bg: "#8b5cf6", color: "#ffffff", label: "🌴 On Leave" };
      case "absent":
      default:
        return { bg: "#ef4444", color: "#ffffff", label: "✗ Absent" };
    }
  };

  const styles = {
    container: {
      padding: "30px",
      backgroundColor: "#0a0e27",
      minHeight: "100vh",
      color: "#ffffff",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    content: {
      maxWidth: "1200px",
      margin: "0 auto",
    },
    header: {
      marginBottom: "30px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#ffffff",
      margin: "0 0 8px 0",
    },
    subtitle: {
      fontSize: "14px",
      color: "#a0a5c0",
      margin: 0,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      background: "#1a1f3e",
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid #2a2f4a",
      position: "relative",
      overflow: "hidden",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "700",
      color: "#ffffff",
      margin: "12px 0 4px 0",
    },
    statLabel: {
      fontSize: "13px",
      color: "#a0a5c0",
      fontWeight: "500",
    },
    statIcon: {
      fontSize: "24px",
      opacity: 0.85,
    },
    userCard: {
      background: "linear-gradient(135deg, #1a1f3e 0%, #111633 100%)",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "30px",
      border: "1px solid #2a2f4a",
    },
    userInfo: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
    },
    userAvatar: {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #4c9aff 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      fontWeight: "700",
      color: "#ffffff",
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#ffffff",
      marginBottom: "4px",
    },
    userEmail: {
      fontSize: "14px",
      color: "#a0a5c0",
      marginBottom: "8px",
    },
    userMeta: {
      display: "flex",
      gap: "20px",
      fontSize: "13px",
      color: "#4c9aff",
    },
    adminNavContainer: {
      display: "flex",
      gap: "12px",
      marginBottom: "24px",
      flexWrap: "wrap",
    },
    adminTabBtn: {
      padding: "12px 20px",
      borderRadius: "10px",
      background: "#1a1f3e",
      color: "#a0a5c0",
      border: "1px solid #2a2f4a",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
    },
    adminTabBtnActive: {
      background: "#4c9aff",
      color: "#ffffff",
      borderColor: "#4c9aff",
      boxShadow: "0 4px 14px rgba(76, 154, 255, 0.3)",
    },
    mainCard: {
      background: "#1a1f3e",
      borderRadius: "16px",
      padding: "40px",
      marginBottom: "30px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      border: "1px solid #2a2f4a",
      position: "relative",
      overflow: "hidden",
    },
    mainCardDecor: {
      position: "absolute",
      top: "-50%",
      right: "-10%",
      width: "300px",
      height: "300px",
      background: "linear-gradient(135deg, rgba(76,154,255,0.1) 0%, rgba(118,75,162,0.1) 100%)",
      borderRadius: "50%",
    },
    clockSection: {
      textAlign: "center",
      marginBottom: "40px",
      position: "relative",
      zIndex: 1,
    },
    currentTime: {
      fontSize: "56px",
      fontWeight: "700",
      color: "#ffffff",
      fontFamily: "monospace",
      marginBottom: "8px",
      letterSpacing: "2px",
    },
    currentDate: {
      fontSize: "16px",
      color: "#a0a5c0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },
    statusContainer: {
      display: "flex",
      justifyContent: "center",
      gap: "30px",
      marginBottom: "30px",
      flexWrap: "wrap",
    },
    statusBox: {
      textAlign: "center",
      padding: "20px",
      borderRadius: "12px",
      flex: 1,
      minWidth: "150px",
      border: "1px solid #2a2f4a",
    },
    statusBoxIn: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "white",
    },
    statusBoxOut: {
      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      color: "white",
    },
    statusBoxLabel: {
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "8px",
      opacity: 0.9,
    },
    statusBoxValue: {
      fontSize: "24px",
      fontWeight: "700",
    },
    durationCard: {
      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
      padding: "24px",
      borderRadius: "12px",
      textAlign: "center",
      marginBottom: "30px",
    },
    durationLabel: {
      fontSize: "14px",
      color: "#92400e",
      marginBottom: "8px",
      fontWeight: "600",
    },
    durationValue: {
      fontSize: "36px",
      fontWeight: "800",
      color: "#92400e",
    },
    buttonGroup: {
      display: "flex",
      gap: "20px",
      justifyContent: "center",
    },
    button: {
      padding: "12px 28px",
      fontSize: "15px",
      fontWeight: "600",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    checkInBtn: {
      background: "#10b981",
      color: "white",
    },
    checkOutBtn: {
      background: "#ef4444",
      color: "white",
    },
    disabledBtn: {
      background: "#2a2f4a",
      color: "#6c72a0",
      cursor: "not-allowed",
    },
    historySection: {
      background: "#1a1f3e",
      borderRadius: "12px",
      padding: "32px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      border: "1px solid #2a2f4a",
      marginBottom: "30px",
    },
    historyHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "2px solid #2a2f4a",
      flexWrap: "wrap",
      gap: "12px",
    },
    historyTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    historyCount: {
      fontSize: "13px",
      color: "#a0a5c0",
      background: "#0a0e27",
      padding: "4px 12px",
      borderRadius: "20px",
      fontWeight: "600",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#a0a5c0",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid #2a2f4a",
    },
    td: {
      padding: "14px 16px",
      fontSize: "14px",
      color: "#e0e5f0",
      borderBottom: "1px solid #2a2f4a",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px",
      color: "#6c72a0",
    },
    toast: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "12px 20px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      zIndex: 1000,
      animation: "slideInRight 0.3s ease",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    toastSuccess: {
      background: "#10b981",
      color: "white",
    },
    toastError: {
      background: "#ef4444",
      color: "white",
    },
    // Filter controls
    controlsContainer: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    searchInput: {
      padding: "8px 14px",
      borderRadius: "8px",
      background: "#0a0e27",
      border: "1px solid #2a2f4a",
      color: "#ffffff",
      fontSize: "14px",
      minWidth: "220px",
    },
    selectInput: {
      padding: "8px 14px",
      borderRadius: "8px",
      background: "#0a0e27",
      border: "1px solid #2a2f4a",
      color: "#ffffff",
      fontSize: "14px",
    },
    actionBtn: {
      padding: "8px 16px",
      borderRadius: "8px",
      background: "#8b5cf6",
      color: "#ffffff",
      border: "none",
      fontWeight: "600",
      fontSize: "13px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    // Employee Leave Card Grid
    leaveGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "20px",
      marginTop: "20px",
    },
    leaveCard: {
      background: "#0a0e27",
      border: "1px solid #2a2f4a",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1100,
      padding: "20px",
    },
    modalContent: {
      background: "#1a1f3e",
      border: "1px solid #2a2f4a",
      borderRadius: "16px",
      padding: "30px",
      width: "100%",
      maxWidth: "500px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .stat-card {
            transition: all 0.3s ease;
          }
          
          button {
            transition: all 0.2s ease;
          }
          
          button:hover:not(:disabled) {
            opacity: 0.85;
            transform: translateY(-1px);
          }
          
          button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          }
          
          tr:hover {
            background-color: #0f132e;
          }
          
          input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #4c9aff;
            box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
          }
        `}
      </style>

      <div style={styles.container}>
        <div style={styles.content}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Attendance Tracker</h1>
            <p style={styles.subtitle}>
              {isAdmin ? "Admin Overview & Employee Attendance Management" : "Track your daily attendance with ease"}
            </p>
          </div>

          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            {isAdmin ? (
              <>
                <div className="stat-card" style={styles.statCard}>
                  <FaUsers style={styles.statIcon} color="#4c9aff" />
                  <div style={styles.statValue}>{companyStats.total_employees}</div>
                  <div style={styles.statLabel}>Total Employees</div>
                </div>
                <div className="stat-card" style={styles.statCard}>
                  <FaCheckCircle style={styles.statIcon} color="#10b981" />
                  <div style={styles.statValue}>{companyStats.present_employees}</div>
                  <div style={styles.statLabel}>Present Today</div>
                </div>
                <div 
                  className="stat-card" 
                  style={{...styles.statCard, cursor: "pointer"}}
                  onClick={() => setAdminTab("leave")}
                >
                  <FaPlaneDeparture style={styles.statIcon} color="#8b5cf6" />
                  <div style={styles.statValue}>{companyStats.on_leave_employees}</div>
                  <div style={styles.statLabel}>Employees on Leave</div>
                </div>
                <div className="stat-card" style={styles.statCard}>
                  <FaTimesCircle style={styles.statIcon} color="#ef4444" />
                  <div style={styles.statValue}>{companyStats.absent_employees}</div>
                  <div style={styles.statLabel}>Absent Today</div>
                </div>
              </>
            ) : (
              <>
                <div className="stat-card" style={styles.statCard}>
                  <FaChartLine style={styles.statIcon} color="#4c9aff" />
                  <div style={styles.statValue}>{stats.attendanceRate}%</div>
                  <div style={styles.statLabel}>Attendance Rate</div>
                </div>
                <div className="stat-card" style={styles.statCard}>
                  <FaCheckCircle style={styles.statIcon} color="#10b981" />
                  <div style={styles.statValue}>{stats.presentDays}</div>
                  <div style={styles.statLabel}>Days Present</div>
                </div>
                <div className="stat-card" style={styles.statCard}>
                  <FaHistory style={styles.statIcon} color="#f59e0b" />
                  <div style={styles.statValue}>{stats.totalDays}</div>
                  <div style={styles.statLabel}>Total Days</div>
                </div>
              </>
            )}
          </div>

          {/* User Info Card */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', color: '#fff', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(username || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{username}</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>{email}</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#e2e8f0', cursor: 'default', textDecoration: 'none', fontWeight: '500' }}>
                    🆔 {isAdmin ? "Role: Admin" : `Employee ID: ${userObj?.employee_id || userObj?.emp_id || (employeeId ? `EMP-${employeeId}` : "N/A")}`}
                  </span>
                  <span style={{ color: '#e2e8f0', cursor: 'default', textDecoration: 'none', fontWeight: '500' }}>
                    📍 Office: Madhavaram
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          {isAdmin && (
            <div style={styles.adminNavContainer}>
              <button
                onClick={() => setAdminTab("summary")}
                style={{
                  ...styles.adminTabBtn,
                  ...(adminTab === "summary" ? styles.adminTabBtnActive : {}),
                }}
              >
                <FaClipboardList /> View Today's Attendance Summary
              </button>
              <button
                onClick={() => setAdminTab("leave")}
                style={{
                  ...styles.adminTabBtn,
                  ...(adminTab === "leave" ? styles.adminTabBtnActive : {}),
                }}
              >
                <FaPlaneDeparture /> Employees on Leave ({companyStats.on_leave_employees})
              </button>
              <button
                onClick={() => setAdminTab("punch")}
                style={{
                  ...styles.adminTabBtn,
                  ...(adminTab === "punch" ? styles.adminTabBtnActive : {}),
                }}
              >
                <FaClock /> My Attendance Punch
              </button>
            </div>
          )}

          {/* ADMIN TAB 1: Today's Attendance Summary */}
          {isAdmin && adminTab === "summary" && (
            <div style={styles.historySection}>
              <div style={styles.historyHeader}>
                <h3 style={styles.historyTitle}>
                  <FaClipboardList /> Today's Attendance Summary
                </h3>

                <div style={styles.controlsContainer}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search by name, ID, department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={styles.searchInput}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="all">All Statuses</option>
                    <option value="present">Present / Late</option>
                    <option value="on_leave">On Leave</option>
                    <option value="absent">Absent</option>
                  </select>

                  <button
                    onClick={() => openMarkLeaveFor("", "on_leave")}
                    style={styles.actionBtn}
                  >
                    <FaPlusCircle /> Mark Leave / Status
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Check In</th>
                      <th style={styles.th}>Check Out</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={styles.emptyState}>
                          <FaClipboardList size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
                          <div>No employees match the criteria</div>
                        </td>
                      </tr>
                    ) : (
                      filteredSummary.map((emp) => {
                        const badge = getStatusBadge(emp.status);
                        return (
                          <tr key={emp.id}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: "600", color: "#ffffff" }}>
                                {emp.full_name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#a0a5c0" }}>
                                ID: {emp.employee_id || `EMP-${emp.id}`}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div>{emp.department || "General"}</div>
                              <div style={{ fontSize: "12px", color: "#a0a5c0" }}>
                                {emp.designation || "Staff"}
                              </div>
                            </td>
                            <td style={styles.td}>{formatTime(emp.check_in_time)}</td>
                            <td style={styles.td}>{formatTime(emp.check_out_time)}</td>
                            <td style={styles.td}>
                              {emp.total_hours ? `${emp.total_hours}h` : "—"}
                            </td>
                            <td style={styles.td}>
                              <span
                                style={{
                                  ...styles.statusBadge,
                                  background: badge.bg,
                                  color: badge.color,
                                }}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => openMarkLeaveFor(emp.id, emp.status === "on_leave" ? "present" : "on_leave")}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #2a2f4a",
                                  background: "#0a0e27",
                                  color: "#4c9aff",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <FaEdit /> {emp.status === "on_leave" ? "Edit Status" : "Mark Leave"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADMIN TAB 2: Employees On Leave */}
          {isAdmin && adminTab === "leave" && (
            <div style={styles.historySection}>
              <div style={styles.historyHeader}>
                <div>
                  <h3 style={styles.historyTitle}>
                    <FaPlaneDeparture style={{ color: "#8b5cf6" }} /> Employees on Leave Today
                  </h3>
                  <p style={{ fontSize: "13px", color: "#a0a5c0", margin: "4px 0 0 0" }}>
                    Total {companyStats.employees_on_leave?.length || 0} employee(s) currently marked on leave.
                  </p>
                </div>

                <button
                  onClick={() => openMarkLeaveFor("", "on_leave")}
                  style={{ ...styles.actionBtn, background: "#8b5cf6" }}
                >
                  <FaPlusCircle /> Mark Employee on Leave
                </button>
              </div>

              {!companyStats.employees_on_leave || companyStats.employees_on_leave.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaPlaneDeparture size={48} style={{ marginBottom: "16px", color: "#8b5cf6", opacity: 0.6 }} />
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff" }}>
                    No Employees on Leave Today
                  </div>
                  <div style={{ fontSize: "13px", marginTop: "8px", color: "#a0a5c0" }}>
                    All available employees are marked working or present.
                  </div>
                </div>
              ) : (
                <div style={styles.leaveGrid}>
                  {companyStats.employees_on_leave.map((emp) => (
                    <div key={emp.id} style={styles.leaveCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "#8b5cf6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "white"
                        }}>
                          {(emp.full_name || "E").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "700", fontSize: "15px", color: "#ffffff" }}>
                            {emp.full_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#a0a5c0" }}>
                            ID: {emp.employee_id || `EMP-${emp.id}`}
                          </div>
                        </div>
                        <span style={{
                          ...styles.statusBadge,
                          background: "#8b5cf6",
                          color: "white",
                        }}>
                          🌴 On Leave
                        </span>
                      </div>

                      <div style={{ fontSize: "13px", color: "#e0e5f0" }}>
                        <strong>Dept:</strong> {emp.department || "General"} • {emp.designation || "Staff"}
                      </div>

                      {emp.notes && (
                        <div style={{
                          fontSize: "12px",
                          background: "#1a1f3e",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          color: "#a0a5c0",
                          fontStyle: "italic"
                        }}>
                          "{emp.notes}"
                        </div>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                        <button
                          onClick={() => handleMarkLeaveSubmit(null, emp.id, "present", "Back from leave")}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Mark Present (End Leave)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MAIN ATTENDANCE CARD (Always visible for non-admin, or when admin tab is "punch" or summary) */}
          {(!isAdmin || adminTab === "punch") && (
            <div style={styles.mainCard}>
              <div style={styles.mainCardDecor}></div>
              
              <div style={styles.clockSection}>
                <div style={styles.currentTime}>
                  {format(currentTime, "hh:mm:ss a")}
                </div>
                <div style={styles.currentDate}>
                  <FaCalendarAlt />
                  <span>{format(currentTime, "EEEE, MMMM d, yyyy")}</span>
                </div>
              </div>

              <div style={styles.statusContainer}>
                <div style={{...styles.statusBox, ...styles.statusBoxIn}}>
                  <div style={styles.statusBoxLabel}>
                    <FaClock /> Check In
                  </div>
                  <div style={styles.statusBoxValue}>
                    {formatTime(todayAttendance?.check_in_time)}
                  </div>
                </div>
                <div style={{...styles.statusBox, ...styles.statusBoxOut}}>
                  <div style={styles.statusBoxLabel}>
                    <FaClock /> Check Out
                  </div>
                  <div style={styles.statusBoxValue}>
                    {formatTime(todayAttendance?.check_out_time)}
                  </div>
                </div>
              </div>

              {isCheckedIn && (
                <div style={styles.durationCard}>
                  <div style={styles.durationLabel}>Today's Duration</div>
                  <div style={styles.durationValue}>
                    {getDuration() || "Calculating..."}
                  </div>
                </div>
              )}

              <div style={styles.buttonGroup}>
                <button
                  onClick={handleCheckIn}
                  disabled={loading || (isCheckedIn && !isCheckedOut)}
                  style={{
                    ...styles.button,
                    ...styles.checkInBtn,
                    ...((loading || (isCheckedIn && !isCheckedOut)) && styles.disabledBtn),
                  }}
                >
                  <FaSignInAlt /> {loading ? "Processing..." : isCheckedOut ? "Re-Check In" : "Check In"}
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={loading || !isCheckedIn}
                  style={{
                    ...styles.button,
                    ...styles.checkOutBtn,
                    ...((loading || !isCheckedIn) && styles.disabledBtn),
                  }}
                >
                  <FaSignOutAlt /> {loading ? "Processing..." : isCheckedOut ? "Update Check Out" : "Check Out"}
                </button>
              </div>
            </div>
          )}

          {/* History Section for logged in user */}
          {(!isAdmin || adminTab === "punch") && (
            <div style={styles.historySection}>
              <div style={styles.historyHeader}>
                <h3 style={styles.historyTitle}>
                  <FaHistory /> Attendance History
                </h3>
                <span style={styles.historyCount}>
                  {Array.isArray(attendanceHistory) ? attendanceHistory.length : 0} records
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Day</th>
                      <th style={styles.th}>Check In</th>
                      <th style={styles.th}>Check Out</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!Array.isArray(attendanceHistory) || attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={styles.emptyState}>
                          <FaHistory size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                          <div>No attendance records yet</div>
                          <div style={{ fontSize: "13px", marginTop: "8px" }}>
                            Check in to start tracking
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendanceHistory.map((rec) => {
                        if (!rec) return null;
                        const status = rec.status === "present"
                          ? { bg: "#10b981", color: "white", icon: "✓", label: "Present" }
                          : rec.status === "late"
                          ? { bg: "#f59e0b", color: "white", icon: "⚠", label: "Late" }
                          : rec.status === "on_leave"
                          ? { bg: "#8b5cf6", color: "white", icon: "🌴", label: "On Leave" }
                          : { bg: "#ef4444", color: "white", icon: "✗", label: "Absent" };

                        return (
                          <tr key={rec.id || Math.random()}>
                            <td style={styles.td}>
                              {safeFormatDate(rec.date, "MMM dd, yyyy")}
                            </td>
                            <td style={{...styles.td, color: "#a0a5c0"}}>
                              {safeFormatDate(rec.date, "EEE")}
                            </td>
                            <td style={styles.td}>
                              {formatTime(rec.check_in_time)}
                            </td>
                            <td style={styles.td}>
                              {formatTime(rec.check_out_time)}
                            </td>
                            <td style={styles.td}>
                              {rec.total_hours ? `${rec.total_hours}h` : "—"}
                            </td>
                            <td style={styles.td}>
                              <span
                                style={{
                                  ...styles.statusBadge,
                                  background: status.bg,
                                  color: status.color,
                                }}
                              >
                                {status.icon} {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Admin to Mark Leave / Update Status */}
      {leaveModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setLeaveModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaPlaneDeparture color="#8b5cf6" /> Update Employee Attendance / Leave
              </h3>
              <button
                onClick={() => setLeaveModalOpen(false)}
                style={{ background: "none", border: "none", color: "#a0a5c0", fontSize: "18px", cursor: "pointer" }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleMarkLeaveSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#a0a5c0", marginBottom: "6px" }}>
                  Select Employee *
                </label>
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  required
                  style={{ ...styles.selectInput, width: "100%" }}
                >
                  <option value="">-- Choose Employee --</option>
                  {(companyStats.today_summary || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || `EMP-${emp.id}`}) - {emp.department || "General"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#a0a5c0", marginBottom: "6px" }}>
                  Attendance Status *
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  required
                  style={{ ...styles.selectInput, width: "100%" }}
                >
                  <option value="on_leave">🌴 On Leave</option>
                  <option value="present">✓ Present</option>
                  <option value="late">⚠ Late</option>
                  <option value="absent">✗ Absent</option>
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#a0a5c0", marginBottom: "6px" }}>
                  Reason / Notes (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Sick Leave, Annual Leave, Casual Leave..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  style={{
                    ...styles.searchInput,
                    width: "100%",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "#0a0e27",
                    color: "#a0a5c0",
                    border: "1px solid #2a2f4a",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "#8b5cf6",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.isError ? styles.toastError : styles.toastSuccess),
          }}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
};

export default Attendance;
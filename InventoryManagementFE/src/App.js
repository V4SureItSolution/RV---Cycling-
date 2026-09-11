import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Login from "./Login";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Product from "./components/Product";
import Bill from "./components/Bill";
import VisitBillPage from "./components/VisitPage";
import SupplierPage from "./components/Supplier";
import SupplierDuplicatePage from "./components/SupplierList";
import ItemsPage from "./components/SuppliedItemLIst";
import Type from "./components/Type";
import LowStock from "./components/Lowstock";
import StockOut from "./components/StockOut";
import Quotation from "./components/Quotation";
import Invoice from "./components/Invoice";
import Service from "./components/ServiceBill";
import ServiceBillView from "./components/ServiceBillView";
import UserType from "./components/UserType";
import Employee from "./components/Employee";
import Attendance from "./components/Attendance";
import UserSettings from "./components/UserSetting";
import DiscountPage from "./components/DiscountPage"; // Import the discount page
import CurrentCompany from "./components/CurrentCompany";
import EnquiryPage from "./components/Enquiry";

import CustomerPage from "./components/Customer";
import EmployeeBill from "./components/EmployeeBill";
import Warranty from "./components/Warranty";
import PaymentTracking from "./components/PaymentTracking";
import Salary from "./components/Salary";

const ProtectedRoute = ({ submodule, children }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userPermissions = user?.permissions || [];
  const userType = user?.user_type || "";

  if (!userType || userType.toLowerCase() === "admin") {
    return children;
  }

  let hasAccess = false;
  if (Array.isArray(userPermissions)) {
    const item = userPermissions.find(
      (p) =>
        (p.submodule_id && p.submodule_id.toLowerCase() === submodule.toLowerCase()) ||
        (p.submodule && p.submodule.toLowerCase() === submodule.toLowerCase()) ||
        (p.id && p.id.toLowerCase() === submodule.toLowerCase())
    );
    if (item) {
      hasAccess = Boolean(item.view !== undefined ? item.view : item.allowed);
    } else {
      hasAccess = userPermissions.some(
        (p) => typeof p === "string" && p.toLowerCase() === submodule.toLowerCase()
      );
    }
  } else if (typeof userPermissions === "object" && userPermissions !== null) {
    if (userPermissions[submodule] !== undefined) {
      const val = userPermissions[submodule];
      hasAccess = typeof val === "boolean" ? val : Boolean(val?.view);
    } else {
      for (const key of Object.keys(userPermissions)) {
        if (
          key.toLowerCase() === submodule.toLowerCase() ||
          key.toLowerCase().endsWith(`_${submodule.toLowerCase()}`)
        ) {
          const val = userPermissions[key];
          hasAccess = typeof val === "boolean" ? val : Boolean(val?.view);
          break;
        }
      }
    }
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: "40px", color: "#f87171", textAlign: "center", background: "#1e293b", borderRadius: "12px", margin: "20px" }}>
        <h2>Access Denied</h2>
        <p style={{ color: "#94a3b8" }}>You do not have permission to view the "{submodule}" section.</p>
      </div>
    );
  }

  return children;
};

function Layout() {
  const location = useLocation();

  // Hide layout on login page
  const hideLayout = location.pathname === "/";

  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const contentStyle = {
    marginLeft: hideLayout ? "0" : isOpen ? "220px" : "70px",
    padding: hideLayout ? "0" : "80px 20px 20px 20px",
    minHeight: "100vh",
    background: "#0f172a", // Solid dark background (no white)
    transition: "all 0.3s ease",
  };

  return (
    <>
      {!hideLayout && <Sidebar isOpen={isOpen} />}

      <div style={contentStyle}>
        {!hideLayout && (
          <Header
            toggleSidebar={toggleSidebar}
            isOpen={isOpen}
          />
        )}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute submodule="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/product" element={<ProtectedRoute submodule="products"><Product /></ProtectedRoute>} />
          <Route path="/Bill" element={<ProtectedRoute submodule="create_bill"><Bill /></ProtectedRoute>} />
          <Route path="/billreport" element={<ProtectedRoute submodule="bill_reports"><VisitBillPage /></ProtectedRoute>} />
          <Route path="/supplier" element={<ProtectedRoute submodule="add_supplier"><SupplierPage /></ProtectedRoute>} />
          <Route path="/supplierList" element={<ProtectedRoute submodule="supplier_list"><SupplierDuplicatePage /></ProtectedRoute>} />
          <Route path="/itemlist" element={<ProtectedRoute submodule="stock_in"><ItemsPage /></ProtectedRoute>} />
          <Route path="/type" element={<ProtectedRoute submodule="category"><Type /></ProtectedRoute>} />
          <Route path="/lowstock" element={<ProtectedRoute submodule="low_stock"><LowStock /></ProtectedRoute>} />
          <Route path="/stockout" element={<ProtectedRoute submodule="stock_out"><StockOut /></ProtectedRoute>} />
          <Route path="/quotation" element={<ProtectedRoute submodule="quotations"><Quotation /></ProtectedRoute>} />
          <Route path="/invoice" element={<ProtectedRoute submodule="invoices"><Invoice /></ProtectedRoute>} />
          <Route path="/service" element={<ProtectedRoute submodule="service_bill"><Service /></ProtectedRoute>}/>
          <Route path="/attendance" element={<ProtectedRoute submodule="attendance"><Attendance /></ProtectedRoute>} />
          <Route path="/userSettings" element={<ProtectedRoute submodule="usersettings"><UserSettings /></ProtectedRoute>} />

          <Route path="/discount" element={<ProtectedRoute submodule="discount"><DiscountPage /></ProtectedRoute>} />
          <Route path="/Company" element={<ProtectedRoute submodule="company"><CurrentCompany /></ProtectedRoute>} />
          <Route path="/enquiry" element={<ProtectedRoute submodule="enquiries"><EnquiryPage /></ProtectedRoute>} />
          <Route path="/customer" element={<ProtectedRoute submodule="customer_details"><CustomerPage /></ProtectedRoute>} />
          <Route path="/employeebill" element={<ProtectedRoute submodule="sales_bills"><EmployeeBill /></ProtectedRoute>} />
          <Route path="/employee" element={<ProtectedRoute submodule="employee"><Employee /></ProtectedRoute>} />
          <Route path="/usertype" element={<ProtectedRoute submodule="user_type"><UserType /></ProtectedRoute>} />
          <Route path="/serviceBillView" element={<ProtectedRoute submodule="service_bills"><ServiceBillView /></ProtectedRoute>} />
          <Route path="/warranty" element={<ProtectedRoute submodule="warranty"><Warranty /></ProtectedRoute>} />
          <Route path="/paymenttracking" element={<ProtectedRoute submodule="payment_tracking"><PaymentTracking /></ProtectedRoute>} />
          <Route path="/salary" element={<ProtectedRoute submodule="salary"><Salary /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
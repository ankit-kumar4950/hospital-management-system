
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  CreditCard,
  FileText,
  Search,
  Plus,
  Activity,
  LogOut,
  Menu,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Download,
  Stethoscope,
  IndianRupee,
} from "lucide-react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Patients", icon: Users },
  { name: "Doctors", icon: UserRound },
  { name: "Appointments", icon: CalendarDays },
  { name: "Billing", icon: CreditCard },
  { name: "Medical Records", icon: FileText },
];

const emptyPatient = {
  first_name: "",
  last_name: "",
  age: "",
  gender: "Male",
  phone: "",
  email: "",
  address: "",
  date_of_birth: "",
};

const emptyDoctor = {
  first_name: "",
  last_name: "",
  specialization: "",
  qualification: "",
  experience: "",
  phone: "",
  email: "",
  consultation_fee: "",
};

const emptyAppointment = {
  patient_id: "",
  doctor_id: "",
  appointment_date: "",
  reason: "",
  status: "Scheduled",
};

const emptyBill = {
  patient_id: "",
  doctor_id: "",
  consultation_fee: "",
  medicine_charges: "",
  other_charges: "",
  total_amount: "",
  payment_status: "Pending",
};

const emptyMedicalRecord = {
  patient_id: "",
  doctor_id: "",
  diagnosis: "",
  symptoms: "",
  prescription: "",
  treatment: "",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN");
};

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getFullName = (person) => {
  if (!person) return "";
  return `${person.first_name || ""} ${person.last_name || ""}`.trim();
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  // AUTHENTICATION
const [token, setToken] = useState(
  () => sessionStorage.getItem("admin_token") || ""
);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [billings, setBillings] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingBillings, setLoadingBillings] = useState(false);
  const [loadingMedicalRecords, setLoadingMedicalRecords] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // API HELPER
  // --------------------------------------------------

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;

    try {
      const errorData = await response.json();

      if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail
          .map((item) => item.msg)
          .join(", ");
      } else if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

  // ADMIN LOGIN

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", loginUsername);
      formData.append("password", loginPassword);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      sessionStorage.setItem("admin_token", data.access_token);
      setToken(data.access_token);
      setLoginPassword("");
      setActivePage("Dashboard");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ADMIN LOGOUT

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken("");
    setLoginUsername("");
    setLoginPassword("");
    setPatients([]);
    setDoctors([]);
    setAppointments([]);
    setBillings([]);
    setMedicalRecords([]);
    setActivePage("Dashboard");
    setLoginError("");
    setMessage("");
    setError("");
  };


  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const data = await apiRequest("/patients");
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(`Patients: ${err.message}`);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const data = await apiRequest("/doctors");
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(`Doctors: ${err.message}`);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const data = await apiRequest("/appointments");
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(`Appointments: ${err.message}`);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadBillings = async () => {
    setLoadingBillings(true);
    try {
      const data = await apiRequest("/billings");
      setBillings(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(`Billing: ${err.message}`);
    } finally {
      setLoadingBillings(false);
    }
  };

  const loadMedicalRecords = async () => {
    setLoadingMedicalRecords(true);
    try {
      const data = await apiRequest("/medical-records");
      setMedicalRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(`Medical Records: ${err.message}`);
    } finally {
      setLoadingMedicalRecords(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadPatients(),
      loadDoctors(),
      loadAppointments(),
      loadBillings(),
      loadMedicalRecords(),
    ]);
  };

  useEffect(() => {
    if (!token) return;

    if (activePage === "Dashboard") loadAllData();
    if (activePage === "Patients") loadPatients();
    if (activePage === "Doctors") loadDoctors();

    if (activePage === "Appointments") {
      loadPatients();
      loadDoctors();
      loadAppointments();
    }

    if (activePage === "Billing") {
      loadPatients();
      loadDoctors();
      loadBillings();
    }

    if (activePage === "Medical Records") {
      loadPatients();
      loadDoctors();
      loadMedicalRecords();
    }
  }, [activePage, token]);

  // --------------------------------------------------
  // NAME HELPERS
  // --------------------------------------------------

  const getPatientName = (id) => {
    const patient = patients.find(
      (item) => Number(item.id) === Number(id)
    );

    return getFullName(patient) || `Patient #${id}`;
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find(
      (item) => Number(item.id) === Number(id)
    );

    return getFullName(doctor) || `Doctor #${id}`;
  };

  // --------------------------------------------------
  // FORM CONFIGURATION
  // --------------------------------------------------

  const getFormFields = () => {
    if (activePage === "Patients") {
      return [
        {
          name: "first_name",
          label: "First Name",
          type: "text",
          required: true,
        },
        {
          name: "last_name",
          label: "Last Name",
          type: "text",
          required: true,
        },
        {
          name: "age",
          label: "Age",
          type: "number",
          required: true,
        },
        {
          name: "gender",
          label: "Gender",
          type: "select",
          options: ["Male", "Female", "Other"],
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "tel",
          required: true,
        },
        { name: "email", label: "Email", type: "email" },
        { name: "address", label: "Address", type: "textarea" },
        {
          name: "date_of_birth",
          label: "Date of Birth",
          type: "date",
        },
      ];
    }

    if (activePage === "Doctors") {
      return [
        {
          name: "first_name",
          label: "First Name",
          type: "text",
          required: true,
        },
        {
          name: "last_name",
          label: "Last Name",
          type: "text",
          required: true,
        },
        {
          name: "specialization",
          label: "Specialization",
          type: "text",
          required: true,
        },
        {
          name: "qualification",
          label: "Qualification",
          type: "text",
          required: true,
        },
        {
          name: "experience",
          label: "Experience (Years)",
          type: "number",
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "tel",
          required: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
        },
        {
          name: "consultation_fee",
          label: "Consultation Fee",
          type: "number",
          required: true,
        },
      ];
    }

    if (activePage === "Appointments") {
      return [
        {
          name: "patient_id",
          label: "Select Patient",
          type: "select",
          options: patients.map((p) => ({
            value: p.id,
            label: `${getFullName(p) || `Patient #${p.id}`} (ID: ${p.id})`,
          })),
          required: true,
        },
        {
          name: "doctor_id",
          label: "Select Doctor",
          type: "select",
          options: doctors.map((d) => ({
            value: d.id,
            label: `${getFullName(d) || `Doctor #${d.id}`} - ${d.specialization || "Specialist"}`,
          })),
          required: true,
        },
        {
          name: "appointment_date",
          label: "Appointment Date & Time",
          type: "datetime-local",
          required: true,
        },
        { name: "reason", label: "Reason", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Scheduled", "Completed", "Cancelled"],
        },
      ];
    }

    if (activePage === "Billing") {
      return [
        {
          name: "patient_id",
          label: "Select Patient",
          type: "select",
          options: patients.map((p) => ({
            value: p.id,
            label: `${getFullName(p) || `Patient #${p.id}`} (ID: ${p.id})`,
          })),
          required: true,
        },
        {
          name: "doctor_id",
          label: "Select Doctor",
          type: "select",
          options: doctors.map((d) => ({
            value: d.id,
            label: `${getFullName(d) || `Doctor #${d.id}`} (ID: ${d.id})`,
          })),
          required: true,
        },
        {
          name: "consultation_fee",
          label: "Consultation Fee",
          type: "number",
          required: true,
        },
        {
          name: "medicine_charges",
          label: "Medicine Charges",
          type: "number",
        },
        {
          name: "other_charges",
          label: "Other Charges",
          type: "number",
        },
        {
          name: "payment_status",
          label: "Payment Status",
          type: "select",
          options: ["Pending", "Paid", "Partially Paid"],
        },
      ];
    }

    if (activePage === "Medical Records") {
      return [
        {
          name: "patient_id",
          label: "Select Patient",
          type: "select",
          options: patients.map((p) => ({
            value: p.id,
            label: `${getFullName(p) || `Patient #${p.id}`} (ID: ${p.id})`,
          })),
          required: true,
        },
        {
          name: "doctor_id",
          label: "Select Doctor",
          type: "select",
          options: doctors.map((d) => ({
            value: d.id,
            label: `${getFullName(d) || `Doctor #${d.id}`} (ID: ${d.id})`,
          })),
          required: true,
        },
        {
          name: "diagnosis",
          label: "Diagnosis",
          type: "textarea",
          required: true,
        },
        { name: "symptoms", label: "Symptoms", type: "textarea" },
        {
          name: "prescription",
          label: "Prescription",
          type: "textarea",
        },
        { name: "treatment", label: "Treatment", type: "textarea" },
      ];
    }

    return [];
  };

  const getEmptyForm = () => {
    if (activePage === "Patients") return { ...emptyPatient };
    if (activePage === "Doctors") return { ...emptyDoctor };
    if (activePage === "Appointments") return { ...emptyAppointment };
    if (activePage === "Billing") return { ...emptyBill };
    if (activePage === "Medical Records") return { ...emptyMedicalRecord };
    return {};
  };

  const getEndpoint = () => {
    const endpoints = {
      Patients: "/patients",
      Doctors: "/doctors",
      Appointments: "/appointments",
      Billing: "/billings",
      "Medical Records": "/medical-records",
    };

    return endpoints[activePage];
  };

  // --------------------------------------------------
  // OPEN AND CLOSE FORM
  // --------------------------------------------------

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(getEmptyForm());
    setModalOpen(true);
    setError("");
  };

  const openEditModal = (item) => {
    setEditingItem(item);

    const updatedData = { ...item };

    if (updatedData.appointment_date) {
      updatedData.appointment_date = String(
        updatedData.appointment_date
      ).slice(0, 16);
    }

    if (updatedData.date_of_birth) {
      updatedData.date_of_birth = String(
        updatedData.date_of_birth
      ).slice(0, 10);
    }

    setFormData(updatedData);
    setModalOpen(true);
    setError("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // SAVE / UPDATE DATA
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      const endpoint = getEndpoint();

      if (!endpoint) {
        throw new Error("Invalid module selected.");
      }

      const payload = { ...formData };

      const numberFields = [
        "age",
        "experience",
        "consultation_fee",
        "medicine_charges",
        "other_charges",
        "patient_id",
        "doctor_id",
      ];

      numberFields.forEach((field) => {
        if (payload[field] !== "" && payload[field] !== undefined) {
          payload[field] = Number(payload[field]);
        }
      });

      if (activePage === "Billing") {
        payload.total_amount =
          Number(payload.consultation_fee || 0) +
          Number(payload.medicine_charges || 0) +
          Number(payload.other_charges || 0);
      }

      const options = {
        method: editingItem ? "PUT" : "POST",
        body: JSON.stringify(payload),
      };

      const url = editingItem
        ? `${endpoint}/${editingItem.id}`
        : endpoint;

      await apiRequest(url, options);

      const wasEditing = Boolean(editingItem);
      closeModal();

      showMessage(
        wasEditing
          ? `${activePage} updated successfully.`
          : `${activePage} added successfully.`
      );

      if (activePage === "Patients") await loadPatients();
      if (activePage === "Doctors") await loadDoctors();
      if (activePage === "Appointments") await loadAppointments();
      if (activePage === "Billing") await loadBillings();
      if (activePage === "Medical Records") await loadMedicalRecords();
    } catch (err) {
      showError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // --------------------------------------------------
  // DELETE DATA
  // --------------------------------------------------

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this record?"
    );

    if (!confirmed) return;

    try {
      await apiRequest(`${getEndpoint()}/${id}`, {
        method: "DELETE",
      });

      showMessage("Record deleted successfully.");

      if (activePage === "Patients") await loadPatients();
      if (activePage === "Doctors") await loadDoctors();
      if (activePage === "Appointments") await loadAppointments();
      if (activePage === "Billing") await loadBillings();
      if (activePage === "Medical Records") await loadMedicalRecords();
    } catch (err) {
      showError(err.message);
    }
  };

  // --------------------------------------------------
  // PDF GENERATION
  // --------------------------------------------------

  
const generateBillPDF = (bill) => {
  const patient = patients.find(
    (item) => Number(item.id) === Number(bill.patient_id)
  );

  const doctor = doctors.find(
    (item) => Number(item.id) === Number(bill.doctor_id)
  );

  const doc = new jsPDF();

  const total =
    bill.total_amount ??
    Number(bill.consultation_fee || 0) +
      Number(bill.medicine_charges || 0) +
      Number(bill.other_charges || 0);

  const formatAmount = (amount) =>
    `INR ${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const patientName =
    getFullName(patient) || `Patient #${bill.patient_id}`;

  const doctorName =
    getFullName(doctor) || `Doctor #${bill.doctor_id}`;

  // Hospital Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 43, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("HOSPITAL MANAGEMENT SYSTEM", 105, 19, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("OFFICIAL PAYMENT INVOICE", 105, 29, {
    align: "center",
  });

  doc.setFontSize(9);
  doc.text("Healthcare Management & Billing", 105, 36, {
    align: "center",
  });

  // Invoice Details
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", 15, 58);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(`Invoice No: BILL-${bill.id}`, 15, 68);
  doc.text(`Bill Date: ${formatDateTime(bill.bill_date)}`, 15, 75);

  // Payment Status
  const status = (bill.payment_status || "Pending").toUpperCase();
  const isPaid = status === "PAID";

  doc.setFillColor(
    isPaid ? 220 : 255,
    isPaid ? 252 : 237,
    isPaid ? 231 : 213
  );

  doc.roundedRect(145, 52, 50, 13, 3, 3, "F");

  doc.setTextColor(
    isPaid ? 22 : 194,
    isPaid ? 163 : 65,
    isPaid ? 74 : 12
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(status, 170, 60, { align: "center" });

  // Patient and Doctor Information
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, 86, 180, 48, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.text("PATIENT DETAILS", 21, 96);
  doc.text("DOCTOR DETAILS", 112, 96);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(`Name: ${patientName}`, 21, 105);
  doc.text(`Patient ID: ${bill.patient_id}`, 21, 112);
  doc.text(`Phone: ${patient?.phone || "-"}`, 21, 119);

  doc.text(`Name: ${doctorName}`, 112, 105);
  doc.text(`Doctor ID: ${bill.doctor_id}`, 112, 112);
  doc.text(`Specialization: ${doctor?.specialization || "-"}`, 112, 119);

  // Billing Table
  autoTable(doc, {
    startY: 145,
    head: [["Description", "Amount"]],
    body: [
      ["Consultation Fee", formatAmount(bill.consultation_fee)],
      ["Medicine Charges", formatAmount(bill.medicine_charges)],
      ["Other Charges", formatAmount(bill.other_charges)],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 125 },
      1: { halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 15, right: 15 },
  });

  // Total Amount
  const finalY = doc.lastAutoTable.finalY + 12;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(105, finalY, 90, 20, 3, 3, "F");

  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL AMOUNT", 111, finalY + 8);

  doc.setFontSize(13);
  doc.text(formatAmount(total), 189, finalY + 16, {
    align: "right",
  });

  // Footer
  const footerY = Math.max(finalY + 40, 260);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, 195, footerY);

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(
    "Thank you for choosing our hospital.",
    105,
    footerY + 9,
    { align: "center" }
  );

  doc.setFontSize(8);
  doc.text(
    "This is a computer-generated invoice.",
    105,
    footerY + 15,
    { align: "center" }
  );

  // Page Numbers
  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      195,
      290,
      { align: "right" }
    );
  }

  doc.save(`Hospital_Invoice_${bill.id}.pdf`);
};


  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filterData = (data) => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) return data;

    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  };

  // --------------------------------------------------
  // REUSABLE TABLE ACTIONS
  // --------------------------------------------------

  const TableActions = ({ item, showPDF = false }) => (
    <div className="action-buttons">
      {showPDF && (
        <button
          className="action-btn download-btn"
          title="Download PDF"
          onClick={() => generateBillPDF(item)}
        >
          <Download size={16} />
        </button>
      )}

      <button
        className="action-btn edit-btn"
        title="Edit"
        onClick={() => openEditModal(item)}
      >
        <Pencil size={16} />
      </button>

      <button
        className="action-btn delete-btn"
        title="Delete"
        onClick={() => handleDelete(item.id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const Loading = () => (
    <div className="loading-container">
      <RefreshCw className="spin" size={22} />
      <p>Loading data...</p>
    </div>
  );

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  const renderDashboard = () => {
    const totalRevenue = billings.reduce(
      (sum, bill) => sum + Number(bill.total_amount || 0),
      0
    );

    const paidRevenue = billings
      .filter(
        (bill) =>
          String(bill.payment_status || "").toLowerCase() === "paid"
      )
      .reduce(
        (sum, bill) => sum + Number(bill.total_amount || 0),
        0
      );

    const scheduled = appointments.filter(
      (item) =>
        String(item.status || "Scheduled").toLowerCase() === "scheduled"
    ).length;

    const completed = appointments.filter(
      (item) => String(item.status || "").toLowerCase() === "completed"
    ).length;

    const cancelled = appointments.filter(
      (item) => String(item.status || "").toLowerCase() === "cancelled"
    ).length;

    const appointmentTotal = appointments.length || 1;

    const stats = [
      {
        title: "Total Patients",
        value: patients.length,
        note: "Registered patients",
        icon: Users,
        color: "blue",
      },
      {
        title: "Total Doctors",
        value: doctors.length,
        note: "Available specialists",
        icon: Stethoscope,
        color: "green",
      },
      {
        title: "Appointments",
        value: appointments.length,
        note: `${scheduled} scheduled`,
        icon: CalendarDays,
        color: "orange",
      },
      {
        title: "Total Revenue",
        value: currency(totalRevenue),
        note: `${currency(paidRevenue)} collected`,
        icon: IndianRupee,
        color: "purple",
      },
    ];

    const recentAppointments = [...appointments]
      .sort(
        (a, b) =>
          new Date(b.appointment_date || 0) -
          new Date(a.appointment_date || 0)
      )
      .slice(0, 5);

    return (
      <div className="modern-dashboard">
        <div className="welcome-banner">
          <div className="welcome-text">
            <span className="welcome-label">HOSPITAL OVERVIEW</span>
            <h1>Welcome back, Admin!</h1>
            <p>Here's what's happening at your hospital today.</p>
          </div>

          <div className="welcome-icon">
            <Activity size={54} />
          </div>
        </div>

        <div className="dashboard-quick-actions">
          <button onClick={() => setActivePage("Patients")}>
            <Plus size={17} /> Add Patient
          </button>

          <button onClick={() => setActivePage("Doctors")}>
            <Plus size={17} /> Add Doctor
          </button>

          <button onClick={() => setActivePage("Appointments")}>
            <CalendarDays size={17} /> Manage Appointments
          </button>
        </div>

        <div className="dashboard-section-title">
          <div>
            <h2>Hospital Statistics</h2>
            <p>A quick look at your hospital's performance</p>
          </div>

          <button className="dashboard-refresh" onClick={loadAllData}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>

        <div className="dashboard-cards modern-stats">
          {stats.map((card) => {
            const Icon = card.icon;

            return (
              <div
                className={`dashboard-card modern-stat-card ${card.color}`}
                key={card.title}
              >
                <div className="stat-card-top">
                  <div className="dashboard-icon">
                    <Icon size={23} />
                  </div>
                  <span className="stat-card-dot"></span>
                </div>

                <p>{card.title}</p>
                <h2>{card.value}</h2>
                <span className="stat-card-note">{card.note}</span>
              </div>
            );
          })}
        </div>

        <div className="dashboard-section-title">
          <div>
            <h2>Appointment Analytics</h2>
            <p>Current appointment status overview</p>
          </div>
        </div>

        <div className="dashboard-analytics">
          <div className="content-card appointment-chart-card">
            <div className="analytics-card-heading">
              <div>
                <h3>Appointment Overview</h3>
                <p>Based on all recorded appointments</p>
              </div>
              <div className="analytics-icon">
                <CalendarDays size={21} />
              </div>
            </div>

            <div className="appointment-total">
              <strong>{appointments.length}</strong>
              <span>Total Appointments</span>
            </div>

            <div className="status-bars">
              {[
                {
                  label: "Scheduled",
                  count: scheduled,
                  dot: "scheduled-dot",
                  fill: "scheduled-fill",
                },
                {
                  label: "Completed",
                  count: completed,
                  dot: "completed-dot",
                  fill: "completed-fill",
                },
                {
                  label: "Cancelled",
                  count: cancelled,
                  dot: "cancelled-dot",
                  fill: "cancelled-fill",
                },
              ].map((status) => (
                <div className="status-bar-item" key={status.label}>
                  <div className="status-bar-label">
                    <span>
                      <i className={`status-dot ${status.dot}`}></i>
                      {status.label}
                    </span>
                    <strong>{status.count}</strong>
                  </div>

                  <div className="status-bar-track">
                    <div
                      className={`status-bar-fill ${status.fill}`}
                      style={{
                        width: `${(status.count / appointmentTotal) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-card hospital-overview-card">
            <div className="analytics-card-heading">
              <div>
                <h3>Hospital Overview</h3>
                <p>Records and payment summary</p>
              </div>
              <div className="analytics-icon green-icon">
                <Activity size={21} />
              </div>
            </div>

            <div className="overview-row">
              <div className="overview-row-icon blue-bg">
                <Users size={19} />
              </div>
              <div className="overview-row-text">
                <span>Medical Records</span>
                <strong>{medicalRecords.length}</strong>
              </div>
            </div>

            <div className="overview-row">
              <div className="overview-row-icon purple-bg">
                <FileText size={19} />
              </div>
              <div className="overview-row-text">
                <span>Total Bills</span>
                <strong>{billings.length}</strong>
              </div>
            </div>

            <div className="overview-row">
              <div className="overview-row-icon green-bg">
                <CreditCard size={19} />
              </div>
              <div className="overview-row-text">
                <span>Paid Bills</span>
                <strong>
                  {
                    billings.filter(
                      (bill) =>
                        String(bill.payment_status || "").toLowerCase() ===
                        "paid"
                    ).length
                  }
                </strong>
              </div>
            </div>

            <div className="overview-row">
              <div className="overview-row-icon orange-bg">
                <IndianRupee size={19} />
              </div>
              <div className="overview-row-text">
                <span>Pending Revenue</span>
                <strong>
                  {currency(Math.max(0, totalRevenue - paidRevenue))}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card modern-recent-card">
          <div className="analytics-card-heading recent-heading">
            <div>
              <h3>Recent Appointments</h3>
              <p>Latest appointments registered in the system</p>
            </div>

            <button
              className="text-btn"
              onClick={() => setActivePage("Appointments")}
            >
              View All <span>→</span>
            </button>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="empty-message">
              No appointments available yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="modern-dashboard-table">
                <thead>
                  <tr>
                    <th>Appointment ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentAppointments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          APT-{String(item.id).padStart(3, "0")}
                        </strong>
                      </td>
                      <td>{getPatientName(item.patient_id)}</td>
                      <td>{getDoctorName(item.doctor_id)}</td>
                      <td>{formatDateTime(item.appointment_date)}</td>
                      <td>
                        <span
                          className={`dashboard-status ${String(
                            item.status || "Scheduled"
                          ).toLowerCase()}`}
                        >
                          {item.status || "Scheduled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --------------------------------------------------
  // PATIENTS
  // --------------------------------------------------


const generatePatientReportPDF = () => {
  const doc = new jsPDF();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HOSPITAL MANAGEMENT SYSTEM", 105, 16, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("PATIENT DIRECTORY REPORT", 105, 26, {
    align: "center",
  });

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 15, 49);
  doc.text(`Total Patients: ${patients.length}`, 15, 57);

  autoTable(doc, {
    startY: 65,
    head: [[
      "ID",
      "Patient Name",
      "Age",
      "Gender",
      "Phone",
      "Email",
      "Address",
    ]],
    body: patients.map((patient) => [
      patient.id,
      getFullName(patient) || "Unnamed Patient",
      patient.age ?? "-",
      patient.gender || "-",
      patient.phone || "-",
      patient.email || "-",
      patient.address || "-",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    margin: { left: 10, right: 10, bottom: 20 },
  });

  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      195,
      290,
      { align: "right" }
    );
  }

  doc.save("Hospital_Patient_Report.pdf");
};


const renderPatients = () => (
  <div className="patients-page">
    <div className="patients-header">
      <div>
        <span className="section-eyebrow">PATIENT DIRECTORY</span>
        <h1>Patient Management</h1>
        <p>Manage patient profiles and personal information.</p>
      </div>

      <div className="patients-header-actions">
        <button
          className="primary-btn"
          onClick={generatePatientReportPDF}
        >
          <Download size={18} />
          Export PDF
        </button>

        <button
          className="primary-btn patients-add-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add New Patient
        </button>
      </div>
    </div>

    <div className="patient-summary-card">
      <div className="patient-summary-icon">
        <Users size={25} />
      </div>
      <div>
        <span>Total Registered Patients</span>
        <h2>{patients.length}</h2>
        <small>Patients in your hospital database</small>
      </div>
    </div>

    <div className="content-card patients-table-card">
      <div className="table-toolbar patients-toolbar">
        <div>
          <h2>All Patients</h2>
          <p>View and manage registered patients</p>
        </div>

        <div className="search-box patients-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingPatients ? (
        <Loading />
      ) : (
        <div className="table-responsive">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient ID</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filterData(patients).map((patient) => {
                const fullName = getFullName(patient);

                const initials = fullName
                  ? fullName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "PT";

                return (
                  <tr key={patient.id}>
                    <td>
                      <div className="patient-name-cell">
                        <div className="patient-avatar">{initials}</div>
                        <strong>{fullName || "Unnamed Patient"}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="patient-id">#{patient.id}</span>
                    </td>

                    <td>{patient.age ?? "-"}</td>

                    <td>
                      <span className="gender-badge">
                        {patient.gender || "-"}
                      </span>
                    </td>

                    <td>{patient.phone || "-"}</td>
                    <td>{patient.email || "-"}</td>
                    <td>{patient.address || "-"}</td>

                    <td>
                      <TableActions item={patient} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filterData(patients).length === 0 && (
            <p className="empty-message">No patients found.</p>
          )}
        </div>
      )}
    </div>
  </div>
);

  // --------------------------------------------------
  // DOCTORS
  // --------------------------------------------------


const generateDoctorReportPDF = () => {
  const doc = new jsPDF();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HOSPITAL MANAGEMENT SYSTEM", 105, 16, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("DOCTOR DIRECTORY REPORT", 105, 26, {
    align: "center",
  });

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    15,
    49
  );

  doc.text(`Total Doctors: ${doctors.length}`, 15, 57);

  autoTable(doc, {
    startY: 65,
    head: [[
      "ID",
      "Doctor Name",
      "Specialization",
      "Qualification",
      "Experience",
      "Phone",
      "Fee",
    ]],

    body: doctors.map((doctor) => [
      doctor.id,
      getFullName(doctor) || "Unnamed Doctor",
      doctor.specialization || "-",
      doctor.qualification || "-",
      doctor.experience != null
        ? `${doctor.experience} Years`
        : "-",
      doctor.phone || "-",
      `INR ${Number(
        doctor.consultation_fee ?? doctor.consultationFee ?? doctor.fee ?? 0
      ).toLocaleString("en-IN")}`,
    ]),

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },

    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    margin: {
      left: 10,
      right: 10,
      bottom: 20,
    },
  });

  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);

    doc.text(
      `Page ${i} of ${pageCount}`,
      195,
      290,
      { align: "right" }
    );
  }

  doc.save("Hospital_Doctor_Report.pdf");
};


const renderDoctors = () => (
  <div className="doctors-page">
    <div className="page-heading">
      <div>
        <h1>Doctor Management</h1>
        <p>Manage doctors and their information</p>
      </div>

      <div className="doctors-header-actions">
        <button
          className="primary-btn"
          onClick={generateDoctorReportPDF}
        >
          <Download size={18} />
          Export PDF
        </button>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Doctor
        </button>
      </div>
    </div>

    <div className="content-card">
      <div className="table-toolbar">
        <h2>All Doctors ({doctors.length})</h2>

        <div className="search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingDoctors ? (
        <Loading />
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Specialization</th>
                <th>Qualification</th>
                <th>Experience</th>
                <th>Phone</th>
                <th>Consultation Fee</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filterData(doctors).map((doctor) => (
                <tr key={doctor.id}>
                  <td>{doctor.id}</td>
                  <td>{getFullName(doctor) || "Unnamed Doctor"}</td>
                  <td>{doctor.specialization || "-"}</td>
                  <td>{doctor.qualification || "-"}</td>
                  <td>{doctor.experience ?? "-"} years</td>
                  <td>{doctor.phone || "-"}</td>
                  <td>{currency(doctor.consultation_fee)}</td>
                  <td>
                    <TableActions item={doctor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filterData(doctors).length === 0 && (
            <p className="empty-message">No doctors found.</p>
          )}
        </div>
      )}
    </div>
  </div>
);


  // --------------------------------------------------
  // APPOINTMENTS
  // --------------------------------------------------


const generateAppointmentReportPDF = () => {
  const doc = new jsPDF();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HOSPITAL MANAGEMENT SYSTEM", 105, 16, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("APPOINTMENT REPORT", 105, 26, {
    align: "center",
  });

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    15,
    49
  );

  doc.text(`Total Appointments: ${appointments.length}`, 15, 57);

  autoTable(doc, {
    startY: 65,
    head: [[
      "ID",
      "Patient Name",
      "Doctor Name",
      "Date & Time",
      "Reason",
      "Status",
    ]],

    body: appointments.map((appointment) => [
      appointment.id,
      getPatientName(appointment.patient_id) || "-",
      getDoctorName(appointment.doctor_id) || "-",
      formatDateTime(appointment.appointment_date),
      appointment.reason || "-",
      appointment.status || "Scheduled",
    ]),

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },

    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 38 },
      5: { cellWidth: 25 },
    },

    margin: {
      left: 10,
      right: 10,
      bottom: 20,
    },
  });

  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);

    doc.text(
      `Page ${i} of ${pageCount}`,
      195,
      290,
      { align: "right" }
    );
  }

  doc.save("Hospital_Appointment_Report.pdf");
};


const renderAppointments = () => (
  <div className="appointments-page">
    <div className="page-heading">
      <div>
        <h1>Appointment Management</h1>
        <p>Schedule and manage patient appointments</p>
      </div>

      <div className="appointments-header-actions">
        <button
          className="primary-btn"
          onClick={generateAppointmentReportPDF}
        >
          <Download size={18} />
          Export PDF
        </button>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Appointment
        </button>
      </div>
    </div>

    <div className="content-card">
      <div className="table-toolbar">
        <h2>All Appointments ({appointments.length})</h2>

        <div className="search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingAppointments ? (
        <Loading />
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filterData(appointments).map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{getPatientName(item.patient_id)}</td>
                  <td>{getDoctorName(item.doctor_id)}</td>
                  <td>{formatDateTime(item.appointment_date)}</td>
                  <td>{item.reason || "-"}</td>
                  <td>
                    <span className="status-badge">
                      {item.status || "Scheduled"}
                    </span>
                  </td>
                  <td>
                    <TableActions item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filterData(appointments).length === 0 && (
            <p className="empty-message">
              No appointments found.
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);


  // --------------------------------------------------
  // BILLING
  // --------------------------------------------------

const renderBilling = () => (
  <div className="billing-page">
    <div className="page-heading">
      <div>
        <h1>Billing Management</h1>
        <p>Manage hospital bills and payments</p>
      </div>

      <button className="primary-btn" onClick={openAddModal}>
        <Plus size={18} />
        Create Bill
      </button>
    </div>

    <div className="content-card">
      <div className="table-toolbar">
        <h2>All Bills ({billings.length})</h2>

        <div className="search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingBillings ? (
        <Loading />
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Consultation</th>
                <th>Medicine</th>
                <th>Other</th>
                <th>Total</th>
                <th>Status</th>
                <th>Bill Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filterData(billings).map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.id}</td>
                  <td>{getPatientName(bill.patient_id)}</td>
                  <td>{getDoctorName(bill.doctor_id)}</td>
                  <td>{currency(bill.consultation_fee)}</td>
                  <td>{currency(bill.medicine_charges)}</td>
                  <td>{currency(bill.other_charges)}</td>
                  <td>
                    <strong>
                      {currency(
                        bill.total_amount ??
                          Number(bill.consultation_fee || 0) +
                            Number(bill.medicine_charges || 0) +
                            Number(bill.other_charges || 0)
                      )}
                    </strong>
                  </td>
                  <td>
                    <span className="status-badge">
                      {bill.payment_status || "Pending"}
                    </span>
                  </td>
                  <td>{formatDateTime(bill.bill_date)}</td>
                  <td>
                    <TableActions item={bill} showPDF />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filterData(billings).length === 0 && (
            <p className="empty-message">No bills found.</p>
          )}
        </div>
      )}
    </div>
  </div>
);


  // --------------------------------------------------
  // MEDICAL RECORDS
  // --------------------------------------------------


const generateMedicalRecordsReportPDF = () => {
  const doc = new jsPDF();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HOSPITAL MANAGEMENT SYSTEM", 105, 16, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("MEDICAL RECORDS REPORT", 105, 26, {
    align: "center",
  });

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    15,
    49
  );

  doc.text(
    `Total Medical Records: ${medicalRecords.length}`,
    15,
    57
  );

  autoTable(doc, {
    startY: 65,

    head: [[
      "ID",
      "Patient",
      "Doctor",
      "Diagnosis",
      "Symptoms",
      "Prescription",
      "Treatment",
      "Record Date",
    ]],

    body: medicalRecords.map((record) => [
      record.id,
      getPatientName(record.patient_id) || "-",
      getDoctorName(record.doctor_id) || "-",
      record.diagnosis || "-",
      record.symptoms || "-",
      record.prescription || "-",
      record.treatment || "-",
      record.record_date
        ? formatDateTime(record.record_date)
        : "-",
    ]),

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 6,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
    },

    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 23 },
      2: { cellWidth: 23 },
      3: { cellWidth: 28 },
      4: { cellWidth: 25 },
      5: { cellWidth: 27 },
      6: { cellWidth: 27 },
      7: { cellWidth: 27 },
    },

    margin: {
      left: 10,
      right: 10,
      bottom: 20,
    },
  });

  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);

    doc.text(
      `Page ${i} of ${pageCount}`,
      195,
      290,
      { align: "right" }
    );
  }

  doc.save("Hospital_Medical_Records_Report.pdf");
};

  

const renderMedicalRecords = () => (
  <div className="medical-records-page">
    <div className="page-heading">
      <div>
        <h1>Medical Records Management</h1>
        <p>Manage patient diagnoses and treatments</p>
      </div>

      <div className="medical-records-header-actions">
        <button
          className="primary-btn"
          onClick={generateMedicalRecordsReportPDF}
        >
          <Download size={18} />
          Export PDF
        </button>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Medical Record
        </button>
      </div>
    </div>

    <div className="content-card">
      <div className="table-toolbar">
        <h2>All Medical Records ({medicalRecords.length})</h2>

        <div className="search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search medical records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingMedicalRecords ? (
        <Loading />
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Diagnosis</th>
                <th>Symptoms</th>
                <th>Prescription</th>
                <th>Treatment</th>
                <th>Record Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filterData(medicalRecords).map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{getPatientName(record.patient_id)}</td>
                  <td>{getDoctorName(record.doctor_id)}</td>
                  <td>{record.diagnosis}</td>
                  <td>{record.symptoms || "-"}</td>
                  <td>{record.prescription || "-"}</td>
                  <td>{record.treatment || "-"}</td>
                  <td>{formatDateTime(record.record_date)}</td>
                  <td>
                    <TableActions item={record} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filterData(medicalRecords).length === 0 && (
            <p className="empty-message">
              No medical records found.
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);



  // --------------------------------------------------
  // FORM FIELD RENDERER
  // --------------------------------------------------

  const renderFormField = (field) => {
    const value = formData[field.name] ?? "";

    return (
      <div className="form-group" key={field.name}>
        <label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="required-star"> *</span>}
        </label>

        {field.type === "textarea" ? (
          <textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={handleInputChange}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={3}
            required={field.required}
          />
        ) : field.type === "select" ? (
          <select
            id={field.name}
            name={field.name}
            value={value}
            onChange={handleInputChange}
            required={field.required}
          >
            <option value="">Select {field.label}</option>

            {field.options?.map((option) => {
              if (typeof option === "string") {
                return (
                  <option key={option} value={option}>
                    {option}
                  </option>
                );
              }

              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>
        ) : (
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={value}
            onChange={handleInputChange}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            min={field.type === "number" ? "0" : undefined}
          />
        )}
      </div>
    );
  };

  // --------------------------------------------------
  // MAIN PAGE CONTENT
  // --------------------------------------------------

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return renderDashboard();
      case "Patients":
        return renderPatients();
      case "Doctors":
        return renderDoctors();
      case "Appointments":
        return renderAppointments();
      case "Billing":
        return renderBilling();
      case "Medical Records":
        return renderMedicalRecords();
      default:
        return renderDashboard();
    }
  };

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  // SHOW LOGIN PAGE WHEN ADMIN IS NOT LOGGED IN

  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">
            <Activity size={32} />
          </div>

          <h1>Admin Login</h1>
          <p>Sign in to Hospital Management System</p>

          {loginError && (
            <div className="alert-error">{loginError}</div>
          )}

          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="Enter username"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          <button type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-closed"}`}>
        <div className="sidebar-header">
          <div className="hospital-logo">
            <Activity size={27} />
          </div>

          {sidebarOpen && (
            <div className="hospital-name">
              <h2>MedCare</h2>
              <p>Hospital System</p>
            </div>
          )}
        </div>

        <div className="sidebar-menu">
          <p className="menu-label">
            {sidebarOpen ? "MAIN MENU" : ""}
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSearchTerm("");
                }}
                title={!sidebarOpen ? item.name : ""}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="profile-avatar">A</div>

          {sidebarOpen && (
            <div className="profile-info">
              <h4>Administrator</h4>
              <p>Hospital Admin</p>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h3>{activePage}</h3>
              <p>Hospital Management System</p>
            </div>
          </div>

          
        <div className="header-right">
          <div className="admin-label">
           <span className="admin-dot"></span>
             Admin
          </div>

             <button className="logout-btn" onClick={handleLogout}>
             <LogOut size={17} />
                Logout
              </button>
            </div>
            </header>

        <section className="page-content">
          {message && (
            <div className="alert-success">
              {message}
              <button onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="alert-error">
              {error}
              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {renderPage()}
        </section>
      </main>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-container"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingItem ? "Edit" : "Add"} {activePage}
                </h2>

                <p>
                  {editingItem
                    ? "Update the information below."
                    : "Enter the information below."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {getFormFields().map(renderFormField)}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : editingItem
                    ? "Update"
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

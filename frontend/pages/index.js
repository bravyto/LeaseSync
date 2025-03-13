import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Globe, Info, FileText } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";

export default function LeasingDashboard() {
  const [language, setLanguage] = useState("en");
  const [contracts, setContracts] = useState([]); // Start with an empty table
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const openLocationModal = (contract) => {
    setSelectedLocation(contract);
    setLocationModalOpen(true);
  };

  const closeLocationModal = () => {
    setLocationModalOpen(false);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);
  const [closestInvoiceDue, setClosestInvoiceDue] = useState(null);
  const [activeLeases, setActiveLeases] = useState(0);
  const [dueSoonLeases, setDueSoonLeases] = useState(0);
  const [overdueLeases, setOverdueLeases] = useState(0);
  const [leaseWarnings, setLeaseWarnings] = useState([]);
  const [invoiceWarnings, setInvoiceWarnings] = useState([]);

  const fetchContracts = async () => {
    try {
      const response = await fetch("http://localhost:8000/contracts");
      const data = await response.json();
      setContracts(data.data);

      const today = new Date();

      const cleanCurrency = (value) => {
        if (!value) return 0;

        return parseFloat(
          value
            .replace(/[^\d,]/g, "") // Remove everything except digits and commas
            .replace(",", ".") // Convert the first comma to a dot for decimals
        ) || 0; // Ensure fallback to 0
      };

      const activeContracts = data.data.filter(contract => {
        const startDate = new Date(contract.start_date);
        const endDate = new Date(contract.end_date);
        return today >= startDate && today <= endDate; // Active contracts only
      });

      const activeInvoices = activeContracts
        .flatMap(contract => contract.contract_files.filter(file => file.document_type === "invoice"));

      const totalAmount = activeInvoices.reduce((sum, file) => sum + cleanCurrency(file.last_invoice_amount), 0);
      setTotalInvoiceAmount(totalAmount);

      const closestDue = activeInvoices
        .map(file => new Date(file.last_invoice_due))
        .filter(date => date >= today) // Only future dates
        .sort((a, b) => a - b)[0]; // Get the closest

      setClosestInvoiceDue(closestDue ? closestDue.toDateString() : "No upcoming invoices");

      let activeCount = 0;
      let dueSoonCount = 0;
      let overdueCount = 0;
      let leaseWarnings = [];
      let invoiceWarnings = [];

      data.data
        .filter(contract => contract.status?.toLowerCase() !== "processing")
        .forEach(contract => {
          const startDate = new Date(contract.start_date);
          const endDate = new Date(contract.end_date);
          const leaseName = contract.location_name;

          if (today >= startDate && today <= endDate) {
            activeCount++;
            const daysRemaining = (endDate - today) / (1000 * 60 * 60 * 24); // Convert to days

            if (daysRemaining < 30) {
              dueSoonCount++;
              leaseWarnings.push(`${leaseName} is due soon (${endDate.toDateString()})`);
            }
          } else if (today > endDate) {
            overdueCount++;
            leaseWarnings.push(`${leaseName} is overdue (${endDate.toDateString()})`);
          }

          contract.contract_files
            .filter(file => file.document_type === "invoice")
            .forEach(file => {
              const invoiceDueDate = new Date(file.last_invoice_due);
              const invoiceDaysRemaining = (invoiceDueDate - today) / (1000 * 60 * 60 * 24);

              if (today > invoiceDueDate) {
                invoiceWarnings.push(`${leaseName} has an overdue invoice (${invoiceDueDate.toDateString()})`);
              } else if (invoiceDaysRemaining < 30) {
                invoiceWarnings.push(`${leaseName} has an invoice due soon (${invoiceDueDate.toDateString()})`);
              }
            });
        });

      setActiveLeases(activeCount);
      setDueSoonLeases(dueSoonCount);
      setOverdueLeases(overdueCount);
      setLeaseWarnings(leaseWarnings);
      setInvoiceWarnings(invoiceWarnings);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const translations = {
    en: {
      title: "LeaseSync",
      tagline: "Effortless lease contract management for modern businesses",
      upload: "Upload Document",
      uploadSubtitle: "The uploaded documents can be contracts/agreements, invoices, letters of intent, or various other financial or legal documents",
      uploadButton: "Upload Documents",
      totalOverdue: "Total Active Invoice Value",
      latestPaymentDeadline: "Closest Payment Due",
      dueDateAlerts: "Due Date Alerts",
      contractOverview: "Contract Overview",
      translate: "Translate to Bahasa"
    },
    id: {
      title: "LeaseSync",
      tagline: "Manajemen kontrak sewa yang mudah untuk bisnis modern",
      upload: "Unggah Dokumen",
      uploadSubtitle: "Dokumen yang diunggah dapat berupa kontrak/perjanjian, faktur, surat pernyataan minat, atau berbagai dokumen keuangan atau hukum lainnya",
      uploadButton: "Unggah Dokumen",
      totalOverdue: "Total Tagihan Aktif",
      latestPaymentDeadline: "Batas Waktu Pembayaran Terdekat",
      dueDateAlerts: "Peringatan Tanggal Jatuh Tempo",
      contractOverview: "Ringkasan Kontrak",
      translate: "Terjemahkan ke Bahasa Inggris"
    }
  };

  const [processingLeases, setProcessingLeases] = useState(new Set());
  const pollIntervals = useRef(new Map());

  const handleFileUpload = async (event) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setLoading(true);

    // Track multiple uploads
    const newProcessingLeases = new Set(processingLeases);

    try {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file); // Keeping the existing "file" key

        const response = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          newProcessingLeases.add(result.lease_id);
          fetchContracts();
          pollStatus(result.lease_id); // Start polling each uploaded file
        } else {
          console.error("Upload error:", result.detail);
        }
      }

      setProcessingLeases(newProcessingLeases); // Update state after all uploads
    } catch (error) {
      console.error("Failed to upload:", error);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (leaseId) => {
    if (pollIntervals.current.has(leaseId)) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/contracts/${leaseId}`);
        const result = await response.json();

        if (result.status === "completed") {
          clearInterval(interval);
          pollIntervals.current.delete(leaseId);

          setProcessingLeases((prev) => {
            const newSet = new Set(prev);
            newSet.delete(leaseId);
            return newSet;
          });

          fetchContracts(); // Refresh contract list
        } else if (result.status === "failed") {
          clearInterval(interval);
          pollIntervals.current.delete(leaseId);
          alert("File processing failed.");
        }
      } catch (error) {
        console.error("Error checking lease status:", error);
      }
    }, 5000);

    pollIntervals.current.set(leaseId, interval);
  };

  const renderValue = (value) => {
    if (Array.isArray(value)) {
      return (
        <ul className="ml-4 list-disc">
          {value.map((item, index) => (
            <li key={index}>
              {typeof item === "object" ? (
                <ul className="ml-4 list-disc">
                  {Object.entries(item).map(([subKey, subValue]) => (
                    <li key={subKey}>
                      <strong className="capitalize">{subKey.replace(/_/g, " ")}:</strong> {subValue}
                    </li>
                  ))}
                </ul>
              ) : (
                item
              )}
            </li>
          ))}
        </ul>
      );
    } else if (typeof value === "object" && value !== null) {
      return (
        <ul className="ml-4 list-disc">
          {Object.entries(value).map(([subKey, subValue]) => (
            <li key={subKey}>
              <strong className="capitalize">{subKey.replace(/_/g, " ")}:</strong> {subValue}
            </li>
          ))}
        </ul>
      );
    } else {
      return value;
    }
  };

  const openModal = (info) => setModalData(info);
  const closeModal = () => setModalData(null);

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">{translations[language].title}</h1>
          <p className="text-lg text-gray-600">{translations[language].tagline}</p>
        </div>
        <Button onClick={() => setLanguage(language === "en" ? "id" : "en")} className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-lg hover:bg-blue-600">
          <Globe size={18} /> {language === "en" ? "Terjemahkan ke Bahasa" : "Translate to English"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white shadow-lg rounded-xl p-6 h-full flex flex-col justify-center">
          <CardContent className="text-center">
            <h2 className="text-lg font-semibold text-red-600 flex items-center justify-center gap-2">
              ⚠️ {translations[language].totalOverdue}
            </h2>
            <p className="text-4xl font-bold text-[#EF4444] mt-2">
              IDR {totalInvoiceAmount ? totalInvoiceAmount.toLocaleString("id-ID") : "0"}
            </p>
            <p className="text-gray-700 mt-3">
              📅 <span className="font-semibold">{translations[language].latestPaymentDeadline}:</span>
              <span className="text-red-500 font-medium"> {closestInvoiceDue || "-"}</span>
            </p>
            {invoiceWarnings.length > 0 ? (
              <ul className="list-none mt-2 text-gray-700">
                {invoiceWarnings.map((warning, index) => {
                  const [leaseName, date] = warning.split(" (");
                  return (
                    <li key={index} className="p-2 border-l-4 border-yellow-500 bg-yellow-50 text-yellow-700 rounded-md mb-2">
                      <strong>{leaseName}</strong>
                      <span className="block text-sm text-gray-600">Invoice Due: {date.replace(")", "")}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-gray-500">✅ No urgent invoice alerts</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg rounded-xl p-6">
          <CardContent>
            <h2 className="text-lg font-semibold text-[#475569] flex items-center gap-2">
              📜 Lease Status Summary
            </h2>

            {/* Lease Status Overview */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg">
                🟢 <span className="font-semibold">Active:</span> {activeLeases}
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
                🟡 <span className="font-semibold">Due Soon:</span> {dueSoonLeases}
              </div>
              <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded-lg">
                🔴 <span className="font-semibold">Overdue:</span> {overdueLeases}
              </div>
            </div>

            {/* Lease Alerts Section */}
            <h3 className="mt-4 text-md font-semibold text-[#475569]">⚠️ Upcoming & Overdue Leases</h3>

            {leaseWarnings.length > 0 ? (
              <ul className="list-none mt-2 text-gray-700">
                {leaseWarnings.map((warning, index) => {
                  const [leaseName, date] = warning.split(" (");
                  return (
                    <li key={index} className="p-2 border-l-4 border-red-500 bg-red-50 text-red-700 rounded-md mb-2">
                      <strong>{leaseName}</strong>
                      <span className="block text-sm text-gray-600">Due: {date.replace(")", "")}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-gray-500">✅ No urgent lease alerts</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-700">Upload Lease Documents</h2>
        <div className="flex gap-4 mt-4">
          <Input type="file" multiple onChange={handleFileUpload} className="cursor-pointer border p-3 rounded-lg" />
          <Button className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-lg hover:bg-blue-600" disabled={loading}>
            {loading ? "Uploading..." : <><Upload size={18} /> {translations[language].uploadButton}</>}
          </Button>
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-700">{translations[language].contractOverview}</h2>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">Location</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Payment Period</th>
                <th className="border px-4 py-2">Scheme</th>
                <th className="border px-4 py-2">Monthly Cost</th>
                <th className="border px-4 py-2">Lease Due Date</th>
                <th className="border px-4 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {!contracts || contracts.length === 0 ? (
                <tr>
                  <td colSpan="12" className="border px-4 py-4 text-center text-gray-500">
                    No contracts uploaded yet.
                  </td>
                </tr>
              ) : (
                contracts.map((contract, index) => (
                  processingLeases.has(index + 1) ? (
                    <tr>
                      <td colSpan="12" className="border px-4 py-4 text-center text-gray-500">
                        Processing {contract.location_name} <span className="loader"></span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="border px-4 py-2">{index + 1}</td>
                      <td className="border px-4 py-2">{contract.location_name}</td>
                      <td className="border px-4 py-2">
                        {(() => {
                          const today = new Date();
                          const startDate = new Date(contract.start_date);
                          const endDate = new Date(contract.end_date);
                          const timeDiff = endDate - today;
                          const daysRemaining = timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days

                          if (today >= startDate && today <= endDate) {
                            if (daysRemaining < 30) {
                              return <span className="text-orange-500 font-semibold">Due Soon</span>; // ✅ Less than 1 month left
                            }
                            return <span className="text-green-600 font-semibold">Active</span>; // ✅ Within date range
                          } else {
                            return <span className="text-red-600 font-semibold">Inactive</span>; // ✅ Expired
                          }
                        })()}
                      </td>
                      <td className="border px-4 py-2">{contract.payment_terms}</td>
                      <td className="border px-4 py-2">{contract.cooperation_type}</td>
                      <td className="border px-4 py-2">{contract.monthly_cost_amount}</td>
                      <td className="border px-4 py-2">{contract.end_date}</td>
                      <td className="border px-4 py-2 text-center">
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          onClick={() => openLocationModal(contract)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Info Popup */}
      {modalData && (
        <Dialog open={!!modalData} onClose={closeModal} className="relative z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
              <Button
                onClick={closeModal}
                className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-700"
              >
                X
              </Button>
              <Dialog.Title className="text-xl font-bold mb-4">Additional Information</Dialog.Title>
              <div className="overflow-y-auto max-h-80">
                <ul className="space-y-2">
                  {modalData && (
                    <ul>
                      {Object.entries(modalData).map(([key, value]) => (
                        <li key={key}>
                          <strong className="capitalize">{key.replace(/_/g, " ")}:</strong> {renderValue(value)}
                        </li>
                      ))}
                    </ul>
                  )}
                </ul>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {isLocationModalOpen && selectedLocation && (
        <Dialog open={isLocationModalOpen} onClose={closeLocationModal} className="relative z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true"></div>
          <div className="fixed inset-0 flex items-center justify-center">
            <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[90vh] overflow-hidden relative">
              <button
                onClick={closeLocationModal}
                className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-700"
              >
                ✕
              </button>

              <Dialog.Title className="text-lg font-semibold mb-4">
                {selectedLocation.location_name}
              </Dialog.Title>

              {/* Location Info */}
              <div className="mb-4">
                <p><strong>Address:</strong> {selectedLocation.location_address}</p>
                <p><strong>Scheme:</strong> {selectedLocation.cooperation_type}</p>
                <p><strong>Payment Period:</strong> {selectedLocation.payment_terms}</p>
              </div>

              <div className="max-h-[60vh] overflow-auto border border-gray-300 rounded-md p-4">
                {/* Agreements Table */}
                <h4 className="text-md font-semibold mb-2">Agreements</h4>
                <table className="w-full border-collapse border border-gray-300 mb-4">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border px-4 py-2">Document Date</th>
                      <th className="border px-4 py-2">Lease Start</th>
                      <th className="border px-4 py-2">Lease End</th>
                      <th className="border px-4 py-2">Monthly Cost</th>
                      <th className="border px-4 py-2">Security Deposit</th>
                      <th className="border px-4 py-2">More Info</th>
                      <th className="border px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLocation.contract_files
                      .filter(file => file.document_type != "invoice")
                      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
                      .map((file, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="border px-4 py-2">{format(new Date(file.uploaded_at), "yyyy-MM-dd")}</td>
                          <td className="border px-4 py-2">{file.start_date}</td>
                          <td className="border px-4 py-2">{file.end_date}</td>
                          <td className="border px-4 py-2">{file.monthly_cost_amount}</td>
                          <td className="border px-4 py-2">{file.security_deposit_amount}</td>
                          <td className="border px-4 py-2 text-center">
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                              onClick={() => openModal(file.additional_info)}
                            >
                              Open Info
                            </button>
                          </td>
                          <td className="border px-4 py-2 text-center">
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open File
                              </a>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Invoices Table */}
                <h4 className="text-md font-semibold mb-2">Invoices</h4>
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border px-4 py-2">Invoice Date</th>
                      <th className="border px-4 py-2">Payment Due</th>
                      <th className="border px-4 py-2">Amount</th>
                      <th className="border px-4 py-2">More Info</th>
                      <th className="border px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLocation.contract_files
                      .filter(file => file.document_type === "invoice")
                      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
                      .map((file, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="border px-4 py-2">{format(new Date(file.uploaded_at), "yyyy-MM-dd")}</td>
                          <td className="border px-4 py-2">{file.last_invoice_due}</td>
                          <td className="border px-4 py-2">{file.last_invoice_amount}</td>
                          <td className="border px-4 py-2 text-center">
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                              onClick={() => openModal(file.additional_info)}
                            >
                              Open Info
                            </button>
                          </td>
                          <td className="border px-4 py-2 text-center">
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open File
                              </a>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
}

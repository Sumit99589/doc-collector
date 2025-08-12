const express = require("express");
const router = express.Router();

const clients = new Map();

function addClient(req, res) {
    const { name, email, contact } = req.body;

    if (!name || !email || !contact) {
        return res.status(400).json({ error: "Name, email, and contact are required" });
    }

    if (clients.has(name)) {
        return res.status(409).json({ error: "Client with this name already exists" });
    }

    const client = { name, email, contact };
    clients.set(name, client);

    res.status(201).json({ message: "Client added successfully", client });
}

const documentCategories = [
  {
    category: "Company Registration & Compliance",
    documents: [
      "Certificate of Incorporation / Business Registration",
      "PAN Card / EIN",
      "GST / VAT Registration Certificate",
      "Shop & Establishment License",
      "Partnership Deed / LLP Agreement / Articles of Association",
      "Import Export Code"
    ]
  },
  {
    category: "Financial Statements",
    documents: [
      "Balance Sheet (last FY)",
      "Profit & Loss Statement (last FY)",
      "Trial Balance",
      "General Ledger"
    ]
  },
  {
    category: "Bank & Cash Records",
    documents: [
      "Bank Statements (all accounts, monthly)",
      "Cheque Book Scans",
      "Cash Register / Petty Cash Vouchers"
    ]
  },
  {
    category: "Sales & Revenue Docs",
    documents: [
      "Sales Invoices",
      "Credit Notes / Sales Returns",
      "POS Reports"
    ]
  },
  {
    category: "Purchase & Expense Docs",
    documents: [
      "Purchase Invoices / Bills",
      "Expense Receipts",
      "Vendor Contracts / Agreements"
    ]
  },
  {
    category: "Payroll & HR Records",
    documents: [
      "Employee List & Details",
      "Monthly Salary Sheets",
      "PF & ESI Payment Proofs",
      "TDS Payment Proofs"
    ]
  },
  {
    category: "Tax-Related Documents",
    documents: [
      "GST Returns (GSTR-1, GSTR-3B, GSTR-9)",
      "Income Tax Returns (last 3 years)",
      "TDS Returns",
      "Advance Tax Payment Challans"
    ]
  },
  {
    category: "Other Supporting Docs",
    documents: [
      "Loan Agreements & EMI Schedules",
      "Insurance Policies",
      "Fixed Asset Purchase Bills",
      "Depreciation Schedules"
    ]
  }
];


router.post("/addClient", addClient);

module.exports = router;

# 🏢 LeaseSync - Open-Source Lease Management System

LeaseSync is a **web-based lease management system** that helps businesses manage lease agreements and invoices with **automated document extraction** using AI.

🔹 **Upload lease agreements & invoices** (PDF).  
🔹 **Extract key contract details** automatically using AWS Bedrock AI.  
🔹 **Store lease information & documents** in a **structured database**.  
🔹 **Track due invoices** and **contract statuses** (Active, Due Soon, Overdue).  
🔹 **View all contract-related files & invoices** in a **single dashboard**.  

🚀 **Perfect for businesses managing multiple leases!**

Download white paper:
[Link](https://github.com/bravyto/LeaseSync/blob/7a47e884238f3d1d5f0a2262195693e1ce8d5b36/LeaseSync-white-paper.pdf)

---

## **Demo**
https://github.com/user-attachments/assets/974b6695-e9ca-4f54-8fdf-8d4309b59659

---

## **🛠️ Tech Stack**
### **Backend**
- **Python (FastAPI)** - High-performance API backend.
- **SQLAlchemy + SQLite** - Database management.
- **AWS Bedrock** - AI-powered document processing.
- **Tesseract OCR** - Extracts text from scanned PDFs.
- **S3 Storage** - Stores uploaded files securely.

### **Frontend**
- **Next.js (React.js)** - Modern UI with server-side rendering.
- **Tailwind CSS** - Fast & responsive styling.
- **Headless UI** - Accessible and flexible UI components.

---

## **🚀 Features**
### 📂 **Lease & Invoice Processing**
- Upload **PDF lease agreements & invoices**.
- AI **automatically extracts** key contract details.
- Saves contract details & files **securely in the database**.

### 📊 **Dashboard & Tracking**
- View **all active leases** in a clean table.
- Get **due date alerts** (Due Soon, Overdue).
- View **all contract-related documents** in one place.

### 📜 **Automated Document Extraction**
- AI identifies **location names, lease terms, payment details**.
- OCR support for **image-based PDFs**.
- Ensures **data accuracy & reduces manual entry**.

---

## **📦 Installation & Setup**
### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/bravyto/LeaseSync.git
cd LeaseSync
```

### **2️⃣ Backend Setup (FastAPI)**
#### **📌 Create a Virtual Environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### **📌 Install Dependencies**
```bash
pip install -r backend/requirements.txt
```

#### **📌 Set Up Environment Variables (`.env`)**
Create a `.env` file in the `backend/` folder:
```env
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_S3_REGION=your-s3-region
AWS_S3_BUCKET=your-s3-bucket-name
AWS_BEDROCK_REGION=your-bedrock-region
AWS_BEDROCK_MODEL_ID=your-bedrock-model-id
DATABASE_URL=sqlite:///./leases.db
```

#### **📌 Run the Backend**
```bash
uvicorn backend.main:app --reload
```
The API will be available at: **`http://localhost:8000`**.

---

### **3️⃣ Frontend Setup (Next.js)**
#### **📌 Install Dependencies**
```bash
cd frontend
npm install
```

#### **📌 Run the Frontend**
```bash
npm run dev
```
The UI will be available at: **`http://localhost:3000`**.

---

## **📣 Contributing**
We ❤️ contributions!  
To contribute:  
1️⃣ **Fork the repo** & create a new branch.  
2️⃣ Make your changes.  
3️⃣ **Submit a Pull Request** 🚀.  

---

## **🔗 Links & Resources**
📜 **Project Repository:** [GitHub](https://github.com/bravyto/LeaseSync)  
🐍 **FastAPI Docs:** [FastAPI](https://fastapi.tiangolo.com/)  
📘 **React Docs:** [React.js](https://reactjs.org/)  
🖼️ **Tailwind CSS Docs:** [Tailwind CSS](https://tailwindcss.com/)  

---

### **✨ Built with ❤️ by Open-Source Developers**  
🚀 **Enjoy managing your leases efficiently!**

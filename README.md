# Nova - Enterprise Voice AI Agent 🚀

Nova is a highly advanced, enterprise-grade Voice AI Agent designed to revolutionize how businesses interact with their data. By combining natural language processing, dynamic chart visualization, and a voice-activated interface, Nova allows executives, analysts, and managers to query their company databases through conversation rather than complex SQL scripts.

## 🌟 What We Are Building & Why

**The Problem:** Traditional Business Intelligence (BI) tools are powerful but steep in their learning curve. When a manager needs a quick insight (e.g., "What were our top 3 sales regions last month?"), they usually have to wait for an analyst to build a dashboard or write a SQL query.

**The Solution:** Nova acts as your personal AI data analyst. You simply say "Hey Nova, show me the revenue trends for this year," and Nova will:
1. Understand your natural language query.
2. Securely translate it into an optimized SQL query against your enterprise database.
3. Fetch the raw data and instantly generate dynamic charts (Bar, Line, Pie) in the UI.
4. Speak the key takeaways back to you using text-to-speech.

Our goal is to make digital transformation frictionless by offering an adaptive, efficient, and visually stunning AI chatbot tailored for enterprise data.

## 🛠 Tech Stack

Nova is built using a modern, scalable, and highly responsive technology stack:

### Frontend (Client-side)
* **React.js:** For building a fast, component-based user interface.
* **Vanilla CSS:** Custom Glassmorphism design, vibrant dynamic color palettes, and advanced CSS animations (like the Siri-style conic gradient orb).
* **Web Speech API:** Utilizes native browser `SpeechRecognition` for the "Hey Nova" wake word, and `SpeechSynthesis` for verbal responses.
* **Chart.js / React-Chartjs-2:** For rendering dynamic, interactive data visualizations.

### Backend (Server-side)
* **FastAPI (Python):** A high-performance, asynchronous web framework serving the API endpoints.
* **SQLite:** A lightweight SQL database for storing enterprise seed data (Sales, Employees, Customers) as well as user credentials and saved queries.
* **Groq API:** Provides ultra-fast LLM inference to translate natural language into SQL and synthesize conversational insights.

---

## 🚀 How to Run the Project Locally

Follow these steps to get Nova running on your local machine.

### Prerequisites
* **Python 3.8+** installed.
* **Node.js & npm** installed.
* A valid **Groq API Key**.

### 1. Set Up the Backend
1. Navigate to the enterprise-agent directory:
   ```bash
   cd enterprise-agent
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the Python dependencies:
   ```bash
   pip install fastapi uvicorn pydantic python-dotenv sqlite3 groq
   # Note: Install any other dependencies listed in your backend setup.
   ```
4. Configure Environment Variables:
   Create a `.env` file in the `enterprise-agent` directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
5. Initialize and Seed the Database:
   ```bash
   python backend/database.py
   ```
   *(This creates `enterprise.db` with sample data and a default admin user).*

6. Start the FastAPI Server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   *The backend is now running at `http://localhost:8000`.*

### 2. Set Up the Frontend
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd enterprise-agent/frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the React Development Server:
   ```bash
   npm start
   ```
   *The frontend is now running at `http://localhost:3000`.*

---

## 🔑 Essential Information & Usage

* **Demo Access:** When you open the application, you will be greeted by the Nova landing/login page. You can log in using the seeded enterprise admin credentials:
  * **Username:** `admin`
  * **Password:** `admin123`
* **Voice Activation:** Click the microphone button and say exactly **"Hey Nova"**, followed by your question (e.g., *"Hey Nova, show me a pie chart of the top performing employees"*).
* **Saved Queries:** If you find a report particularly useful, you can click the "Save" icon on the query card. This writes the query to the SQLite database, ensuring it remains available in your sidebar even after a browser reload.

Enjoy querying your enterprise data with Nova! 🌌

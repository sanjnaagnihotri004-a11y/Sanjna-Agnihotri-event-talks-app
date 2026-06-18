# 🚀 BigQuery Release Pulse

A premium, modern web dashboard for tracking and sharing Google Cloud BigQuery release notes. This project was developed as part of the **Kaggle 5-Day Intensive Vibe Coding Course**.

---

## 📖 About the Project

**BigQuery Release Pulse** parses the official Google Cloud BigQuery release notes RSS feed, extracts individual updates, categorizes them, and renders them in an elegant, responsive dark-themed dashboard. 

### 🌟 Key Features
* **Granular Extraction**: Daily aggregated RSS releases are broken down into individual items (Features, Announcements, Deprecations, Changes) using `BeautifulSoup`.
* **5-Minute Performance Cache**: Features a robust caching system to limit API requests to Google Cloud, with quick-sync override options.
* **X (Twitter) Share Simulator**: Allows users to preview and tweet any update via Web Intent.
* **X-Compliant Character Calculator**: Correctly handles X's link-shortening rules by counting all links as exactly 23 characters to guarantee valid draft sizes.
* **Hashtag Injection & Copy Tool**: Provides one-click buttons to inject tags like `#BigQuery` and copy text directly.
* **Digest Compiler**: Select multiple updates to compile a single digest tweet.

---

## 🎓 What I Learned About Antigravity CLI

During the Kaggle 5-Day Intensive Vibe Coding Course, I built this project using **Antigravity CLI**—Google DeepMind's agentic AI coding companion. 

Here are the core concepts and workflows mastered:

1. **Vibe Coding & Flow State**: Writing high-level requirements and letting the agent handle boilerplate creation, complex DOM selection logic, and styling.
2. **Context-Aware Pair Programming**: The CLI reads and maps workspace files, imports, and variables automatically to prevent breaking edits.
3. **Background Task Delegation**: Managed long-running tasks asynchronously, such as downloading pip packages, compiling files, and starting Flask development servers in the background.
4. **Fidelity via Artifacts**: Utilized persistent markdown docs (`release_pulse_documentation.md`) inside the local environment to manage system design without cluttering the chat history.
5. **CLI Git Integration**: Used Git commands to stage files, create main branches, handle remote migrations, and push to GitHub (`sanjnaagnihotri004-a11y/Sanjna-Agnihotri-event-talks-app`) directly via secure local shells.

---

## 🚀 How to Run Locally

### 1. Requirements
Ensure Python 3.10+ is installed on your system.

### 2. Startup
Clone the repository, navigate into the directory, and start the app:
```bash
# Initialize and install dependencies
python -m venv venv
venv\Scripts\activate      # On Windows (or source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt

# Run the Flask server
python app.py
```

### 3. Open Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

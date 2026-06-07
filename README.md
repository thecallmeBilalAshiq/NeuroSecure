<div align="center">

# 🧠 NeuroSecure

### AI-Powered Real-Time Privacy Protection for Browsers

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=26&duration=2800&pause=800&color=00D9FF&center=true&vCenter=true&width=900&lines=Protecting+Your+Screen+with+On-Device+AI;Detect+Unauthorized+Faces+in+Real+Time;Blur+or+Lock+Sensitive+Browser+Content;Privacy+First.+Smart.+Fast.+Secure." alt="Typing Animation" />

<br/>

<a href="https://incomparable-wisp-91385a.netlify.app/">
  <img src="https://img.shields.io/badge/Live%20Demo-Visit%20Now-00D9FF?style=for-the-badge&logo=netlify&logoColor=white" />
</a>
<img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" />
<img src="https://img.shields.io/badge/AI-On%20Device-FF6B6B?style=for-the-badge&logo=tensorflow&logoColor=white" />
<img src="https://img.shields.io/badge/Privacy-First-00C853?style=for-the-badge&logo=shield&logoColor=white" />

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00D9FF,50:7B2FF7,100:FF4B8B&height=120&section=header&text=NeuroSecure&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=35" />

</div>

---

## 🚀 About NeuroSecure

**NeuroSecure** is an intelligent Google Chrome browser extension built to protect users from unwanted screen viewing and shoulder surfing attacks. It uses **on-device artificial intelligence** to observe the webcam feed locally, recognize unauthorized faces around the user, and immediately secure the browser by **blurring or locking sensitive content**.

The goal is simple: **keep private information private, even in public or shared environments.**

---

## ✨ Core Idea

<div align="center">

```mermaid
flowchart LR
    A[📷 Webcam Feed] --> B[🧠 On-Device AI Detection]
    B --> C{Unauthorized Face Found?}
    C -- Yes --> D[🔒 Lock / Blur Browser Screen]
    C -- No --> E[✅ Continue Normal Browsing]
    D --> F[🛡️ Privacy Protected]
```

</div>

---

## 🌐 Live Demo

<div align="center">

### 🔗 Experience NeuroSecure Online

<a href="https://incomparable-wisp-91385a.netlify.app/">
  <img src="https://img.shields.io/badge/Open%20Live%20Demo-https://incomparable--wisp--91385a.netlify.app/-7B2FF7?style=for-the-badge&logo=netlify&logoColor=white" />
</a>

</div>

---

## 🔥 Key Features

<table>
<tr>
<td width="50%">

### 👁️ Real-Time Monitoring
Continuously observes the webcam feed to detect nearby faces while the user is browsing.

</td>
<td width="50%">

### 🧠 On-Device AI
Processes detection locally on the device, reducing dependency on external servers.

</td>
</tr>
<tr>
<td width="50%">

### 🚨 Unauthorized Face Detection
Identifies unexpected faces and reacts instantly to protect sensitive content.

</td>
<td width="50%">

### 🔒 Auto Lock / Blur
Automatically hides the browser screen when a privacy risk is detected.

</td>
</tr>
<tr>
<td width="50%">

### 🌍 Public-Space Protection
Useful in labs, offices, universities, cafes, libraries, and coworking spaces.

</td>
<td width="50%">

### ⚡ Fast Response
Designed for quick detection and immediate privacy action.

</td>
</tr>
</table>

---

## 🛡️ Why NeuroSecure?

In many real-life situations, users work with confidential data in open spaces. A person standing behind the user may unintentionally or intentionally view private information. NeuroSecure reduces this risk by acting like a **smart privacy shield** for the browser.

### Best For

- Students working in university labs  
- Professionals handling confidential documents  
- Developers managing private dashboards  
- Users browsing sensitive accounts in public places  
- Offices and coworking environments  

---

## 🧩 Technology Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=python,opencv,js,html,css,chrome,tensorflow,netlify,git,github" />

</div>

<br/>

| Category | Technologies |
|---|---|
| AI / Computer Vision | Python, OpenCV, YOLO, MediaPipe |
| Browser Extension | JavaScript, Chrome Extension APIs |
| Frontend | HTML, CSS, JavaScript |
| Deployment | Netlify |
| Version Control | Git, GitHub |

---

## ⚙️ How It Works

```mermaid
sequenceDiagram
    participant User
    participant Webcam
    participant AI as On-Device AI Engine
    participant Browser

    User->>Browser: Opens browser / sensitive page
    Browser->>Webcam: Starts webcam monitoring
    Webcam->>AI: Sends live frame locally
    AI->>AI: Detects faces and checks privacy risk
    alt Unauthorized face detected
        AI->>Browser: Trigger privacy mode
        Browser->>Browser: Blur or lock content
    else No risk detected
        AI->>Browser: Keep normal browsing active
    end
```

---

## 📸 Project Preview

<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/212750045-2d4c910b-bb99-4767-9ab2-33153077f8d0.gif" width="70%" alt="AI Animation" />

</div>

---

## 📁 Project Structure

```bash
NeuroSecure/
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── ai-model/
│   ├── face_detection.py
│   ├── privacy_engine.py
│   └── utils.py
│
├── assets/
│   ├── icons/
│   └── screenshots/
│
├── website/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md
```

---

## 🧪 Main Functional Flow

1. User enables NeuroSecure in Chrome.  
2. Webcam monitoring starts with user permission.  
3. AI model detects faces in the camera frame.  
4. If an unauthorized face appears, privacy mode activates.  
5. Browser content is instantly blurred or locked.  
6. Once the risk is gone, the browser returns to normal mode.  

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/NeuroSecure.git
cd NeuroSecure
```

### 2. Install Required Python Packages

```bash
pip install opencv-python mediapipe numpy
```

### 3. Load Chrome Extension

1. Open Google Chrome  
2. Go to `chrome://extensions/`  
3. Turn on **Developer Mode**  
4. Click **Load unpacked**  
5. Select the `extension` folder  

---

## 🎯 Future Improvements

- Face recognition for trusted users  
- Custom privacy sensitivity levels  
- Smart blur intensity control  
- Sound alert on privacy risk  
- Dashboard for privacy logs  
- Support for multiple browsers  
- Lightweight AI model optimization  

---

## 🏆 Highlights

<div align="center">

<img src="https://github-profile-trophy.vercel.app/?username=bashiq031&theme=radical&no-frame=true&no-bg=true&margin-w=8" />

</div>

---

## 👨‍💻 Developed By

<div align="center">

### Muhammad Bilal Ashiq

**Computer Science Student | AI/ML Enthusiast | Web & Python Developer**

<a href="https://github.com/bashiq031">
  <img src="https://img.shields.io/badge/GitHub-bashiq031-181717?style=for-the-badge&logo=github" />
</a>
<a href="https://incomparable-wisp-91385a.netlify.app/">
  <img src="https://img.shields.io/badge/Portfolio-Live%20Website-00D9FF?style=for-the-badge&logo=netlify&logoColor=white" />
</a>

</div>

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub and share it with others who care about digital privacy.

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&duration=2500&pause=700&color=FF4B8B&center=true&vCenter=true&width=800&lines=Privacy+is+not+optional.;Security+should+be+smart.;NeuroSecure+protects+what+matters." alt="Footer Typing" />

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:FF4B8B,50:7B2FF7,100:00D9FF&height=100&section=footer" />

</div>

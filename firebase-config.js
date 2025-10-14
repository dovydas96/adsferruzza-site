// Firebase client configuration (public by design)
// IMPORTANT: The Firebase Web API key (AIza...) is NOT a secret. It's an identifier for your project.
// Secure your app via Firestore/Storage security rules and by restricting this key to your domains.
// How to restrict the key:
//   Google Cloud Console → APIs & Services → Credentials → select this Web API key →
//   Application restrictions: HTTP referrers (web sites) → add:
//     - http://localhost:5500/*
//     - http://127.0.0.1:5500/*
//     - https://*.pages.dev/*
//     - https://YOURDOMAIN.com/* (and www if used)
//   API restrictions: usually leave unrestricted for Firebase SDKs to avoid breaking features.
window.FIREBASE_ENABLED = true;
window.firebaseConfig = {
  apiKey: "AIzaSyAXwuG5uHH3fV79Z8DBAQeQCUpapotHTfw",
  authDomain: "adsferruzza.firebaseapp.com",
  projectId: "adsferruzza",
  // Updated: Actual default bucket name observed via gsutil (modern naming).
  storageBucket: "adsferruzza.firebasestorage.app",
  messagingSenderId: "396792381085",
  appId: "1:396792381085:web:12925a87b8feb4ef775e74"
};

// Restrict admin access to this allowlisted email
window.ADMIN_EMAIL_ALLOWLIST = ["adpasticceriasferruzza@gmail.com"];
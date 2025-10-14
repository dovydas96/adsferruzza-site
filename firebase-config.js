// Firebase client configuration (provided)
// Note: Client apiKey is not a secret; it's safe in public web apps.
window.FIREBASE_ENABLED = true;
window.firebaseConfig = {
  apiKey: "AIzaSyAXwuG5uHH3fV79Z8DBAQeQCUpapotHTfw",
  authDomain: "adsferruzza.firebaseapp.com",
  projectId: "adsferruzza",
  // Note: this should be the bucket name (project-id.appspot.com), not the download domain.
  storageBucket: "adsferruzza.appspot.com",
  messagingSenderId: "396792381085",
  appId: "1:396792381085:web:12925a87b8feb4ef775e74"
};

// Restrict admin access to this allowlisted email
window.ADMIN_EMAIL_ALLOWLIST = ["adpasticceriasferruzza@gmail.com"];
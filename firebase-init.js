(function(){
  try {
    if (window.FIREBASE_ENABLED && window.firebase && (!firebase.apps || !firebase.apps.length)) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('[Firebase] Initialized');
    }
  } catch (e) {
    console.warn('[Firebase] Init skipped:', e && e.message);
  }
})();
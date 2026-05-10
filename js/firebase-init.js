/* ============================================
   FIREBASE PHONE AUTH INITIALIZATION
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCvoatYZ3zSX7UFXsKm1ExINo8U_TUkBP8",
  authDomain: "ronamar-c3df6.firebaseapp.com",
  projectId: "ronamar-c3df6",
  storageBucket: "ronamar-c3df6.firebasestorage.app",
  messagingSenderId: "965363042025",
  appId: "1:965363042025:web:5bd0e61002aa902d271278",
  measurementId: "G-LJW1GZVB5Y"
};

firebase.initializeApp(firebaseConfig);
firebase.auth().languageCode = 'he';
console.log('✅ Firebase initialized for Phone Auth');

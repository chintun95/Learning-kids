// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAL6_3ZXvrkozgRkWuptycRbcTk0-vJLDI",
  authDomain: "learning-kids-6ce5d.firebaseapp.com",
  projectId: "learning-kids-6ce5d",
  storageBucket: "learning-kids-6ce5d.firebasestorage.app",
  messagingSenderId: "904046589825",
  appId: "1:904046589825:web:591d20c1b55cdf515a5a80",
  measurementId: "G-C213E8RJQ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, auth };
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAobfHm8xLarF5hJzeDBVvyyLYUzNrD81w",
  authDomain: "munafa-book.firebaseapp.com",
  projectId: "munafa-book",
  storageBucket: "munafa-book.firebasestorage.app",
  messagingSenderId: "1066197357268",
  appId: "1:1066197357268:web:2ae1ca42e1fe7e841b2141"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

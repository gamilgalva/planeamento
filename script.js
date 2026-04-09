import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = { 
    apiKey: "AIzaSyAlvGJKZdMCNopDKoXMcUTuvHa5E9GqIHA", 
    authDomain: "planeamento-cf642.firebaseapp.com", 
    projectId: "planeamento-cf642", 
    storageBucket: "planeamento-cf642.firebasestorage.app", 
    messagingSenderId: "438224213205", 
    appId: "1:438224213205:web:2205b5a879ec384c62be5c" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colPedidos = collection(db, "pedidos_vfinal_gamil");

// LOGIN LOGIC
window.tentarLogin = () => {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const creds = { "Sofia": "gamil$$26", "Eduardo Pereira": "gamil$$26", "José Pedro": "gamil$$26" };
    
    if (user === "Visitante" || (creds[user] && pass === creds[user])) {
        localStorage.setItem('gamil_user', user);
        localStorage.setItem('gamil_admin', (user === "Eduardo Pereira" || user === "José Pedro"));
        checkPermissions();
    } else {
        alert("Senha Incorreta");
    }
};

const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    if (!user) { document.getElementById('modal-login').style.display = 'flex'; return; }
    document.getElementById('modal-login').style.display = 'none';
    document.getElementById('nome-logado').innerText = user;
    
    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    if (isAdmin) document.body.classList.add('admin-mode');
};

// INITIALIZE
window.onload = checkPermissions;
// Aqui continuariam as outras funções de carregar pedidos, salvar progresso, etc...

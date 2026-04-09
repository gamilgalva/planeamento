import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO FIREBASE (Hamilton, confira se estes dados batem com o seu Firebase)
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

// 2. FUNÇÕES DE LOGIN (FORÇADAS NO WINDOW)
window.tentarLogin = () => {
    console.log("Tentativa de login iniciada...");
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    
    const creds = { 
        "Sofia": "gamil$$26", 
        "Eduardo Pereira": "gamil$$26", 
        "José Pedro": "gamil$$26", 
        "José Castro": "jose1234", 
        "Luís Silva": "luis1234", 
        "Paulo Abreu": "paulo1234" 
    };

    if (user === "Visitante" || (creds[user] && pass === creds[user])) {
        localStorage.setItem('gamil_user', user);
        localStorage.setItem('gamil_admin', (user === "Eduardo Pereira" || user === "José Pedro" ? "true" : "false"));
        localStorage.setItem('gamil_sofia', (user === "Sofia" ? "true" : "false"));
        localStorage.setItem('gamil_encarregado', (user === "José Castro" || user === "Luís Silva" || user === "Paulo Abreu" ? "true" : "false"));
        
        console.log("Login aceite para:", user);
        window.location.reload();
    } else {
        alert("Senha incorreta para o usuário selecionado.");
    }
};

window.logout = () => {
    localStorage.clear();
    window.location.reload();
};

// 3. VERIFICAÇÃO DE PERMISSÕES AO CARREGAR
const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    const modalLogin = document.getElementById('modal-login');
    
    if (!user) {
        console.log("Nenhum usuário logado. Mostrando modal.");
        if (modalLogin) modalLogin.style.display = 'flex';
        return;
    }

    console.log("Usuário logado:", user);
    if (modalLogin) modalLogin.style.display = 'none';
    
    const nomeEl = document.getElementById('nome-logado');
    if (nomeEl) nomeEl.innerText = user;

    // Aplicar classes de permissão no BODY
    if (localStorage.getItem('gamil_admin') === 'true') document.body.classList.add('admin-mode');
    if (localStorage.getItem('gamil_sofia') === 'true') document.body.classList.add('sofia-mode');
    if (localStorage.getItem('gamil_encarregado') === 'true') document.body.classList.add('encarregado-mode');
};

// 4. FUNÇÕES DE INTERFACE (WINDOW)
window.fecharModal = () => {
    document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));
};

window.abrirModalPedido = () => {
    const form = document.getElementById('form-pedido');
    if(form) form.reset();
    document.getElementById('p-id').value = "";
    document.getElementById('modal-pedido').classList.remove('hidden');
};

// 5. ESCUTA DO FIREBASE (TEMPO REAL)
onSnapshot(colPedidos, (snap) => {
    const container = document.getElementById('container-pedidos');
    if (!container) return;
    
    container.innerHTML = "";
    let lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));

    lista.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "pedido-row";
        const perc = p.progresso || 0;
        const color = p.prio === 'alta' ? 'bg-red-500' : p.prio === 'media' ? 'bg-orange-400' : 'bg-green-500';

        tr.innerHTML = `
            <td class="pos-text">${p.ranking ? p.ranking + 'º' : '--'}</td>
            <td style="width: 15px"><div class="status-strip ${color}"></div></td>
            <td class="ref-text">#${p.pedido}</td>
            <td class="client-text">${p.cliente}</td>
            <td class="text-center other-row-text">${p.entrada || '--'}</td>
            <td class="text-center other-row-text">${p.peso || '0'}kg</td>
            <td class="text-center other-row-text">${p.pesar || 'NÃO'} | ${p.furos || 'NÃO'}</td>
            <td class="admin-view encarregado-view text-center font-black text-blue-900/80 other-row-text">${p.montagem || '--'}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-black text-orange-600 other-row-text">${p.saida || '--'}</td>
            <td>
                <div class="flex items-center space-x-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div class="h-full bg-blue-600" style="width: ${perc}%"></div>
                    </div>
                    <span class="text-[10px] font-black">${perc}%</span>
                </div>
            </td>
            <td class="admin-view italic uppercase truncate border-l pl-3 other-row-text">${p.obs_edu || ''}</td>
            <td class="text-right pr-6 no-print">
                <button class="text-orange-400"><i class="fas fa-pencil-alt"></i></button>
            </td>
        `;
        container.appendChild(tr);
    });
}, (error) => {
    console.error("Erro no Firebase:", error);
});

// Executar verificação ao carregar o script
checkPermissions();

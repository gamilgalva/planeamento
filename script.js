import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE
const firebaseConfig = { 
    apiKey: "AIzaSyAlvGJKZdMCNopDKoXMcUTuvHa5E9GqIHA", 
    authDomain: "planeamento-cf642.firebaseapp.com", 
    projectId: "planeamento-cf642", 
    storageBucket: "planeamento-cf642.firebasestorage.app", 
    messagingSenderId: "438224213205", 
    appId: "1:438224213205:web:2205b5a879ec384c62be5c" 
};

// Inicialização com tratamento de erro
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase conectado com sucesso!");
} catch (error) {
    alert("Erro ao ligar ao Firebase: " + error.message);
}

const colPedidos = collection(db, "pedidos_vfinal_gamil");

// FORMATAR DATA
const formatarDataBR = (str) => { 
    if (!str || str === '--') return '--'; 
    const pts = str.split('-'); 
    return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : str; 
};

// LOGIN (ANEXADO AO WINDOW PARA O HTML ENCONTRAR)
window.tentarLogin = () => {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const creds = { "Sofia": "gamil$$26", "Eduardo Pereira": "gamil$$26", "José Pedro": "gamil$$26", "José Castro": "jose1234", "Luís Silva": "luis1234", "Paulo Abreu": "paulo1234" };

    if (user === "Visitante" || (creds[user] && pass === creds[user])) {
        localStorage.setItem('gamil_user', user);
        localStorage.setItem('gamil_admin', (user === "Eduardo Pereira" || user === "José Pedro"));
        localStorage.setItem('gamil_sofia', (user === "Sofia"));
        localStorage.setItem('gamil_encarregado', (user === "José Castro" || user === "Luís Silva" || user === "Paulo Abreu"));
        window.location.reload();
    } else {
        alert("Senha incorreta.");
    }
};

window.logout = () => {
    localStorage.clear();
    window.location.reload();
};

// PERMISSÕES
const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    const modalLogin = document.getElementById('modal-login');
    
    if (!user) {
        if (modalLogin) modalLogin.style.display = 'flex';
        return;
    }
    if (modalLogin) modalLogin.style.display = 'none';
    document.getElementById('nome-logado').innerText = user;

    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    const isSofia = localStorage.getItem('gamil_sofia') === 'true';
    const isEnc = localStorage.getItem('gamil_encarregado') === 'true';

    document.body.classList.remove('admin-mode', 'sofia-mode', 'encarregado-mode');
    if (isAdmin) document.body.classList.add('admin-mode');
    if (isSofia) document.body.classList.add('sofia-mode');
    if (isEnc) document.body.classList.add('encarregado-mode');
};

// SNAPSHOT (O QUE TRAZ OS DADOS)
onSnapshot(colPedidos, (snap) => {
    const container = document.getElementById('container-pedidos');
    if (!container) return;
    
    container.innerHTML = "";
    let lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));

    // Ordenação igual à matriz
    lista.sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999));

    if (lista.length === 0) {
        container.innerHTML = "<tr><td colspan='12' class='p-10 text-center font-bold text-slate-400'>Nenhum pedido encontrado no Firebase.</td></tr>";
    }

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
            <td class="text-center other-row-text">${formatarDataBR(p.entrada)}</td>
            <td class="text-center other-row-text">${p.peso}kg</td>
            <td class="text-center other-row-text">
                <span class="${p.pesar === 'SIM' ? 'text-orange-500 font-black' : 'text-slate-300'}">PES</span> | 
                <span class="${p.furos === 'SIM' ? 'text-orange-500 font-black' : 'text-slate-300'}">FUR</span>
            </td>
            <td class="admin-view encarregado-view text-center font-black text-blue-900/80 other-row-text">${formatarDataBR(p.montagem)}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-black text-orange-600 other-row-text">${formatarDataBR(p.saida)}</td>
            <td>
                <div class="flex items-center space-x-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div class="h-full bg-blue-600" style="width: ${perc}%"></div>
                    </div>
                    <span class="text-[10px] font-black">${perc}%</span>
                </div>
            </td>
            <td class="admin-view italic uppercase truncate border-l border-slate-100 pl-3 other-row-text">${p.obs_edu || ''}</td>
            <td class="text-right pr-6 no-print">
                <button onclick="preparaEdicao('${p.id}', '${encodeURIComponent(JSON.stringify(p))}')" class="text-orange-400"><i class="fas fa-pencil-alt"></i></button>
            </td>
        `;
        container.appendChild(tr);
    });
}, (error) => {
    console.error("Erro no Snapshot:", error);
    alert("Erro ao carregar dados em tempo real.");
});

// FUNÇÕES DE UI (PRECISAM ESTAR NO WINDOW)
window.fecharModal = () => document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));

window.abrirModalPedido = () => {
    document.getElementById('p-id').value = "";
    document.getElementById('form-pedido').reset();
    document.getElementById('modal-pedido').classList.remove('hidden');
};

// Inicialização
checkPermissions();

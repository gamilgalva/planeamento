import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const colClientesFirebase = collection(db, "clientes_gamil");

const formatarDataBR = (str) => { 
    if (!str || str === '--' || str === '') return '--'; 
    const pts = str.split('-'); 
    return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : str; 
};

// LOGIN E PERMISSÕES
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
    } else { alert("Senha incorreta."); }
};

window.logout = () => { localStorage.clear(); window.location.reload(); };

const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    if (!user) { document.getElementById('modal-login').style.display = 'flex'; return; }
    document.getElementById('modal-login').style.display = 'none';
    document.getElementById('nome-logado').innerText = user;

    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    const isSofia = localStorage.getItem('gamil_sofia') === 'true';
    const isEnc = localStorage.getItem('gamil_encarregado') === 'true';

    document.body.classList.remove('admin-mode', 'sofia-mode', 'encarregado-mode', 'can-edit');
    if (isAdmin) document.body.classList.add('admin-mode', 'can-edit');
    if (isSofia) document.body.classList.add('sofia-mode');
    if (isEnc) document.body.classList.add('encarregado-mode');
};

// CARREGAR DADOS
onSnapshot(colPedidos, (snap) => {
    const container = document.getElementById('container-pedidos');
    if (!container) return;
    container.innerHTML = "";
    let lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    
    lista.sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999));

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "pedido-row";
        tr.innerHTML = `
            <td class="pos-text" onclick="editPosInline('${p.id}', this)">${p.ranking || '--'}</td>
            <td><div class="status-strip ${p.prio === 'alta' ? 'bg-red-500' : 'bg-green-500'}"></div></td>
            <td class="ref-text">#${p.pedido}</td>
            <td class="client-text">${p.cliente}</td>
            <td class="text-center">${formatarDataBR(p.entrada)}</td>
            <td class="text-center">${p.weight || p.peso}kg</td>
            <td class="text-center">${p.pesar || 'NÃO'} | ${p.furos || 'NÃO'}</td>
            <td class="admin-view encarregado-view text-center font-bold text-blue-800">${formatarDataBR(p.montagem)}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-bold text-orange-600">${formatarDataBR(p.saida)}</td>
            <td onclick="abrirProgresso('${p.id}', '${p.cliente}', ${p.progresso || 0})">
                <div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-blue-600 h-2 rounded-full" style="width: ${p.progresso || 0}%"></div></div>
            </td>
            <td class="admin-view italic text-[9px]">${p.obs_edu || ''}</td>
            <td class="text-right pr-4"><button onclick="preparaEdicao('${p.id}', '${encodeURIComponent(JSON.stringify(p))}')" class="text-orange-400"><i class="fas fa-pencil-alt"></i></button></td>
        `;
        container.appendChild(tr);
    });
});

// FUNÇÕES DE MODAL E EDIÇÃO
window.fecharModal = () => document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));

window.abrirModalPedido = () => { 
    document.getElementById('p-id').value = ""; 
    document.getElementById('form-pedido').reset(); 
    document.getElementById('modal-pedido').classList.remove('hidden'); 
};

window.abrirProgresso = (id, nome, perc) => {
    document.getElementById('prog-id').value = id;
    document.getElementById('prog-nome').innerText = nome;
    document.getElementById('prog-range').value = perc;
    document.getElementById('prog-perc-val').innerText = perc;
    document.getElementById('modal-progresso').classList.remove('hidden');
};

window.salvarProgresso = async () => {
    const id = document.getElementById('prog-id').value;
    const perc = parseInt(document.getElementById('prog-range').value);
    const log = `${localStorage.getItem('gamil_user')}: ${perc}% [${new Date().toLocaleString()}]`;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { progresso: perc, historico: arrayUnion(log) });
    fecharModal();
};

window.onload = checkPermissions;

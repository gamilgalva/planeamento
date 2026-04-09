import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO FIREBASE
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

// 2. UTILITÁRIOS
const formatarDataBR = (str) => { 
    if (!str || str === '--' || str === '') return '--'; 
    const pts = str.split('-'); 
    return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : str; 
};

// 3. SISTEMA DE LOGIN E PERMISSÕES
window.tentarLogin = () => {
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
        localStorage.setItem('gamil_admin', (user === "Eduardo Pereira" || user === "José Pedro"));
        localStorage.setItem('gamil_sofia', (user === "Sofia"));
        localStorage.setItem('gamil_encarregado', (user === "José Castro" || user === "Luís Silva" || user === "Paulo Abreu"));
        checkPermissions();
        window.location.reload(); // Refresh para aplicar classes no body
    } else {
        alert("Senha incorreta.");
    }
};

const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    if (!user) {
        document.getElementById('modal-login').style.display = 'flex';
        return;
    }
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

window.logout = () => {
    localStorage.clear();
    window.location.reload();
};

// 4. RENDERIZAÇÃO EM TEMPO REAL (REALTIME)
onSnapshot(colPedidos, (snap) => {
    const container = document.getElementById('container-pedidos');
    if (!container) return;
    container.innerHTML = "";

    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    const isSofia = localStorage.getItem('gamil_sofia') === 'true';

    let lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));

    // Ordenação: Ranking -> Urgência -> Data Montagem
    const pesoPrio = { 'alta': 1, 'media': 2, 'baixa': 3 };
    lista.sort((a, b) => {
        const rA = a.ranking || 999999;
        const rB = b.ranking || 999999;
        if (rA !== rB) return rA - rB;
        if (pesoPrio[a.prio] !== pesoPrio[b.prio]) return pesoPrio[a.prio] - pesoPrio[b.prio];
        return (a.montagem || '9999-99-99').localeCompare(b.montagem || '9999-99-99');
    });

    lista.forEach(p => {
        const perc = p.progresso || 0;
        const lastLog = p.historico && p.historico.length > 0 ? p.historico[p.historico.length-1] : 'Sem reporte';
        const color = p.prio === 'alta' ? 'bg-red-500' : p.prio === 'media' ? 'bg-orange-400' : 'bg-green-500';
        
        const tr = document.createElement('tr');
        tr.className = "pedido-row";
        tr.innerHTML = `
            <td class="pos-text ${isAdmin ? 'editable-cell' : ''}" onclick="editPosInline('${p.id}', this)">${p.ranking ? p.ranking + 'º' : '--'}</td>
            <td><div class="status-strip ${color}"></div></td>
            <td class="ref-text">#${p.pedido}</td>
            <td class="client-text">${p.cliente}</td>
            <td class="text-center italic text-slate-400">${formatarDataBR(p.entrada)}</td>
            <td class="text-center font-bold">${p.peso}kg</td>
            <td class="text-center">
                <span onclick="toggleServico('${p.id}', 'pesar', '${p.pesar}')" class="${isAdmin ? 'editable-cell' : ''} ${p.pesar === 'SIM' ? 'text-orange-500' : 'text-slate-300'}">PES</span> | 
                <span onclick="toggleServico('${p.id}', 'furos', '${p.furos}')" class="${isAdmin ? 'editable-cell' : ''} ${p.furos === 'SIM' ? 'text-orange-500' : 'text-slate-300'}">FUR</span>
            </td>
            <td class="admin-view encarregado-view text-center font-black text-blue-900/80 ${isAdmin ? 'editable-cell' : ''}" data-raw="${p.montagem || ''}" onclick="editDataInline('${p.id}', 'montagem', this)">${formatarDataBR(p.montagem)}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-black text-orange-600 ${isAdmin ? 'editable-cell' : ''}" data-raw="${p.saida || ''}" onclick="editDataInline('${p.id}', 'saida', this)">${formatarDataBR(p.saida)}</td>
            <td class="cursor-pointer" onclick="abrirProgresso('${p.id}', '${p.cliente}', ${perc})">
                <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 transition-all" style="width: ${perc}%"></div></div>
                    <span class="text-[9px] font-black">${perc}%</span>
                </div>
                <div class="text-[7px] italic text-slate-400 truncate mt-1">● ${lastLog}</div>
            </td>
            <td class="admin-view italic truncate pl-3">${p.obs_edu || ''}</td>
            <td class="text-right pr-6 no-print">
                <button onclick="preparaEdicao('${p.id}', '${encodeURIComponent(JSON.stringify(p))}')" class="text-orange-400 hover:scale-110 transition">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </td>
        `;
        container.appendChild(tr);
    });
});

// 5. FUNÇÕES DE EDIÇÃO INLINE E MODAIS
window.editPosInline = (id, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const val = el.innerText === '--' ? '' : el.innerText.replace('º', '');
    el.innerHTML = `<div class="inline-edit-container"><input type="number" class="w-12 p-1 text-black" value="${val}"><button onclick="confirmarPosInline('${id}', this)" class="ml-1 text-green-600"><i class="fas fa-check"></i></button></div>`;
};

window.confirmarPosInline = async (id, btn) => {
    const val = btn.parentElement.querySelector('input').value;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { ranking: val ? parseInt(val) : '' });
};

window.editDataInline = (id, campo, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const raw = el.getAttribute('data-raw') || '';
    el.innerHTML = `<div class="inline-edit-container"><input type="date" class="p-1 text-xs text-black" value="${raw}"><button onclick="confirmarDataInline('${id}', '${campo}', this)" class="ml-1 text-green-600"><i class="fas fa-check"></i></button></div>`;
};

window.confirmarDataInline = async (id, campo, btn) => {
    const val = btn.parentElement.querySelector('input').value;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { [campo]: val });
};

window.toggleServico = async (id, campo, val) => {
    if (localStorage.getItem('gamil_admin') !== 'true') return;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { [campo]: val === 'SIM' ? 'NÃO' : 'SIM' });
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
    const obs = document.getElementById('prog-obs').value.toUpperCase();
    const log = `${localStorage.getItem('gamil_user')}: ${perc}% ${obs ? '-> '+obs : ''} [${new Date().toLocaleString('pt-PT')}]`;
    
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { 
        progresso: perc, 
        historico: arrayUnion(log) 
    });
    fecharModal();
};

window.fecharModal = () => {
    document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));
};

// 6. INICIALIZAÇÃO
window.onload = () => {
    checkPermissions();
};

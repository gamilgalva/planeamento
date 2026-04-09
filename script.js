import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { CLIENTES_ESTATICOS } from "./clientes_base.js";

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

const formatarDataBR = (str) => { if (!str || str === '--') return '--'; const pts = str.split('-'); return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : str; };

// --- FUNÇÕES DE INTERFACE (WINDOW) ---

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
    } else alert("Senha incorreta.");
};

window.logout = () => { localStorage.clear(); window.location.reload(); };

// --- FUNÇÃO DE CLIENTES (CORRIGIDA) ---
function carregarClientes() {
    const select = document.getElementById('p-cliente');
    const listaDB = document.getElementById('lista-clientes-db');
    
    // Usa o arquivo clientes_base.js importado no topo
    const lista = CLIENTES_ESTATICOS || [];
    lista.sort((a, b) => a.nome.localeCompare(b.nome));

    if (select) {
        select.innerHTML = '<option value="">-- SELECIONAR CLIENTE --</option>' + 
            lista.map(c => `<option value="${c.codigo} | ${c.nome}">${c.codigo} | ${c.nome}</option>`).join('');
    }
    if (listaDB) {
        listaDB.innerHTML = lista.map(c => `<div class="p-2 border-b uppercase text-[10px] font-bold text-slate-500">● ${c.codigo} | ${c.nome}</div>`).join('');
    }
}

// --- FUNÇÕES DE EDIÇÃO (EDUARDO / JOSÉ PEDRO) ---

window.editPosInline = (id, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const val = el.innerText.replace('º', '');
    el.innerHTML = `<input type="number" class="w-12 p-1 text-black border-2 border-blue-500 rounded" value="${val}" onblur="confirmarPosInline('${id}', this.value)">`;
    el.querySelector('input').focus();
};

window.confirmarPosInline = async (id, val) => {
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { ranking: val ? parseInt(val) : '' });
};

window.editDataInline = (id, campo, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const raw = el.getAttribute('data-raw') || '';
    el.innerHTML = `<input type="date" class="p-1 text-[10px] text-black border-2 border-blue-500 rounded" value="${raw}" onblur="confirmarDataInline('${id}', '${campo}', this.value)">`;
};

window.confirmarDataInline = async (id, campo, val) => {
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { [campo]: val });
};

window.apagarPedido = async (id) => { if(confirm("Deseja apagar este pedido?")) await deleteDoc(doc(db, "pedidos_vfinal_gamil", id)); };

window.abrirProgresso = (id, n, p) => {
    document.getElementById('prog-id').value = id;
    document.getElementById('prog-nome').innerText = n;
    document.getElementById('prog-range').value = p;
    document.getElementById('prog-perc-val').innerText = p;
    document.getElementById('modal-progresso').classList.remove('hidden');
};

window.salvarProgresso = async () => {
    const id = document.getElementById('prog-id').value;
    const perc = parseInt(document.getElementById('prog-range').value);
    const obs = document.getElementById('prog-obs').value.toUpperCase();
    const log = `${localStorage.getItem('gamil_user')}: ${perc}% ${obs ? '-> '+obs : ''} [${new Date().toLocaleString()}]`;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { progresso: perc, historico: arrayUnion(log) });
    window.fecharModal();
};

window.preparaEdicao = (id, dataRaw) => {
    const p = JSON.parse(decodeURIComponent(dataRaw));
    document.getElementById('p-id').value = id;
    document.getElementById('p-cliente').value = p.cliente;
    document.getElementById('p-pedido').value = p.pedido;
    document.getElementById('p-prio').value = p.prio;
    document.getElementById('p-pos').value = p.ranking || '';
    document.getElementById('p-peso').value = p.peso;
    document.getElementById('p-entrada').value = p.entrada;
    document.getElementById('p-pesar').value = p.pesar;
    document.getElementById('p-furos').value = p.furos;
    document.getElementById('p-montagem').value = p.montagem;
    document.getElementById('p-saida').value = p.saida;
    document.getElementById('p-obs-edu').value = p.obs_edu || '';
    document.getElementById('modal-pedido').classList.remove('hidden');
};

// --- RENDERIZAÇÃO ---

onSnapshot(colPedidos, snap => {
    const container = document.getElementById('container-pedidos');
    container.innerHTML = "";
    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    
    let lista = []; snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    lista.sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999));

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "pedido-row";
        const perc = p.progresso || 0;
        const color = p.prio === 'alta' ? 'bg-red-500' : p.prio === 'media' ? 'bg-orange-400' : 'bg-green-500';

        tr.innerHTML = `
            <td class="pos-text ${isAdmin ? 'cursor-pointer hover:bg-blue-50' : ''}" onclick="editPosInline('${p.id}', this)">${p.ranking ? p.ranking + 'º' : '--'}</td>
            <td><div class="status-strip ${color}"></div></td>
            <td class="ref-text">#${p.pedido}</td>
            <td class="client-text">${p.cliente}</td>
            <td class="text-center other-row-text">${formatarDataBR(p.entrada)}</td>
            <td class="text-center other-row-text">${p.peso}kg</td>
            <td class="text-center other-row-text">${p.pesar || 'NÃO'} | ${p.furos || 'NÃO'}</td>
            <td class="admin-view encarregado-view text-center font-black text-blue-900/80 other-row-text ${isAdmin ? 'cursor-pointer hover:bg-blue-50' : ''}" data-raw="${p.montagem || ''}" onclick="editDataInline('${p.id}', 'montagem', this)">${formatarDataBR(p.montagem)}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-black text-orange-600 other-row-text ${isAdmin ? 'cursor-pointer hover:bg-blue-50' : ''}" data-raw="${p.saida || ''}" onclick="editDataInline('${p.id}', 'saida', this)">${formatarDataBR(p.saida)}</td>
            <td onclick="abrirProgresso('${p.id}', '${p.cliente}', ${perc})">
                <div class="flex items-center space-x-2 cursor-pointer"><div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600" style="width: ${perc}%"></div></div><span class="text-[10px] font-black">${perc}%</span></div>
            </td>
            <td class="admin-view italic uppercase truncate border-l pl-3 other-row-text">${p.obs_edu || ''}</td>
            <td class="text-right pr-6 no-print">
                <div class="flex justify-end gap-3">
                    <button onclick="preparaEdicao('${p.id}', '${encodeURIComponent(JSON.stringify(p))}')" class="text-orange-400"><i class="fas fa-pencil-alt"></i></button>
                    ${isAdmin ? `<button onclick="apagarPedido('${p.id}')" class="text-red-300 hover:text-red-600"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </td>`;
        container.appendChild(tr);
    });
});

// Modais Genéricos
window.fecharModal = () => document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));
window.abrirModalPedido = () => { document.getElementById('p-id').value = ""; document.getElementById('form-pedido').reset(); document.getElementById('modal-pedido').classList.remove('hidden'); };
window.abrirModalCliente = () => document.getElementById('modal-cliente').classList.remove('hidden');

// Inicialização
const user = localStorage.getItem('gamil_user');
if (user) {
    document.getElementById('modal-login').style.display = 'none';
    document.getElementById('nome-logado').innerText = user;
    if (localStorage.getItem('gamil_admin') === 'true') document.body.classList.add('admin-mode');
    if (localStorage.getItem('gamil_sofia') === 'true') document.body.classList.add('sofia-mode');
    if (localStorage.getItem('gamil_encarregado') === 'true') document.body.classList.add('encarregado-mode');
    carregarClientes(); // ATIVA A LISTA
}

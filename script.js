import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { CLIENTES_ESTATICOS } from "./clientes_base.js";

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

const formatarDataBR = (str) => { if (!str || str === '--') return '--'; const pts = str.split('-'); return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : str; };

// 2. SISTEMA DE LOGIN E PERMISSÕES
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

const checkPermissions = () => {
    const user = localStorage.getItem('gamil_user');
    if (!user) { document.getElementById('modal-login').style.display = 'flex'; return; }
    document.getElementById('modal-login').style.display = 'none';
    document.getElementById('nome-logado').innerText = user;
    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    if (isAdmin) document.body.classList.add('admin-mode', 'can-edit');
};

// 3. EDIÇÃO INLINE (MÃO LIVRE PARA O EDUARDO)
window.editPosInline = (id, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const val = el.innerText === '--' ? '' : el.innerText.replace('º', '');
    el.innerHTML = `<div class="inline-edit-container"><input type="number" class="w-12 p-1 text-black border-2 border-blue-500 rounded" value="${val}"><button onclick="confirmarPosInline('${id}', this)" class="ml-1 text-green-600 font-bold">OK</button></div>`;
    el.querySelector('input').focus();
};

window.confirmarPosInline = async (id, btn) => {
    const val = btn.parentElement.querySelector('input').value;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { ranking: val ? parseInt(val) : '' });
};

window.editDataInline = (id, campo, el) => {
    if (localStorage.getItem('gamil_admin') !== 'true' || el.querySelector('input')) return;
    const raw = el.getAttribute('data-raw') || '';
    el.innerHTML = `<div class="inline-edit-container"><input type="date" class="p-1 text-[10px] text-black border-2 border-blue-500 rounded" value="${raw}"><button onclick="confirmarDataInline('${id}', '${campo}', this)" class="ml-1 text-green-600">OK</button></div>`;
};

window.confirmarDataInline = async (id, campo, btn) => {
    const val = btn.parentElement.querySelector('input').value;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { [campo]: val });
};

// 4. RENDERIZAÇÃO DA TABELA
onSnapshot(colPedidos, snap => {
    const container = document.getElementById('container-pedidos');
    container.innerHTML = "";
    const isAdmin = localStorage.getItem('gamil_admin') === 'true';
    const isSofia = localStorage.getItem('gamil_sofia') === 'true';
    
    let lista = []; snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    lista.sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999));

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "pedido-row";
        const perc = p.progresso || 0;
        const color = p.prio === 'alta' ? 'bg-red-500' : p.prio === 'media' ? 'bg-orange-400' : 'bg-green-500';

        tr.innerHTML = `
            <td class="pos-text ${isAdmin ? 'editable-cell' : ''}" onclick="editPosInline('${p.id}', this)">${p.ranking ? p.ranking + 'º' : '--'}</td>
            <td><div class="status-strip ${color}"></div></td>
            <td class="ref-text">#${p.pedido}</td>
            <td class="client-text">${p.cliente}</td>
            <td class="text-center other-row-text">${formatarDataBR(p.entrada)}</td>
            <td class="text-center other-row-text">${p.peso}kg</td>
            <td class="text-center other-row-text">${p.pesar || 'NÃO'} | ${p.furos || 'NÃO'}</td>
            <td class="admin-view encarregado-view text-center font-black text-blue-900/80 other-row-text ${isAdmin ? 'editable-cell' : ''}" data-raw="${p.montagem || ''}" onclick="editDataInline('${p.id}', 'montagem', this)">${formatarDataBR(p.montagem)}</td>
            <td class="admin-view encarregado-view sofia-view text-center font-black text-orange-600 other-row-text ${isAdmin ? 'editable-cell' : ''}" data-raw="${p.saida || ''}" onclick="editDataInline('${p.id}', 'saida', this)">${formatarDataBR(p.saida)}</td>
            <td onclick="abrirProgresso('${p.id}', '${p.cliente}', ${perc})">
                <div class="flex items-center space-x-2 cursor-pointer">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div class="h-full bg-blue-600" style="width: ${perc}%"></div></div>
                    <span class="text-[10px] font-black">${perc}%</span>
                </div>
            </td>
            <td class="admin-view italic uppercase truncate border-l pl-3 other-row-text">${p.obs_edu || ''}</td>
            <td class="text-right pr-6 no-print">
                <div class="flex justify-end gap-2">
                    <button onclick="preparaEdicao('${p.id}', '${encodeURIComponent(JSON.stringify(p))}')" class="text-orange-400"><i class="fas fa-pencil-alt"></i></button>
                    ${isAdmin ? `<button onclick="apagarPedido('${p.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>` : ''}
                </div>
            </td>`;
        container.appendChild(tr);
    });
});

// 5. CLIENTES E MODAIS
function atualizarInterfaceClientes(fbList = []) {
    const select = document.getElementById('p-cliente');
    const completa = [...(CLIENTES_ESTATICOS || []), ...fbList].sort((a,b) => a.nome.localeCompare(b.nome));
    if(select) select.innerHTML = '<option value="">-- SELECIONAR CLIENTE --</option>' + completa.map(c => `<option value="${c.codigo} | ${c.nome}">${c.codigo} | ${c.nome}</option>`).join('');
}
onSnapshot(query(colClientesFirebase, orderBy("nome")), snap => {
    let list = []; snap.forEach(d => list.push(d.data()));
    atualizarInterfaceClientes(list);
});

window.fecharModal = () => document.querySelectorAll('.fixed:not(#modal-login)').forEach(m => m.classList.add('hidden'));
window.abrirModalPedido = () => { document.getElementById('p-id').value = ""; document.getElementById('form-pedido').reset(); document.getElementById('modal-pedido').classList.remove('hidden'); };
window.abrirModalCliente = () => document.getElementById('modal-cliente').classList.remove('hidden');
window.abrirProgresso = (id, n, p) => { document.getElementById('prog-id').value = id; document.getElementById('prog-nome').innerText = n; document.getElementById('prog-range').value = p; document.getElementById('prog-perc-val').innerText = p; document.getElementById('modal-progresso').classList.remove('hidden'); };

window.salvarProgresso = async () => {
    const id = document.getElementById('prog-id').value;
    const perc = parseInt(document.getElementById('prog-range').value);
    const obs = document.getElementById('prog-obs').value.toUpperCase();
    const log = `${localStorage.getItem('gamil_user')}: ${perc}% ${obs ? '-> '+obs : ''} [${new Date().toLocaleString('pt-PT')}]`;
    await updateDoc(doc(db, "pedidos_vfinal_gamil", id), { progresso: perc, historico: arrayUnion(log) });
    window.fecharModal();
};

window.apagarPedido = async (id) => { if(confirm("Apagar permanentemente?")) await deleteDoc(doc(db, "pedidos_vfinal_gamil", id)); };

window.preparaEdicao = (id, data) => {
    const p = JSON.parse(decodeURIComponent(data));
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

// Submissão do Formulário
document.getElementById('form-pedido').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const data = {
        cliente: document.getElementById('p-cliente').value,
        pedido: document.getElementById('p-pedido').value,
        prio: document.getElementById('p-prio').value,
        ranking: parseInt(document.getElementById('p-pos').value) || '',
        peso: document.getElementById('p-peso').value,
        entrada: document.getElementById('p-entrada').value,
        pesar: document.getElementById('p-pesar').value,
        furos: document.getElementById('p-furos').value,
        montagem: document.getElementById('p-montagem').value,
        saida: document.getElementById('p-saida').value,
        obs_edu: document.getElementById('p-obs-edu').value.toUpperCase(),
        timestamp: new Date()
    };
    if (id) await updateDoc(doc(db, "pedidos_vfinal_gamil", id), data);
    else await addDoc(colPedidos, { ...data, progresso: 0, historico: [] });
    window.fecharModal();
};

checkPermissions();

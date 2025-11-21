// --- INICIALIZAÇÃO FIREBASE (MOVIDA DO index5.html) ---
const firebaseConfig = {
    apiKey: "AIzaSyAqE58H0UriOexZpsDAODfNFSsi5Co4nac",
    authDomain: "churrasco-com-amigosecreto.firebaseapp.com",
    projectId: "churrasco-com-amigosecreto",
    storageBucket: "churrasco-com-amigosecreto.firebasestorage.app",
    messagingSenderId: "780934998934",
    appId: "1:780934998934:web:fc30e057ef1b31b3438bb7"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); 

// Ativa logs de depuração para ver erros no console do navegador
firebase.firestore.setLogLevel('debug');


// --- LOCALIZAÇÃO DE ELEMENTOS HTML ---
const listaPresenca = document.getElementById('lista-presenca');
const listaAmigoSecreto = document.getElementById('lista-amigo-secreto');
const totalConfirmadosSpan = document.getElementById('total-confirmados');
const totalAmigoSecretoSpan = document.getElementById('total-amigo-secreto');

// Elementos do Formulário
const confirmacaoForm = document.getElementById('confirmacao-form');
const nomeInput = document.getElementById('nome');
const acompanhantesInput = document.getElementById('acompanhantes');
const participaAmigoSecretoCheckbox = document.getElementById('participa-amigo-secreto');
const valorDisplay = document.getElementById('valor-display');
const mensagemStatus = document.getElementById('mensagem-status');
const nomesAcompanhantesWrapper = document.getElementById('nomes-acompanhantes-wrapper');

// O ID da festa
const ID_FESTA = 'uzppMbpJjucjqzJEZQLNZKHSVcI2'; 
// Caminho correto da coleção: festas/{ID_FESTA}/participantes
const colecaoParticipantes = db.collection('festas').doc(ID_FESTA).collection('participantes');

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

function calcularValor() {
    valorDisplay.textContent = 'R$ 50,00';
}

function salvarConfirmacao(e) {
    e.preventDefault();

    // Feedback visual
    mensagemStatus.textContent = "Salvando...";
    mensagemStatus.style.backgroundColor = '#fff3e0'; 
    mensagemStatus.style.color = '#ff9800'; 

    const nome = nomeInput.value.trim();
    const acompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaAS = participaAmigoSecretoCheckbox.checked;

    if (!nome) {
        mensagemStatus.textContent = "Por favor, preencha seu nome.";
        mensagemStatus.style.backgroundColor = '#ffebee';
        mensagemStatus.style.color = '#d32f2f';
        return;
    }

    let nomesAcompanhantesAS = [];
    if (participaAS && acompanhantes > 0) {
        const inputsAcompanhantes = nomesAcompanhantesWrapper.querySelectorAll('input[type="text"]');
        inputsAcompanhantes.forEach(input => {
            const nomeAcomp = input.value.trim();
            if (nomeAcomp) {
                nomesAcompanhantesAS.push(nomeAcomp);
            }
        });
    }

    const dados = {
        nome: nome,
        acompanhantes: acompanhantes,
        participaAS: participaAS, // USANDO participaAS para salvar (CORRETO)
        nomesAmigoSecreto: nomesAcompanhantesAS,
        valorPago: 50,
        contribuir: true, 
        timestamp: new firebase.firestore.Timestamp.now()
    };

    colecaoParticipantes.add(dados)
        .then(() => {
            mensagemStatus.textContent = "Presença confirmada com sucesso!";
            mensagemStatus.style.backgroundColor = '#e8f5e9'; 
            mensagemStatus.style.color = '#388e3c'; 
            confirmacaoForm.reset();
            calcularValor();
            nomesAcompanhantesWrapper.style.display = 'none';
            nomesAcompanhantesWrapper.innerHTML = '<h3>Acompanhantes para o Amigo Secreto:</h3>';
        })
        .catch(error => {
            console.error("Erro ao salvar no Firestore: ", error);
            mensagemStatus.textContent = "Erro ao confirmar presença. Tente novamente.";
            mensagemStatus.style.backgroundColor = '#ffebee'; 
            mensagemStatus.style.color = '#d32f2f'; 
        });
}

// --- FUNÇÕES DE RENDERIZAÇÃO E CARREGAMENTO ---

function renderizarListas(participantes) {
    listaPresenca.innerHTML = '';
    if (listaAmigoSecreto) { 
        listaAmigoSecreto.innerHTML = '';
    }

    let totalPessoas = 0;
    let totalAmigoSecreto = 0;

    participantes.forEach(doc => {
        const dados = doc.data();
        const nomeParticipante = dados.nome || 'Participante Desconhecido';
        const numAcompanhantes = dados.acompanhantes || 0;
        // CORREÇÃO CRÍTICA: Lendo o campo 'participaAS' do seu DB (CORRETO)
        const participaAS = dados.participaAS || false; 
        
        totalPessoas += (1 + numAcompanhantes); 
        
        const liPresenca = document.createElement('li');
        let textoPresenca = `${nomeParticipante} (P + ${numAcompanhantes} Acompanhante${numAcompanhantes === 1 ? '' : 's'})`;
        
        if (participaAS) {
            textoPresenca += ' - 🎁 **Amigo Secreto Sim**';
            totalAmigoSecreto += 1; 
        } else {
            textoPresenca += ' - Amigo Secreto Não';
        }
        
        liPresenca.innerHTML = textoPresenca;
        listaPresenca.appendChild(liPresenca);

        // Renderiza na lista de Amigo Secreto se o elemento existir
        if (participaAS && listaAmigoSecreto) {
            const liAmigoSecreto = document.createElement('li');
            liAmigoSecreto.textContent = nomeParticipante; 
            listaAmigoSecreto.appendChild(liAmigoSecreto);

            if (dados.nomesAmigoSecreto && dados.nomesAmigoSecreto.length > 0) {
                dados.nomesAmigoSecreto.forEach(nomeAcompanhante => {
                    const liAcomp = document.createElement('li');
                    liAcomp.textContent = nomeAcompanhante + ' (Acomp.)';
                    listaAmigoSecreto.appendChild(liAcomp);
                    totalAmigoSecreto += 1;
                });
            }
        }
    });

    totalConfirmadosSpan.textContent = totalPessoas;
    if (totalAmigoSecretoSpan) {
        totalAmigoSecretoSpan.textContent = totalAmigoSecreto;
    }
}

// Configura o Listener em tempo real do Firestore
function carregarParticipantes() {
    colecaoParticipantes.onSnapshot(snapshot => {
        mensagemStatus.textContent = ''; 
        renderizarListas(snapshot.docs);
    }, error => {
        console.error("Erro ao buscar participantes: ", error);
        // Sugere verificar as regras, já que o erro de permissão é o mais provável
        listaPresenca.innerHTML = '<li>Erro ao carregar participantes. Verifique as Regras do Firebase.</li>';
        if (listaAmigoSecreto) {
            listaAmigoSecreto.innerHTML = '<li>Erro ao carregar participantes. Verifique as Regras do Firebase.</li>';
        }
    });
}

// --- CONTROLES DE FORMULÁRIO ---
function gerenciarCamposAmigoSecreto() {
    nomesAcompanhantesWrapper.innerHTML = '<h3>Acompanhantes para o Amigo Secreto:</h3>';
    nomesAcompanhantesWrapper.style.display = 'none';

    const numAcompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaAS = participaAmigoSecretoCheckbox.checked;

    if (participaAS && numAcompanhantes > 0) {
        nomesAcompanhantesWrapper.style.display = 'block';
        
        for (let i = 1; i <= numAcompanhantes; i++) {
            const label = document.createElement('label');
            label.textContent = `Nome do Acompanhante ${i} (p/ Amigo Secreto):`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Nome do Acompanhante ${i}`;
            
            nomesAcompanhantesWrapper.appendChild(label);
            nomesAcompanhantesWrapper.appendChild(input);
        }
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    carregarParticipantes();
    calcularValor(); 
});

confirmacaoForm.addEventListener('submit', salvarConfirmacao);
acompanhantesInput.addEventListener('input', gerenciarCamposAmigoSecreto);
participaAmigoSecretoCheckbox.addEventListener('change', gerenciarCamposAmigoSecreto);

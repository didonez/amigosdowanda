```javascript:Lógica do Formulário e Admin:script.js
// O objeto 'db' (firebase.firestore()) é inicializado no index.html
const PARTICIPANTE_PRINCIPAL_BASE_VALOR = 50.00;
const COLLECTION_NAME = 'participantes';

// Elementos do DOM
const form = document.getElementById('confirmacao-form');
const acompanhantesInput = document.getElementById('acompanhantes');
const valorDisplay = document.getElementById('valor-display');
const participaAmigoSecreto = document.getElementById('participa-amigo-secreto');
const nomesAcompanhantesWrapper = document.getElementById('nomes-acompanhantes-wrapper');
const listaPresencaUl = document.getElementById('lista-presenca');
const totalConfirmadosSpan = document.getElementById('total-confirmados');
const totalAmigoSecretoSpan = document.getElementById('total-amigo-secreto');
const btnSortear = document.getElementById('btn-sortear');
const btnQuemTirei = document.getElementById('btn-quem-tirei');
const btnNovaFesta = document.getElementById('btn-nova-festa'); 
const btnToggleEdit = document.getElementById('btn-toggle-edit');
const mensagemStatus = document.getElementById('mensagem-status');
const resultadoSorteio = document.getElementById('resultado-sorteio');

// Lista de IDs dos elementos que o admin pode editar
const elementosEditaveis = [
    document.getElementById('titulo-festa'),
    document.getElementById('detalhe-endereco'),
    document.getElementById('detalhe-data'),
    document.getElementById('detalhe-valor'),
    document.getElementById('detalhe-custo'),
    document.getElementById('detalhe-pix'),
    document.getElementById('detalhe-as'),
    document.getElementById('detalhe-contribuicao'),
];

let adminUID = null; 

// --- FUNÇÕES DE LÓGICA DO FORMULÁRIO ---

// Atualiza o valor total a pagar e os campos de acompanhantes
function updateValorECamposAcompanhantes() {
    const numAcompanhantes = parseInt(acompanhantesInput.value) || 0;
    const totalPessoas = numAcompanhantes + 1; 
    const valorTotal = totalPessoas * PARTICIPANTE_PRINCIPAL_BASE_VALOR;
    
    valorDisplay.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

    updateAcompanhantesAmigoSecretoFields(numAcompanhantes);
}

// Lógica para mostrar/esconder campos de nomes dos acompanhantes para o AS
function updateAcompanhantesAmigoSecretoFields(numAcompanhantes) {
    if (!nomesAcompanhantesWrapper) return; 

    nomesAcompanhantesWrapper.innerHTML = '<h3>Acompanhantes para o Amigo Secreto:</h3>';
    
    const showFields = participaAmigoSecreto.checked && numAcompanhantes > 0;
    nomesAcompanhantesWrapper.style.display = showFields ? 'block' : 'none';

    if (showFields) {
        for (let i = 1; i <= numAcompanhantes; i++) {
            const div = document.createElement('div');
            div.innerHTML = `
                <label for="acomp_${i}">Nome Acompanhante ${i}:</label>
                <input type="text" id="acomp_${i}" name="acomp_${i}" placeholder="Nome Completo do Acompanhante ${i}" required>
            `;
            nomesAcompanhantesWrapper.appendChild(div);
        }
    }
}

// Verifica se o participante logado é o Admin e mostra as ferramentas
function checkAdminAccess(currentUID) {
    const isAdmin = currentUID === adminUID;

    // Ações do Admin: Sorteio, Nova Festa, Edição de Detalhes
    document.querySelector('.admin-actions').style.display = isAdmin ? 'block' : 'none';
    btnSortear.style.display = isAdmin ? 'block' : 'none';
    btnToggleEdit.style.display = isAdmin ? 'block' : 'none';
}

// --- FUNÇÕES FIREBASE E ADMIN ---

// Carrega os participantes, atualiza a lista e verifica o admin
async function loadParticipantes() {
    try {
        // Usa onSnapshot para ouvir as mudanças em tempo real
        db.collection(COLLECTION_NAME).orderBy('timestamp', 'asc').onSnapshot(snapshot => {
            let totalConfirmados = 0;
            let totalAmigoSecreto = 0;
            listaPresencaUl.innerHTML = '';
            
            // Determina o Admin (o primeiro a se cadastrar)
            const currentUID = localStorage.getItem('participanteUID');
            
            // Se já há documentos e o adminUID ainda não foi definido, define o primeiro como admin
            if (snapshot.docs.length > 0 && !adminUID) {
                adminUID = snapshot.docs[0].id;
            } 
            
            // Verifica o acesso admin se o usuário atual está logado
            if (currentUID) {
                checkAdminAccess(currentUID);
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Lógica para Participante logado
                if (currentUID && doc.id === currentUID && data.tirouNome) {
                    btnQuemTirei.style.display = 'block';
                } else if (currentUID && doc.id === currentUID) {
                    btnQuemTirei.style.display = 'none';
                }

                // Contador e Lista
                totalConfirmados += (data.acompanhantes || 0) + 1;
                
                let listItem = document.createElement('li');
                let listaAS = [];
                
                if (data.participaAS) {
                    listaAS.push(data.nome);
                }
                if (data.acompanhantesAS && data.acompanhantesAS.length > 0) {
                    data.acompanhantesAS.forEach(nome => {
                        listaAS.push(nome);
                    });
                }

                // Exibe o item na lista
                let asInfo = listaAS.length > 0 ? ` - AS: ${listaAS.join(', ')}` : '';
                listItem.textContent = `${data.nome} (P + ${data.acompanhantes || 0} Acompanhantes)${asInfo}`;
                listaPresencaUl.appendChild(listItem);

                totalAmigoSecreto += listaAS.length;
            });

            totalConfirmadosSpan.textContent = totalConfirmados;
            totalAmigoSecretoSpan.textContent = totalAmigoSecreto;
            
        }, err => {
            console.error("Erro ao ouvir o Firestore (onSnapshot):", err);
            // Mensagem de falha para o usuário
            document.getElementById('mensagem-status').textContent = "⚠️ Erro ao carregar dados do Firebase. Verifique sua conexão e regras.";
            document.getElementById('mensagem-status').style.backgroundColor = '#fce4ec';
            document.getElementById('mensagem-status').style.color = '#c2185b';
        });

    } catch (error) {
        console.error("Erro geral no loadParticipantes:", error);
    }
}


// Salva a confirmação no Firestore
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const acompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaAS = participaAmigoSecreto.checked;
    
    // Nomes dos acompanhantes que participam do AS
    const acompanhantesAS = [];
    if (participaAS && acompanhantes > 0) {
        // Encontra os campos dinâmicos de acompanhantes
        for (let i = 1; i <= acompanhantes; i++) {
            const nomeAcompElement = document.getElementById(`acomp_${i}`);
            if (nomeAcompElement) {
                const nomeAcomp = nomeAcompElement.value.trim();
                if (nomeAcomp) acompanhantesAS.push(nomeAcomp);
            }
        }
    }

    try {
        // Verifica se o participante principal já se cadastrou
        const querySnapshot = await db.collection(COLLECTION_NAME).where('nome', '==', nome).get();
        if (!querySnapshot.empty) {
            mensagemStatus.style.backgroundColor = '#ffe0b2'; 
            mensagemStatus.style.color = '#e65100'; 
            mensagemStatus.textContent = `🚨 O participante principal "${nome}" já está confirmado!`;
            return;
        }

        // Adiciona ao Firestore
        const newDocRef = db.collection(COLLECTION_NAME).doc();
        await newDocRef.set({
            nome: nome,
            acompanhantes: acompanhantes,
            valorPago: (acompanhantes + 1) * PARTICIPANTE_PRINCIPAL_BASE_VALOR,
            contribuiu: true, 
            participaAS: participaAS,
            acompanhantesAS: acompanhantesAS,
            tirouNome: null, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Exibe mensagem de sucesso
        const valorTotal = ((acompanhantes + 1) * PARTICIPANTE_PRINCIPAL_BASE_VALOR).toFixed(2).replace('.', ',');
        mensagemStatus.style.backgroundColor = '#e8f5e9'; 
        mensagemStatus.style.color = '#388e3c'; 
        mensagemStatus.textContent = `🎉 Presença de ${nome} confirmada! Valor a pagar: R$ ${valorTotal}.`;
        
        // Simula "login" e armazena o ID do documento
        localStorage.setItem('participanteUID', newDocRef.id);
        
        form.reset(); 

    } catch (error) {
        mensagemStatus.textContent = `❌ Erro ao confirmar: ${error.message}`;
        console.error("Erro ao adicionar documento: ", error);
    }
});


// FUNÇÃO DO ADMIN: Apaga todos os participantes (Nova Festa)
async function iniciarNovaFesta() {
    // Confirmação para evitar exclusão acidental
    const confirmacao = window.confirm("ATENÇÃO: Isso apagará TODOS os dados de participantes, sorteio e admin. Deseja iniciar uma nova festa?");
    if (!confirmacao) return;

    try {
        const snapshot = await db.collection(COLLECTION_NAME).get();
        const batch = db.batch(); // Usa batch para exclusão em massa (mais rápido e seguro)
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        // Limpa o localStorage e reseta o admin para a próxima festa
        localStorage.removeItem('participanteUID');
        adminUID = null;
        
        alert("🎉 Nova Festa iniciada! Todos os dados foram apagados com sucesso.");
        
        // Esconde os botões de admin até o próximo cadastro
        document.querySelector('.admin-actions').style.display = 'none';
        btnSortear.style.display = 'none';
        btnToggleEdit.style.display = 'none';
        
        // Limpa o status
        mensagemStatus.textContent = '';
        loadParticipantes(); // Recarrega a lista (agora vazia)

    } catch (error) {
        alert(`❌ Erro ao apagar dados: ${error.message}. Tente novamente.`);
        console.error("Erro ao limpar a coleção:", error);
    }
}

// FUNÇÃO DO ADMIN: Alterna Edição dos Detalhes
function toggleEditDetails() {
    const isEditable = btnToggleEdit.textContent.includes('Editar');
    
    // Habilita/Desabilita a edição e muda os estilos visuais
    elementosEditaveis.forEach(el => {
        el.contentEditable = isEditable ? "true" : "false";
        el.style.border = isEditable ? '1px dashed #f9a825' : 'none';
        el.style.padding = isEditable ? '5px' : '0';
        el.style.borderRadius = isEditable ? '5px' : '0';
        el.style.backgroundColor = isEditable ? '#fffde7' : 'transparent';
    });

    if (isEditable) {
        btnToggleEdit.textContent = 'Salvar Detalhes';
        alert("Modo de Edição ATIVADO. O texto que você digitar será salvo no seu navegador para esta sessão.");
    } else {
        btnToggleEdit.textContent = 'Editar Detalhes';
        alert("Detalhes SALVOS no seu navegador. Para salvar permanentemente para todos os usuários, você deve COPIAR o texto alterado e ATUALIZAR o arquivo index.html no GitHub.");
    }
}


// --- LISTENERS E INICIALIZAÇÃO ---

// Listeners para Admin
btnNovaFesta.addEventListener('click', iniciarNovaFesta);
btnToggleEdit.addEventListener('click', toggleEditDetails);

// Listeners do Formulário
acompanhantesInput.addEventListener('input', updateValorECamposAcompanhantes);
participaAmigoSecreto.addEventListener('change', updateValorECamposAcompanhantes);

// Funções de Sorteio e Visualização (Mantenha as do seu código original aqui, se houver)
btnSortear.addEventListener('click', () => {
    alert("Função de Sorteio do Amigo Secreto (implemente aqui a lógica de sorteio).");
});
btnQuemTirei.addEventListener('click', () => {
    alert("Visualizar Quem Eu Tirei (implemente aqui a lógica de visualização).");
});


// Inicia o carregamento dos dados e fica ouvindo por mudanças
loadParticipantes();
updateValorECamposAcompanhantes();
```eof


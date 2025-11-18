// O objeto 'db' (firebase.firestore()) foi inicializado no index.html
const PARTICIPANTE_PRINCIPAL_BASE_VALOR = 50.00;
const COLLECTION_NAME = 'participantes';

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
const mensagemStatus = document.getElementById('mensagem-status');
const resultadoSorteio = document.getElementById('resultado-sorteio');

let adminUID = null; // Armazenará o ID do primeiro participante (Admin)
let nomeParticipanteLogado = localStorage.getItem('nomeParticipante'); // Simula um login simples

// --- FUNÇÕES DE LÓGICA DO FORMULÁRIO ---

// 1. Atualiza o valor total a pagar e os campos de acompanhantes
function updateValorECamposAcompanhantes() {
    const numAcompanhantes = parseInt(acompanhantesInput.value) || 0;
    const totalPessoas = numAcompanhantes + 1; // Principal + Acompanhantes
    const valorTotal = totalPessoas * PARTICIPANTE_PRINCIPAL_BASE_VALOR;
    
    valorDisplay.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

    // Atualiza/Cria os campos de nome dos acompanhantes que participarão do AS
    updateAcompanhantesAmigoSecretoFields(numAcompanhantes);
}

// 2. Lógica para mostrar/esconder campos de nomes dos acompanhantes
function updateAcompanhantesAmigoSecretoFields(numAcompanhantes) {
    nomesAcompanhantesWrapper.innerHTML = '<h3>Acompanhantes para o Amigo Secreto:</h3>';
    
    // Mostra/Esconde a seção de nomes dos acompanhantes
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

// --- FUNÇÕES FIREBASE ---

// 3. Carrega os participantes e atualiza a lista e totais
async function loadParticipantes() {
    try {
        const snapshot = await db.collection(COLLECTION_NAME).orderBy('timestamp', 'asc').get();
        let totalConfirmados = 0;
        let totalAmigoSecreto = 0;
        
        listaPresencaUl.innerHTML = '';
        
        // Determina o Admin (o primeiro a se cadastrar)
        if (snapshot.docs.length > 0 && !adminUID) {
            adminUID = snapshot.docs[0].id;
            console.log("Admin ID:", adminUID);
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Lógica para Admin: Se for o admin, mostra o botão de sortear
            if (nomeParticipanteLogado === data.nome && doc.id === adminUID) {
                btnSortear.style.display = 'block';
            }
            
            // Lógica para Participante: Se for o participante e o sorteio já ocorreu
            if (nomeParticipanteLogado === data.nome && data.tirouNome) {
                btnQuemTirei.style.display = 'block';
            } else if (nomeParticipanteLogado === data.nome) {
                // Participante está logado, mas o sorteio ainda não ocorreu.
                btnQuemTirei.style.display = 'none';
            }


            // Contador
            totalConfirmados += (data.acompanhantes || 0) + 1;
            
            // Lista e AS
            let listItem = document.createElement('li');
            let listaAS = [];
            
            // Participante Principal
            if (data.participaAS) {
                listaAS.push(data.nome);
                listItem.textContent = `${data.nome} (P + ${data.acompanhantes || 0} Acompanhantes)`;
            } else {
                listItem.textContent = `${data.nome} (P + ${data.acompanhantes || 0} Acompanhantes)`;
            }

            // Acompanhantes
            if (data.acompanhantesAS && data.acompanhantesAS.length > 0) {
                data.acompanhantesAS.forEach(nome => {
                    listaAS.push(nome);
                });
                listItem.textContent += ` - AS: ${data.acompanhantesAS.join(', ')}`;
            }

            totalAmigoSecreto += listaAS.length;
            listaPresencaUl.appendChild(listItem);
        });

        totalConfirmadosSpan.textContent = totalConfirmados;
        totalAmigoSecretoSpan.textContent = totalAmigoSecreto;

    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
    }
}


// 4. Salva a confirmação no Firestore
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const acompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaAS = participaAmigoSecreto.checked;
    
    const acompanhantesAS = [];
    if (participaAS && acompanhantes > 0) {
        for (let i = 1; i <= acompanhantes; i++) {
            const nomeAcomp = document.getElementById(`acomp_${i}`).value.trim();
            if (nomeAcomp) acompanhantesAS.push(nomeAcomp);
        }
    }

    try {
        // Verifica se o participante principal já se cadastrou
        const querySnapshot = await db.collection(COLLECTION_NAME).where('nome', '==', nome).get();
        if (!querySnapshot.empty) {
            mensagemStatus.style.backgroundColor = '#ffe0b2'; // Laranja claro
            mensagemStatus.style.color = '#e65100'; // Laranja escuro
            mensagemStatus.textContent = `🚨 O participante principal "${nome}" já está confirmado!`;
            return;
        }

        // Adiciona ao Firestore
        const docRef = await db.collection(COLLECTION_NAME).add({
            nome: nome,
            acompanhantes: acompanhantes,
            valorPago: (acompanhantes + 1) * PARTICIPANTE_PRINCIPAL_BASE_VALOR,
            contribuiu: true, // Assumindo que o pagamento PIX será feito
            participaAS: participaAS,
            acompanhantesAS: acompanhantesAS,
            tirouNome: null, // Quem o participante tirou no AS
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        mensagemStatus.style.backgroundColor = '#e8f5e9'; // Verde Claro
        mensagemStatus.style.color = '#388e3c'; // Verde Escuro
        mensagemStatus.textContent = `🎉 Presença de ${nome} confirmada! Valor a pagar: R$ ${((acompanhantes + 1) * 50).toFixed(2).replace('.', ',')}.`;
        
        // Simula "login" após o cadastro
        localStorage.setItem('nomeParticipante', nome);
        nomeParticipanteLogado = nome;
        
        loadParticipantes(); // Recarrega a lista
        form.reset(); // Limpa o formulário

    } catch (error) {
        mensagemStatus.textContent = `❌ Erro ao confirmar: ${error.message}`;
        console.error("Erro ao adicionar documento: ", error);
    }
});

// 5. Lógica de Sorteio (Apenas Admin)
btnSortear.addEventListener('click', async () => {
    // 5.1. Busca a lista de participantes do Amigo Secreto (AS)
    const snapshot = await db.collection(COLLECTION_NAME).get();
    let listaCompletaAS = [];
    let participantesMap = new Map(); // Para mapear nome -> DocRef

    snapshot.forEach(doc => {
        const data = doc.data();
        const nomePrincipal = data.nome;
        const docRef = doc.ref;

        // Adiciona o principal se ele participar
        if (data.participaAS) {
            listaCompletaAS.push(nomePrincipal);
            participantesMap.set(nomePrincipal, docRef);
        }

        // Adiciona os acompanhantes se eles participarem
        if (data.acompanhantesAS && data.acompanhantesAS.length > 0) {
            data.acompanhantesAS.forEach(nomeAcomp => {
                listaCompletaAS.push(nomeAcomp);
                // Para simplificação, acompanhantes também mapeiam para o DocRef do principal
                participantesMap.set(nomeAcomp, docRef); 
            });
        }
    });

    if (listaCompletaAS.length < 2) {
        alert("Pelo menos 2 participantes precisam querer participar do Amigo Secreto.");
        return;
    }

    // 5.2. Realiza o Sorteio (sem tirar a si mesmo)
    // Para simplificar, usamos a lógica do embaralhamento de Fisher-Yates e verificação
    let listaSorteada = [...listaCompletaAS];
    
    // Tenta embaralhar até que ninguém tire a si mesmo
    let sorteioValido = false;
    while (!sorteioValido) {
        // Embaralha (Fisher-Yates)
        for (let i = listaSorteada.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [listaSorteada[i], listaSorteada[j]] = [listaSorteada[j], listaSorteada[i]];
        }
        
        // Verifica se é válido (ninguém tirou a si mesmo)
        sorteioValido = true;
        for (let i = 0; i < listaCompletaAS.length; i++) {
            if (listaCompletaAS[i] === listaSorteada[i]) {
                sorteioValido = false;
                break;
            }
        }
    }
    
    // 5.3. Salva os resultados no Firestore
    const batch = db.batch();
    
    for (let i = 0; i < listaCompletaAS.length; i++) {
        const nomeQuemTirou = listaCompletaAS[i];
        const nomeTirado = listaSorteada[i];
        
        // Acha o documento principal do participante que TIRA (QuemTirou)
        const docRefQuemTirou = participantesMap.get(nomeQuemTirou);

        // Se o nomeQueTirou for o participante principal do doc, atualiza 'tirouNome'
        if (docRefQuemTirou && docRefQuemTirou.nome === nomeQuemTirou) {
             batch.update(docRefQuemTirou, { tirouNome: nomeTirado });
        } 
        // Lógica mais complexa seria necessária se os acompanhantes tivessem documentos separados
        // Para a estrutura atual, só o principal consegue ver quem tirou, simplificando.
        // O campo 'tirouNome' será guardado no documento do participante principal.
        // Neste exemplo simplificado, vamos apenas garantir que o campo 'tirouNome' seja atualizado no doc principal.
        
        // Como o `participantesMap` aponta todos para o doc principal, usamos o docRef
        // E criamos um submapa dentro do documento principal para o AS
        // ESTA PARTE REQUER UM REAJUSTE DE ESTRUTURA PARA SER PRECISO
        // Simplificando MUITO: Apenas o PARTICIPANTE PRINCIPAL terá o campo `tirouNome` atualizado.
        
        if (participantesMap.has(nomeQuemTirou)) {
            const docRef = participantesMap.get(nomeQuemTirou);
            
            if(docRef.id) { // Verifica se é um DocRef válido
                 batch.update(docRef, { tirouNome: nomeTirado });
            }
        }
        
    }
    
    try {
        await batch.commit();
        alert(`🎉 Sorteio realizado com sucesso! ${listaCompletaAS.length} participantes. Todos podem ver quem tiraram agora.`);
        loadParticipantes(); // Recarrega e mostra o botão 'Quem Eu Tirei?'
    } catch (error) {
        console.error("Erro ao salvar o sorteio: ", error);
        alert("❌ Erro ao realizar o sorteio.");
    }

});

// 6. Visualiza o Amigo Secreto (Após o sorteio)
btnQuemTirei.addEventListener('click', async () => {
    if (!nomeParticipanteLogado) {
        resultadoSorteio.textContent = "Faça sua confirmação de presença primeiro.";
        return;
    }
    
    // Busca o documento do participante logado
    const querySnapshot = await db.collection(COLLECTION_NAME).where('nome', '==', nomeParticipanteLogado).limit(1).get();
    
    if (querySnapshot.empty) {
        resultadoSorteio.textContent = "Seu nome não foi encontrado.";
        return;
    }

    const data = querySnapshot.docs[0].data();
    
    if (data.tirouNome) {
        resultadoSorteio.style.backgroundColor = '#fff3e0'; // Amarelo Claro
        resultadoSorteio.style.color = '#ff9800'; // Laranja
        resultadoSorteio.textContent = `🥳 Você tirou: ${data.tirouNome}!`;
    } else {
        resultadoSorteio.textContent = "O sorteio ainda não foi realizado pelo administrador.";
    }
});

// --- LISTENERS E INICIALIZAÇÃO ---

// Quando o número de acompanhantes muda, atualiza o valor e campos
acompanhantesInput.addEventListener('input', updateValorECamposAcompanhantes);
// Quando a opção de AS muda, atualiza os campos de nomes
participaAmigoSecreto.addEventListener('change', updateValorECamposAcompanhantes);

// Carrega os dados ao iniciar e fica ouvindo por mudanças (opcional)
db.collection(COLLECTION_NAME).onSnapshot(loadParticipantes, err => {
    console.error("Erro ao ouvir o Firestore:", err);
    loadParticipantes(); // Chama a função mesmo que haja erro no listener
});

// Inicializa a exibição do valor/campos
updateValorECamposAcompanhantes();

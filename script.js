// Localiza os elementos HTML
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


// O ID da festa deve ser o mesmo usado na URL/DB
const ID_FESTA = 'uzppMbpJjucjqzJEZQLNZKHSVcI2'; 
// A coleção 'participantes' dentro do documento 'festas/ID_FESTA'
const colecaoParticipantes = db.collection('festas').doc(ID_FESTA).collection('participantes');

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

function calcularValor() {
    // Apenas o participante principal paga R$ 50,00
    valorDisplay.textContent = 'R$ 50,00';
}

function salvarConfirmacao(e) {
    e.preventDefault();

    // Resetar mensagens
    mensagemStatus.textContent = "Salvando...";
    mensagemStatus.style.backgroundColor = '#fff3e0'; // Amarelo Claro
    mensagemStatus.style.color = '#ff9800'; // Laranja

    // Coleta dos dados
    const nome = nomeInput.value.trim();
    const acompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaAS = participaAmigoSecretoCheckbox.checked;

    if (!nome) {
        mensagemStatus.textContent = "Por favor, preencha seu nome.";
        mensagemStatus.style.backgroundColor = '#ffebee';
        mensagemStatus.style.color = '#d32f2f';
        return;
    }

    // Se participa do AS e há acompanhantes, coleta os nomes
    let nomesAcompanhantesAS = [];
    if (participaAS && acompanhantes > 0) {
        const inputsAcompanhantes = nomesAcompanhantesWrapper.querySelectorAll('input[type="text"]');
        inputsAcompanhantes.forEach(input => {
            const nomeAcomp = input.value.trim();
            // Apenas nomes preenchidos são considerados para o AS
            if (nomeAcomp) {
                nomesAcompanhantesAS.push(nomeAcomp);
            }
        });
    }

    // Estrutura de dados para o Firebase
    const dados = {
        nome: nome,
        acompanhantes: acompanhantes,
        participaAS: participaAS, // USANDO participaAS (CORRETO)
        nomesAmigoSecreto: nomesAcompanhantesAS,
        valorPago: 50,
        contribuir: true, 
        timestamp: new firebase.firestore.Timestamp.now()
    };

    colecaoParticipantes.add(dados)
        .then(() => {
            mensagemStatus.textContent = "Presença confirmada com sucesso!";
            mensagemStatus.style.backgroundColor = '#e8f5e9'; // Verde Claro
            mensagemStatus.style.color = '#388e3c'; // Verde Escuro
            confirmacaoForm.reset();
            // Recalcula o valor e oculta campos extras
            calcularValor();
            nomesAcompanhantesWrapper.style.display = 'none';
            nomesAcompanhantesWrapper.innerHTML = '<h3>Acompanhantes para o Amigo Secreto:</h3>';
        })
        .catch(error => {
            console.error("Erro ao salvar no Firestore: ", error);
            mensagemStatus.textContent = "Erro ao confirmar presença. Tente novamente.";
            mensagemStatus.style.backgroundColor = '#ffebee'; // Vermelho Claro
            mensagemStatus.style.color = '#d32f2f'; // Vermelho Escuro
        });
}

// --- FUNÇÕES DE RENDERIZAÇÃO E CARREGAMENTO ---

function renderizarListas(participantes) {
    // Zera as listas antes de repopular
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
        // CORREÇÃO: Lendo o campo 'participaAS'
        const participaAS = dados.participaAS || false; 
        
        // 1. Contagem Total de Pessoas
        totalPessoas += (1 + numAcompanhantes); 
        
        // 2. Cria item para a Lista de Presença Completa
        const liPresenca = document.createElement('li');
        
        let textoPresenca = `${nomeParticipante} (P + ${numAcompanhantes} Acompanhante${numAcompanhantes === 1 ? '' : 's'})`;
        
        if (participaAS) {
            textoPresenca += ' - 🎁 **Amigo Secreto Sim**';
            totalAmigoSecreto += 1; // Participante principal
        } else {
            textoPresenca += ' - Amigo Secreto Não';
        }
        
        liPresenca.innerHTML = textoPresenca;
        listaPresenca.appendChild(liPresenca);

        // 3. Cria item para a Lista Exclusiva do Amigo Secreto
        if (participaAS && listaAmigoSecreto) {
            const liAmigoSecreto = document.createElement('li');
            liAmigoSecreto.textContent = nomeParticipante; // Apenas o nome do principal
            listaAmigoSecreto.appendChild(liAmigoSecreto);

            // Adiciona Acompanhantes que participam do Amigo Secreto (se houver)
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

    // Atualiza os totais no HTML
    totalConfirmadosSpan.textContent = totalPessoas;
    if (totalAmigoSecretoSpan) {
        totalAmigoSecretoSpan.textContent = totalAmigoSecreto;
    }
}

// Configura o Listener em tempo real do Firestore
function carregarParticipantes() {
    colecaoParticipantes.onSnapshot(snapshot => {
        // Se a busca for bem-sucedida, remove a mensagem de erro de carregamento
        mensagemStatus.textContent = ''; 
        renderizarListas(snapshot.docs);
    }, error => {
        console.error("Erro ao buscar participantes: ", error);
        // Exibe o erro de carregamento apenas na lista, mantendo o formulário utilizável
        listaPresenca.innerHTML = '<li>Erro ao carregar participantes.</li>';
        if (listaAmigoSecreto) {
            listaAmigoSecreto.innerHTML = '<li>Erro ao carregar participantes.</li>';
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
    calcularValor(); // Calcula o valor inicial
});

confirmacaoForm.addEventListener('submit', salvarConfirmacao);
acompanhantesInput.addEventListener('input', gerenciarCamposAmigoSecreto);
participaAmigoSecretoCheckbox.addEventListener('change', gerenciarCamposAmigoSecreto);

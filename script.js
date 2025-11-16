<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulário de Confirmação de Presença</title>
    <!-- Inclua o arquivo de estilos -->
    <link rel="stylesheet" href="style.css"> 
</head>
<body>

    <div class="container">
        <!-- CABEÇALHO -->
        <header>
            <!-- Título editável para a festa -->
            <h1 id="titulo-festa" contenteditable="false">CHURRASCO COM AMIGO SECRETO 🎁</h1>
            <p class="id-festa">ID da Festa: uzppMbpJjucjqzJEZQLNZKHSVcI2</p>
        </header>

        <!-- DETALHES DA FESTA (Tudo editável pelo Admin) -->
        <section class="detalhes">
            <h2>Detalhes da Festa</h2>
            
            <div class="info-item">
                <span class="icon">📍</span>
                <p id="detalhe-endereco" contenteditable="false"><strong>Endereço:</strong> Rua dos Eventos, 456 - Salão de Festas do Condomínio</p>
            </div>
            
            <div class="info-item">
                <span class="icon">📅</span>
                <p id="detalhe-data" contenteditable="false"><strong>Data/Hora:</strong> 20 de Dezembro (Sexta-feira) às 20h00</p>
            </div>
            
            <div class="info-item">
                <span class="icon">💳</span>
                <p id="detalhe-valor" contenteditable="false"><strong>Valor Base p/ Pessoa:</strong> R$ 50,00</p>
            </div>
            
            <div class="info-item" id="pix-info">
                <span class="icon">🔑</span>
                <p id="detalhe-custo" contenteditable="false"><strong>Custo R$ 50,00:</strong> Apenas locação e infraestrutura (carvão, limpeza, etc).</p>
            </div>
            
            <div class="info-item">
                <span class="icon">💰</span>
                <p id="detalhe-pix" contenteditable="false"><strong>PIX:</strong> 123.456.789-00 (CPF da Organização)</p>
            </div>
            
            <div class="info-item">
                <span class="icon">🎁</span>
                <p id="detalhe-as" contenteditable="false"><strong>Amigo Secreto:</strong> Até R$ 30,00</p>
            </div>

            <div class="info-item" id="contribuicao">
                <span class="icon">🍴</span>
                <p id="detalhe-contribuicao" contenteditable="false"><strong>Sua Contribuição:</strong> Cada um deve levar o que irá consumir: bebidas (cerveja, refri, água) e comida para churrasco (carne, linguiça, frango, pão de alho, arroz, sobremesa, etc.).</p>
            </div>
            
            <!-- Botão de Edição de Detalhes (Admin) -->
            <button id="btn-toggle-edit" class="admin-button" style="display:none; margin-top: 15px;">Editar Detalhes</button>
        </section>

        <hr>

        <!-- FORMULÁRIO DE CONFIRMAÇÃO -->
        <section class="confirmacao">
            <h2>Confirme Sua Presença e Custo</h2>
            <form id="confirmacao-form">
                
                <label for="nome">Seu Nome Completo (Participante Principal):</label>
                <input type="text" id="nome" name="nome" placeholder="Ex: Rogério Silva" required>

                <label for="acompanhantes">Número de Acompanhantes (Máx 10):</label>
                <input type="number" id="acompanhantes" name="acompanhantes" min="0" max="10" value="0" required>
                
                <div class="valor-total">
                    <p>Valor Total a Pagar (PIX):</p>
                    <span id="valor-display">R$ 50,00</span>
                </div>

                <!-- OPÇÃO PARA AMIGO SECRETO -->
                <div class="amigo-secreto-opt">
                    <input type="checkbox" id="participa-amigo-secreto" name="participa-amigo-secreto">
                    <label for="participa-amigo-secreto">Quero participar do Amigo Secreto!</label>
                </div>
                
                <!-- Nomes dos Acompanhantes que participarão (Inicia oculto) -->
                <div id="nomes-acompanhantes-wrapper" style="display:none;">
                    <h3>Acompanhantes para o Amigo Secreto:</h3>
                    <!-- Campos para nomes de acompanhantes serão adicionados aqui via JS -->
                </div>

                <button type="submit" id="btn-confirmar">Confirmar Presença</button>
            </form>

            <p id="mensagem-status" class="status-message"></p>
        </section>

        <hr>

        <!-- AMIGO SECRETO - SORTEIO / VISUALIZAÇÃO -->
        <section class="amigo-secreto-area">
            <h2>Amigo Secreto - Sorteio</h2>
            
            <!-- Botão de Admin -->
            <button id="btn-sortear" class="admin-button" style="display:none;">Realizar Sorteio</button>

            <!-- Botão de Participante -->
            <button id="btn-quem-tirei" style="display:none;">🎁 Quem Eu Tirei?</button>
            
            <p id="resultado-sorteio" class="status-message"></p>
        </section>

        <hr>

        <!-- LISTA DE PARTICIPANTES -->
        <section class="lista-participantes">
            <h2>Lista de Pessoas Confirmadas (<span id="total-confirmados">0</span> Pessoas)</h2>
            <ul id="lista-presenca">
                <!-- Lista será preenchida pelo JavaScript -->
            </ul>
            <p>Participarão do Amigo Secreto: <span id="total-amigo-secreto">0</span></p>
        </section>

        <!-- BOTÃO DE NOVA FESTA (Apenas Admin) -->
        <section class="admin-actions" style="display:none; padding: 15px;">
             <button id="btn-nova-festa" class="admin-button">🎉 Iniciar Nova Festa (Apagar Dados)</button>
             <p class="id-festa" style="margin-top: 10px;">Atenção: Este botão apaga *TODOS* os cadastros do evento atual.</p>
        </section>

    </div>

    <!-- INCLUSÃO DO FIREBASE (SUA CONFIGURAÇÃO) -->
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
    <script>
        // *** SUA CONFIGURAÇÃO REAL DO FIREBASE ***
        const firebaseConfig = {
            apiKey: "AIzaSyAqE58H0UriOexZpsDAODfNFSsi5Co4nac",
            authDomain: "churrasco-com-amigosecreto.firebaseapp.com",
            projectId: "churrasco-com-amigosecreto",
            storageBucket: "churrasco-com-amigosecreto.firebasestorage.app",
            messagingSenderId: "780934998934",
            appId: "1:780934998934:web:fc30e057ef1b31b3438bb7"
        };
        
        // Inicializa o Firebase e o Firestore
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore(); 
        
        // Ativa logs de depuração para ver erros no console do navegador
        firebase.firestore.setLogLevel('debug');
    </script>
    <!-- Inclua o arquivo de lógica -->
    <script src="script.js"></script>
</body>
</html>

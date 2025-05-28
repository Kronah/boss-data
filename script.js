// Configuração do seu projeto Firebase (SUBSTITUA COM AS SUAS INFORMAÇÕES!)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Instância do Firestore

// Variáveis que serão preenchidas pela configuração do cliente
let MOB_DATA_URL = '';
let currentThemeName = 'green'; // Tema padrão inicial

let allMobsData = [];
let selectedMobs = [];

// Definição dos temas (mantida como antes)
const themes = {
    'green': {
        '--bg-color': '#1A1A2E', '--card-color': '#2C2C40', '--primary-color': '#6BE570', '--accent-color': '#4CAF50', '--text-light-color': '#E0E0E0', '--text-muted-color': '#A0A0A0', '--border-color': '#444455', '--add-btn-color': '#28a745', '--remove-btn-color': '#dc3545', '--error-color': '#D32F2F', '--success-color': '#4CAF50', '--primary-color-rgb': '107, 229, 112', '--accent-color-rgb': '76, 175, 80',
    },
    'blue': {
        '--bg-color': '#1A2A3E', '--card-color': '#2C3A4E', '--primary-color': '#4FC3F7', '--accent-color': '#2196F3', '--text-light-color': '#E0E0E0', '--text-muted-color': '#A0A0A0', '--border-color': '#3A4A5A', '--add-btn-color': '#1E88E5', '--remove-btn-color': '#dc3545', '--error-color': '#D32F2F', '--success-color': '#4CAF50', '--primary-color-rgb': '79, 195, 247', '--accent-color-rgb': '33, 150, 243',
    },
    'purple': {
        '--bg-color': '#2E1A3E', '--card-color': '#402C4E', '--primary-color': '#BB86FC', '--accent-color': '#9C27B0', '--text-light-color': '#E0E0E0', '--text-muted-color': '#A0A0A0', '--border-color': '#554455', '--add-btn-color': '#673AB7', '--remove-btn-color': '#dc3545', '--error-color': '#D32F2F', '--success-color': '#4CAF50', '--primary-color-rgb': '187, 134, 252', '--accent-color-rgb': '156, 39, 176',
    }
};

// Função para aplicar o tema
function setTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
        for (const [key, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(key, value);
        }
        localStorage.setItem('currentTheme', themeName);
        currentThemeName = themeName;
        console.log(`Tema '${themeName}' aplicado.`);
    } else {
        console.warn(`Tema '${themeName}' não encontrado.`);
    }
}

// Função para mostrar toasts
function mostrarToast(mensagem, tipo = "success") {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.className = "show";
        toast.innerText = mensagem;

        toast.style.backgroundColor = themes[currentThemeName]['--card-color'];
        toast.style.color = themes[currentThemeName]['--text-light-color'];

        if (tipo === "error") {
            toast.style.backgroundColor = themes.green['--error-color'];
        } else if (tipo === "success") {
            toast.style.backgroundColor = themes.green['--success-color'];
        } else if (tipo === "info") {
            toast.style.backgroundColor = themes[currentThemeName]['--accent-color'];
        }

        setTimeout(() => {
            toast.className = toast.className.replace("show", "");
            toast.style.backgroundColor = themes[currentThemeName]['--card-color'];
        }, 3000);
    } else {
        console.warn("Elemento Toast não encontrado. Mensagem:", mensagem);
        if (tipo === "error") {
            console.error(mensagem);
        } else {
            console.log(mensagem);
        }
    }
}

// Função para carregar a configuração do cliente do Firestore
async function loadClientConfig() {
    const urlParams = new URLSearchParams(window.location.search);
    let clientId = urlParams.get('clientId');

    if (!clientId) {
        // Se não houver clientId na URL, tenta pegar do localStorage (se salvo de uma sessão anterior)
        clientId = localStorage.getItem('currentClientId');
        if (!clientId) {
            console.error("Erro: clientId não encontrado na URL nem no localStorage. Usando 'defaultClient' como fallback.");
            clientId = 'defaultClient'; // Fallback para um cliente padrão
        }
    } else {
        localStorage.setItem('currentClientId', clientId); // Salva o clientId para futuras sessões
    }

    try {
        console.log(`Tentando carregar configuração para clientId: ${clientId} do Firestore.`);
        const docRef = db.collection("clientConfigs").doc(clientId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const config = docSnap.data();
            MOB_DATA_URL = config.mobDataUrl || 'https://raw.githubusercontent.com/Kronah/mob-data/refs/heads/main/dados.json'; // Fallback
            setTheme(config.theme || 'green'); // Fallback
            console.log(`Configuração para cliente '${clientId}' carregada do Firestore:`, config);
            mostrarToast(`Configuração para ${config.appName || clientId} carregada!`, "success");
        } else {
            console.warn(`Documento de configuração para clientId '${clientId}' não encontrado no Firestore. Usando configurações padrão.`);
            MOB_DATA_URL = 'https://raw.githubusercontent.com/Kronah/mob-data/refs/heads/main/dados.json';
            setTheme('green');
            mostrarToast(`Configuração para '${clientId}' não encontrada. Usando padrão.`, "info");
        }
    } catch (error) {
        console.error("Erro ao carregar configuração do cliente do Firestore:", error);
        mostrarToast(`Erro ao carregar configuração: ${error.message}. Verifique o console. Usando padrão.`, "error");
        // Fallback para configurações padrão em caso de erro
        MOB_DATA_URL = 'https://raw.githubusercontent.com/Kronah/mob-data/refs/heads/main/dados.json';
        setTheme('green');
    }
}


// Funções para carregar os dados dos mobs do GitHub
async function loadMobsData() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultadoDiv = document.getElementById('resultado'); 
    
    if (resultadoDiv) {
        resultadoDiv.innerHTML = '<h3>Resultados da Pesquisa:</h3><div id="loadingSpinner" class="spinner" style="display: block;"></div><p class="no-results">Carregando dados dos Mobs...</p>';
    }
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block'; 
    }
    console.log("Iniciando carregamento dos dados dos Mobs...");
    console.log("Tentando carregar de:", MOB_DATA_URL);

    try {
        const response = await fetch(MOB_DATA_URL);
        console.log("Resposta da requisição para dados.json:", response);

        if (!response.ok) {
            throw new Error(`Erro HTTP ao carregar dados: ${response.status} ${response.statusText}`);
        }
        
        allMobsData = await response.json();
        console.log("Dados dos Mobs carregados com sucesso:", allMobsData);
        console.log("Número de Mobs carregados:", allMobsData.length);

        mostrarToast("Dados dos Mobs carregados com sucesso!", "success");
        if (resultadoDiv) {
            resultadoDiv.innerHTML = '<h3>Resultados da Pesquisa:</h3><p class="no-results">Nenhum resultado para exibir ainda. Digite um nome e clique em buscar.</p>';
        }
    } catch (error) {
        console.error("Erro FATAL ao carregar dados dos Mobs:", error);
        mostrarToast(`Erro ao carregar dados: ${error.message}. Verifique o console.`, "error");
        if (resultadoDiv) {
            resultadoDiv.innerHTML = '<h3>Resultados da Pesquisa:</h3><p class="no-results" style="color: var(--error-color);">Erro ao carregar dados dos Mobs. Por favor, verifique sua conexão ou o link do arquivo.</p>';
        }
    } finally {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none'; 
        }
        console.log("Carregamento dos dados dos Mobs finalizado.");
    }
}

// Funções para gerenciar a lista de mobs selecionados
function loadSelectedMobs() {
    const storedMobs = localStorage.getItem('selectedMobs');
    if (storedMobs) {
        selectedMobs = JSON.parse(storedMobs);
    }
    updateSelectedMobCount();
    console.log("Mobs selecionados carregados:", selectedMobs);
}

function saveSelectedMobs() {
    localStorage.setItem('selectedMobs', JSON.stringify(selectedMobs));
    updateSelectedMobCount();
    console.log("Mobs selecionados salvos:", selectedMobs);
}

function updateSelectedMobCount() {
    const countSpan = document.getElementById('selectedMobCount');
    if (countSpan) {
        countSpan.innerText = selectedMobs.length;
    }
}

function isMobSelected(mobNumber) {
    if (mobNumber === null || mobNumber === undefined) return false;
    const selected = selectedMobs.some(mob => mob["Número"] === mobNumber);
    return selected;
}

function addMobToList(mobNumber) {
    if (mobNumber === null || mobNumber === undefined) {
        mostrarToast("Erro: Mob sem número de identificação.", "error");
        return;
    }
    const mobToAdd = allMobsData.find(mob => mob["Número"] === mobNumber);
    if (!mobToAdd) {
        mostrarToast("Erro: Mob não encontrado nos dados.", "error");
        return;
    }

    if (!isMobSelected(mobNumber)) {
        selectedMobs.push(mobToAdd);
        saveSelectedMobs();
        mostrarToast(`"${mobToAdd["Nome do Mob"]}" adicionado à lista!`, "success");
        buscarMob(document.getElementById('searchInput').value.trim()); 
        displaySelectedMobs(); 
    } else {
        mostrarToast(`"${mobToAdd["Nome do Mob"]}" já está na lista.`, "info");
    }
}

function removeMobFromList(mobNumber) {
    if (mobNumber === null || mobNumber === undefined) {
        mostrarToast("Erro: Mob sem número de identificação para remover.", "error");
        return;
    }
    const initialLength = selectedMobs.length;
    selectedMobs = selectedMobs.filter(mob => mob["Número"] !== mobNumber);
    if (selectedMobs.length < initialLength) {
        saveSelectedMobs();
        mostrarToast("Mob removido da lista.", "success");
        buscarMob(document.getElementById('searchInput').value.trim()); 
        displaySelectedMobs(); 
    }
}

function openSelectedMobsListPopup() {
    const overlay = document.getElementById('selectedMobsListOverlay');
    if (overlay) {
        overlay.style.display = 'flex'; 
        displaySelectedMobs(); 
    }
}

function closeSelectedMobsListPopup() {
    const overlay = document.getElementById('selectedMobsListOverlay');
    if (overlay) {
        overlay.style.display = 'none'; 
    }
}

function displaySelectedMobs() {
    const contentDiv = document.getElementById('selectedMobsContent');
    if (!contentDiv) return;

    contentDiv.innerHTML = ''; 

    if (selectedMobs.length === 0) {
        contentDiv.innerHTML = '<p class="no-items-message">Nenhum mob na sua lista ainda.</p>';
        return;
    }

    selectedMobs.forEach(mob => {
        const mobItem = document.createElement('div');
        mobItem.className = 'mob-item-list';
        mobItem.innerHTML = `
            <div>
                <p><strong>Nome:</strong> ${mob["Nome do Mob"] || 'N/A'}</p>
                <p><strong>Número:</strong> ${mob["Número"] !== null ? mob["Número"] : 'N/A'}</p>
                <p><strong>Pontos:</strong> ${mob["Pontos"] !== null ? mob["Pontos"] : 'N/A'}</p>
                <p><strong>Boss:</strong> ${mob["Arquivo"] || 'N/A'}</p>
            </div>
            <button class="remove-button" onclick="removeMobFromList(${mob["Número"]})">
                <i class="fas fa-minus"></i>
            </button>
        `;
        contentDiv.appendChild(mobItem);
    });
}

async function buscarMob(initialTerm = null) { 
    const searchInput = document.getElementById('searchInput');
    const termo = (initialTerm !== null) ? initialTerm.toLowerCase() : searchInput.value.trim().toLowerCase();
    const resultado = document.getElementById('resultado');
    const loadingSpinner = document.getElementById('loadingSpinner');

    resultado.innerHTML = '<h3>Resultados da Pesquisa:</h3>'; 

    if (!termo) {
        resultado.innerHTML += '<p class="no-results">Por favor, digite um nome de Mob para buscar.</p>';
        mostrarToast("Por favor, digite um nome para buscar.", "info");
        return;
    }

    if (allMobsData.length === 0) {
        resultado.innerHTML += '<p class="no-results">Dados dos Mobs ainda não carregados. Por favor, aguarde ou tente recarregar a página.</p>';
        mostrarToast("Dados dos Mobs não carregados. Aguarde ou recarregue.", "info");
        return;
    }

    if (loadingSpinner) {
        loadingSpinner.style.display = 'block'; 
    }
    mostrarToast(`Buscando por "${termo}"...`, "info");

    const foundMobs = allMobsData.filter(mob => 
        mob["Nome do Mob"] && mob["Nome do Mob"].toLowerCase().includes(termo) 
    );

    console.log("Found Mobs for term '" + termo + "':", foundMobs);

    await new Promise(resolve => setTimeout(resolve, 500)); 

    if (loadingSpinner) {
        loadingSpinner.style.display = 'none'; 
    }

    if (foundMobs.length > 0) {
        foundMobs.forEach(mob => {
            if (mob["Número"] === null || mob["Número"] === undefined) {
                console.warn(`Mob "${mob["Nome do Mob"]}" não possui um "Número" válido. Botões de ação não serão exibidos.`);
                resultado.innerHTML += `
                    <div class="mob-result-item">
                        <div>
                            <p><strong>Número:</strong> N/A</p>
                            <p><strong>Nome do Mob:</strong> ${mob["Nome do Mob"] || 'N/A'}</p>
                            <p><strong>Pontos:</strong> ${mob["Pontos"] !== null ? mob["Pontos"] : 'N/A'}</p>
                            <p><strong>Boss:</strong> N/A</p>
                        </div>
                        <div class="action-buttons">
                            </div>
                    </div>
                    <hr style="border-color: var(--border-color); margin: 10px 0;">
                `;
                return;
            }

            const isSelected = isMobSelected(mob["Número"]);
            console.log(`Processing mob: ${mob["Nome do Mob"]}, Number: ${mob["Número"]}, Is Selected: ${isSelected}`); 

            const buttonHtml = isSelected
                ? `<button class="remove-button" onclick="removeMobFromList(${mob["Número"]})"><i class="fas fa-minus"></i></button>`
                : `<button class="add-button" onclick="addMobToList(${mob["Número"]})"><i class="fas fa-plus"></i></button>`;

            const mobHtml = `
                <div class="mob-result-item">
                    <div>
                        <p><strong>Número:</strong> ${mob["Número"] !== null ? mob["Número"] : 'N/A'}</p>
                        <p><strong>Nome do Mob:</strong> ${mob["Nome do Mob"] || 'N/A'}</p>
                        <p><strong>Pontos:</strong> ${mob["Pontos"] !== null ? mob["Pontos"] : 'N/A'}</p>
                        <p><strong>Boss:</strong> ${mob["Arquivo"] || 'N/A'}</p>
                    </div>
                    <div class="action-buttons">
                        ${buttonHtml}
                    </div>
                </div>
                <hr style="border-color: var(--border-color); margin: 10px 0;">
            `;
            console.log("Generated HTML for mob:", mobHtml); 

            resultado.innerHTML += mobHtml;
        });
        mostrarToast(`Encontrados ${foundMobs.length} Mob(s)!`, "success");
    } else {
        resultado.innerHTML += '<p class="no-results">Nenhum Mob encontrado com esse nome.</p>';
        mostrarToast("Nenhum Mob encontrado.", "error");
    }
}


// Ao carregar a página, carrega o tema salvo, a configuração do cliente, os dados dos mobs e a lista de selecionados
window.onload = async () => {
    // Carrega a configuração do cliente ANTES de tudo
    await loadClientConfig(); 

    loadSelectedMobs(); 
    await loadMobsData(); 
};


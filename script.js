
// Sistema de Controle de Entregas v3.0
class SistemaEntregas {
    constructor() {
        this.entregas = [];
        this.metaQuinzenal = 200;
        this.valorBonificacao = 5.50;
        this.db = null;
        this.dbName = 'EntregasDB';
        this.dbVersion = 1;
        this.inicializar();
    }

    async inicializarDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB inicializado com sucesso');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar object store para entregas
                if (!db.objectStoreNames.contains('entregas')) {
                    const store = db.createObjectStore('entregas', { keyPath: 'id' });
                    store.createIndex('data', 'data', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('📦 Object store "entregas" criado');
                }
                
                // Criar object store para configurações
                if (!db.objectStoreNames.contains('configuracoes')) {
                    db.createObjectStore('configuracoes', { keyPath: 'chave' });
                    console.log('⚙️ Object store "configuracoes" criado');
                }
            };
        });
    }

    async carregarDados() {
        if (!this.db) {
            console.warn('Database não inicializado, usando dados vazios');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entregas'], 'readonly');
            const store = transaction.objectStore('entregas');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const entregas = request.result || [];
                console.log(`📂 ${entregas.length} entregas carregadas do IndexedDB`);
                resolve(entregas);
            };
            
            request.onerror = () => {
                console.error('Erro ao carregar dados do IndexedDB');
                reject(request.error);
            };
        });
    }

    async salvarDados() {
        if (!this.db) {
            console.warn('Database não inicializado, usando localStorage como fallback');
            localStorage.setItem('entregasv3-fallback', JSON.stringify(this.entregas));
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entregas'], 'readwrite');
            const store = transaction.objectStore('entregas');
            
            // Limpar dados existentes
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Adicionar todas as entregas
                this.entregas.forEach(entrega => {
                    store.add(entrega);
                });
                
                transaction.oncomplete = () => {
                    console.log(`💾 ${this.entregas.length} entregas salvas no IndexedDB`);
                    // Backup no localStorage também
                    localStorage.setItem('entregasv3-backup', JSON.stringify(this.entregas));
                    resolve();
                };
                
                transaction.onerror = () => {
                    console.error('Erro ao salvar dados no IndexedDB');
                    // Fallback para localStorage
                    localStorage.setItem('entregasv3-fallback', JSON.stringify(this.entregas));
                    reject(transaction.error);
                };
            };
        });
    }

    async migrarLocalStorage() {
        // Migrar dados do localStorage para IndexedDB se existirem
        const dadosLocalStorage = localStorage.getItem('entregasv2');
        if (dadosLocalStorage) {
            try {
                const entregas = JSON.parse(dadosLocalStorage);
                this.entregas = entregas;
                await this.salvarDados();
                localStorage.removeItem('entregasv2');
                console.log('🔄 Dados migrados do localStorage para IndexedDB');
                this.mostrarNotificacao('Dados migrados para armazenamento offline!', 'info');
            } catch (error) {
                console.error('Erro na migração:', error);
            }
        }
    }

    async inicializar() {
        try {
            await this.inicializarDB();
            await this.migrarLocalStorage();
            this.entregas = await this.carregarDados();
            this.definirDataAtual();
            this.atualizarInterface();
            this.atualizarHistorico();
            this.atualizarRelatorio();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.mostrarNotificacao('Erro ao carregar dados. Usando modo fallback.', 'error');
            // Fallback para localStorage em caso de erro
            const dados = localStorage.getItem('entregasv2');
            this.entregas = dados ? JSON.parse(dados) : [];
            this.definirDataAtual();
            this.atualizarInterface();
            this.atualizarHistorico();
            this.atualizarRelatorio();
        }
    }

    definirDataAtual() {
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('dataEntrega').value = hoje;
    }

    async adicionarEntrega() {
        const data = document.getElementById('dataEntrega').value;
        const quantidade = parseInt(document.getElementById('quantidadeEntrega').value);

        if (!data || !quantidade || quantidade <= 0) {
            this.mostrarModal('Erro', 'Por favor, preencha todos os campos corretamente.');
            return;
        }

        // Verificar se já existe entrega nesta data
        const entregaExistente = this.entregas.find(e => e.data === data);
        
        if (entregaExistente) {
            entregaExistente.quantidade += quantidade;
        } else {
            this.entregas.push({
                id: Date.now(),
                data: data,
                quantidade: quantidade,
                timestamp: new Date().toISOString()
            });
        }

        this.entregas.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        try {
            await this.salvarDados();
            this.mostrarNotificacao('Entrega registrada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.mostrarNotificacao('Entrega registrada (dados salvos localmente)', 'info');
            // Fallback para localStorage
            localStorage.setItem('entregasv2', JSON.stringify(this.entregas));
        }
        
        this.atualizarInterface();
        this.atualizarHistorico();
        this.atualizarRelatorio();

        // Limpar campos
        document.getElementById('quantidadeEntrega').value = '';
    }

    removerEntrega(id) {
        this.mostrarModal(
            'Confirmar Exclusão',
            'Tem certeza que deseja remover esta entrega?',
            async () => {
                this.entregas = this.entregas.filter(e => e.id !== id);
                
                try {
                    await this.salvarDados();
                    this.mostrarNotificacao('Entrega removida com sucesso!', 'info');
                } catch (error) {
                    console.error('Erro ao salvar:', error);
                    this.mostrarNotificacao('Entrega removida (salvo localmente)', 'info');
                    // Fallback para localStorage
                    localStorage.setItem('entregasv2', JSON.stringify(this.entregas));
                }
                
                this.atualizarInterface();
                this.atualizarHistorico();
                this.atualizarRelatorio();
            }
        );
    }

    obterDataSemana() {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        return primeiroDia.toISOString().split('T')[0];
    }

    obterDataQuinzena() {
        const hoje = new Date();
        const dia = hoje.getDate();
        let inicioQuinzena;
        
        if (dia <= 15) {
            inicioQuinzena = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        } else {
            inicioQuinzena = new Date(hoje.getFullYear(), hoje.getMonth(), 16);
        }
        
        return inicioQuinzena.toISOString().split('T')[0];
    }

    obterDataMes() {
        const hoje = new Date();
        return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    }

    calcularEntregasPeriodo(dataInicio) {
        const hoje = new Date().toISOString().split('T')[0];
        return this.entregas
            .filter(e => e.data >= dataInicio && e.data <= hoje)
            .reduce((total, e) => total + e.quantidade, 0);
    }

    atualizarInterface() {
        // Estatísticas principais
        const totalEntregas = this.entregas.reduce((total, e) => total + e.quantidade, 0);
        document.getElementById('totalEntregas').textContent = totalEntregas;

        // Entregas por período
        const entregasSemanal = this.calcularEntregasPeriodo(this.obterDataSemana());
        const entregasQuinzenal = this.calcularEntregasPeriodo(this.obterDataQuinzena());
        const entregasMensal = this.calcularEntregasPeriodo(this.obterDataMes());

        document.getElementById('entregasSemanal').textContent = entregasSemanal;
        document.getElementById('entregasQuinzenal').textContent = entregasQuinzenal;
        document.getElementById('entregasMensal').textContent = entregasMensal;

        // Meta quinzenal
        const faltamMeta = Math.max(0, this.metaQuinzenal - entregasQuinzenal);
        const excedente = Math.max(0, entregasQuinzenal - this.metaQuinzenal);
        const bonificacaoQuinzenal = excedente * this.valorBonificacao;

        document.getElementById('faltamMeta').textContent = faltamMeta > 0 ? `${faltamMeta} entregas` : 'Meta atingida!';
        document.getElementById('excedente').textContent = `${excedente} entregas`;
        document.getElementById('bonificacaoQuinzenal').textContent = `R$ ${bonificacaoQuinzenal.toFixed(2)}`;

        // Progresso da quinzena
        const progresso = Math.min(100, (entregasQuinzenal / this.metaQuinzenal) * 100);
        document.getElementById('progressoQuinzena').style.width = `${progresso}%`;
        document.getElementById('progressoTexto').textContent = `${entregasQuinzenal} / ${this.metaQuinzenal}`;

        // Bonificação total
        const bonificacaoTotal = this.calcularBonificacaoTotal();
        document.getElementById('bonificacaoTotal').textContent = `R$ ${bonificacaoTotal.toFixed(2)}`;
    }

    calcularBonificacaoTotal() {
        // Agrupar entregas por quinzena
        const quinzenas = new Map();
        
        this.entregas.forEach(entrega => {
            const data = new Date(entrega.data);
            const ano = data.getFullYear();
            const mes = data.getMonth();
            const dia = data.getDate();
            const quinzena = dia <= 15 ? 1 : 2;
            const chave = `${ano}-${mes}-${quinzena}`;
            
            if (!quinzenas.has(chave)) {
                quinzenas.set(chave, 0);
            }
            quinzenas.set(chave, quinzenas.get(chave) + entrega.quantidade);
        });

        let bonificacaoTotal = 0;
        quinzenas.forEach(total => {
            if (total > this.metaQuinzenal) {
                bonificacaoTotal += (total - this.metaQuinzenal) * this.valorBonificacao;
            }
        });

        return bonificacaoTotal;
    }

    atualizarHistorico() {
        const container = document.getElementById('historicoLista');
        
        if (this.entregas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhuma entrega registrada ainda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.entregas.map(entrega => `
            <div class="historico-item">
                <span>${this.formatarData(entrega.data)}</span>
                <span>${entrega.quantidade} entregas</span>
                <button onclick="sistema.removerEntrega(${entrega.id})" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    atualizarRelatorio() {
        const entregasMes = this.calcularEntregasPeriodo(this.obterDataMes());
        const diasTrabalhados = new Set(
            this.entregas
                .filter(e => e.data >= this.obterDataMes())
                .map(e => e.data)
        ).size;
        
        const mediaDiaria = diasTrabalhados > 0 ? (entregasMes / diasTrabalhados).toFixed(1) : 0;
        
        // Encontrar melhor dia
        const entregasPorDia = {};
        this.entregas
            .filter(e => e.data >= this.obterDataMes())
            .forEach(e => {
                if (!entregasPorDia[e.data]) {
                    entregasPorDia[e.data] = 0;
                }
                entregasPorDia[e.data] += e.quantidade;
            });

        let melhorDia = '-';
        let maiorQuantidade = 0;
        Object.entries(entregasPorDia).forEach(([data, quantidade]) => {
            if (quantidade > maiorQuantidade) {
                maiorQuantidade = quantidade;
                melhorDia = `${this.formatarData(data)} (${quantidade})`;
            }
        });

        const totalBonificacoes = this.calcularBonificacaoTotal();

        document.getElementById('mediaDiaria').textContent = mediaDiaria;
        document.getElementById('melhorDia').textContent = melhorDia;
        document.getElementById('totalBonificacoes').textContent = `R$ ${totalBonificacoes.toFixed(2)}`;
        document.getElementById('diasTrabalhados').textContent = diasTrabalhados;
    }

    formatarData(data) {
        const date = new Date(data + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    mostrarModal(titulo, mensagem, callback = null) {
        document.getElementById('modalTitulo').textContent = titulo;
        document.getElementById('modalMensagem').textContent = mensagem;
        
        const modal = document.getElementById('modal');
        const confirmarBtn = document.getElementById('modalConfirmar');
        
        if (callback) {
            confirmarBtn.style.display = 'block';
            confirmarBtn.onclick = () => {
                callback();
                this.fecharModal();
            };
        } else {
            confirmarBtn.style.display = 'none';
        }
        
        modal.style.display = 'block';
    }

    fecharModal() {
        document.getElementById('modal').style.display = 'none';
    }

    mostrarNotificacao(mensagem, tipo = 'success') {
        // Criar elemento de notificação
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao notificacao-${tipo}`;
        
        let icone = 'check-circle';
        let corFundo = '#d4edda';
        let corTexto = '#155724';
        let corBorda = '#28a745';
        
        if (tipo === 'info') {
            icone = 'info-circle';
            corFundo = '#d1ecf1';
            corTexto = '#0c5460';
            corBorda = '#17a2b8';
        } else if (tipo === 'error') {
            icone = 'exclamation-circle';
            corFundo = '#f8d7da';
            corTexto = '#721c24';
            corBorda = '#dc3545';
        }
        
        notificacao.innerHTML = `
            <i class="fas fa-${icone}"></i>
            ${mensagem}
        `;
        
        // Adicionar estilos
        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${corFundo};
            color: ${corTexto};
            padding: 15px 20px;
            border-radius: 10px;
            border-left: 4px solid ${corBorda};
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 350px;
        `;
        
        document.body.appendChild(notificacao);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notificacao.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notificacao.remove(), 300);
        }, 3000);
    }

    // Função para exportar dados como backup
    exportarDados() {
        const dados = {
            entregas: this.entregas,
            exportadoEm: new Date().toISOString(),
            versao: '3.0'
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `entregas-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.mostrarNotificacao('Backup exportado com sucesso!', 'success');
    }

    // Função para limpar dados antigos (manter apenas últimos 6 meses)
    async limparDadosAntigos() {
        const seiseMesesAtras = new Date();
        seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
        const dataLimite = seiseMesesAtras.toISOString().split('T')[0];
        
        const entregasOriginais = this.entregas.length;
        this.entregas = this.entregas.filter(e => e.data >= dataLimite);
        
        if (entregasOriginais > this.entregas.length) {
            await this.salvarDados();
            this.atualizarInterface();
            this.atualizarHistorico();
            this.atualizarRelatorio();
            
            const removidas = entregasOriginais - this.entregas.length;
            this.mostrarNotificacao(`${removidas} entregas antigas removidas para otimizar armazenamento`, 'info');
        }
    }
}

// Funções globais
async function adicionarEntrega() {
    await sistema.adicionarEntrega();
}

function fecharModal() {
    sistema.fecharModal();
}

// Inicializar sistema
const sistema = new SistemaEntregas();

// Adicionar estilos para notificações
const styles = document.createElement('style');
styles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styles);

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Enter para adicionar entrega
    document.getElementById('quantidadeEntrega').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adicionarEntrega();
        }
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            fecharModal();
        }
    });
    
    // Criar indicadores de status
    const offlineIndicator = document.createElement('div');
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Você está offline. Dados salvos na memória do celular.';
    document.body.appendChild(offlineIndicator);
    
    // Indicador de conexão no header
    const connectionStatus = document.createElement('div');
    connectionStatus.className = 'connection-status';
    document.body.appendChild(connectionStatus);
    
    // Indicador de armazenamento
    const storageIndicator = document.createElement('div');
    storageIndicator.className = 'storage-indicator';
    document.body.appendChild(storageIndicator);
    
    // Detectar mudanças de conexão
    async function atualizarStatusConexao() {
        if (navigator.onLine) {
            offlineIndicator.classList.remove('show');
            connectionStatus.innerHTML = '<i class="fas fa-wifi"></i> Online';
            connectionStatus.classList.remove('offline');
            console.log('🌐 Conexão restaurada');
        } else {
            offlineIndicator.classList.add('show');
            connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            connectionStatus.classList.add('offline');
            console.log('📱 Modo offline ativado');
        }
        
        // Atualizar indicador de armazenamento
        await atualizarIndicadorArmazenamento();
    }
    
    // Função para mostrar uso de armazenamento
    async function atualizarIndicadorArmazenamento() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
                const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
                
                storageIndicator.innerHTML = `<i class="fas fa-database"></i> ${usedMB}MB/${quotaMB}MB`;
            } else {
                storageIndicator.innerHTML = '<i class="fas fa-database"></i> Dados salvos localmente';
            }
        } catch (error) {
            storageIndicator.innerHTML = '<i class="fas fa-database"></i> Armazenamento ativo';
        }
    }
    
    window.addEventListener('online', atualizarStatusConexao);
    window.addEventListener('offline', atualizarStatusConexao);
    
    // Verificar status inicial
    atualizarStatusConexao();
    
    // Atualizar indicador de armazenamento a cada 30 segundos
    setInterval(atualizarIndicadorArmazenamento, 30000);
});

console.log('🚚 Sistema v3.0 carregado com as cores azul, vermelho e branco!');

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', {
            scope: './'
        })
            .then((registration) => {
                console.log('✅ Service Worker registrado com sucesso:', registration.scope);
                
                // Verificar se há atualizações
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('🔄 Nova versão disponível');
                                if (window.sistema) {
                                    sistema.mostrarNotificacao('Nova versão disponível! Recarregue a página.', 'info');
                                }
                            }
                        });
                    }
                });
            })
            .catch((error) => {
                console.error('❌ Falha ao registrar Service Worker:', error);
                console.error('Detalhes do erro:', error.message);
            });
    });
}

// Adicionar evento para instalação da PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 PWA pode ser instalada');
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botão de instalação customizado
    mostrarBotaoInstalar();
});

function mostrarBotaoInstalar() {
    const botaoInstalar = document.createElement('button');
    botaoInstalar.className = 'btn-primary';
    botaoInstalar.innerHTML = '<i class="fas fa-download"></i> Instalar App';
    botaoInstalar.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        animation: pulseAzulVermelho 2s infinite;
    `;
    
    botaoInstalar.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`📱 Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} instalar a PWA`);
            deferredPrompt = null;
            botaoInstalar.remove();
        }
    });
    
    document.body.appendChild(botaoInstalar);
    
    // Remover botão após 10 segundos se não for clicado
    setTimeout(() => {
        if (botaoInstalar.parentNode) {
            botaoInstalar.remove();
        }
    }, 10000);
}

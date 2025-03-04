// Função para carregar os cupons armazenados no LocalStorage
function carregarCupons() {
    const cupons = JSON.parse(localStorage.getItem('cupons')) || [];
    const listaCupons = document.getElementById('lista-cupons');
    listaCupons.innerHTML = '';

    cupons.forEach((cupom, index) => {
        listaCupons.innerHTML += `
            <div>
                <p>Valor: ${cupom.valor} - Método: ${cupom.metodo}</p>
                <button onclick="removerCupom(${index})">Remover</button>
            </div>
        `;
    });
}

// Função para adicionar um cupom
function adicionarCupom() {
    const valor = parseFloat(document.getElementById('valor-cupom').value);
    const metodo = document.getElementById('metodo-cupom').value;

    if (!valor || valor <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    const cupons = JSON.parse(localStorage.getItem('cupons')) || [];
    cupons.push({ valor, metodo });
    localStorage.setItem('cupons', JSON.stringify(cupons));

    carregarCupons();
}

// Função para calcular os totais
function calcular() {
    const cupons = JSON.parse(localStorage.getItem('cupons')) || [];
    let totalDinheiro = 0;
    let totalCartao = 0;

    cupons.forEach(cupom => {
        if (cupom.metodo === 'dinheiro') {
            totalDinheiro += cupom.valor;
        } else if (cupom.metodo === 'cartao') {
            totalCartao += cupom.valor;
        }
    });

    document.getElementById('total-dinheiro').textContent = totalDinheiro.toFixed(2);
    document.getElementById('total-cartao').textContent = totalCartao.toFixed(2);
}

// Função para limpar tudo
function limparTudo() {
    localStorage.removeItem('cupons');
    carregarCupons();
    document.getElementById('total-dinheiro').textContent = '0';
    document.getElementById('total-cartao').textContent = '0';
}

// Função para remover um cupom específico
function removerCupom(index) {
    const cupons = JSON.parse(localStorage.getItem('cupons')) || [];
    cupons.splice(index, 1);
    localStorage.setItem('cupons', JSON.stringify(cupons));
    carregarCupons();
}

// Carrega os cupons ao iniciar
document.addEventListener('DOMContentLoaded', carregarCupons);
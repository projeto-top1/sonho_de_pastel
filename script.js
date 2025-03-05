const saldoSpan = document.getElementById("saldo");
const contasPrestarSpan = document.getElementById("contas-prestar");
const pedidosSpan = document.getElementById("pedidos");
let saldoAtual = 150.00;

// Carrega valores persistentes do localStorage
let pedidosEntregues = parseInt(localStorage.getItem("pedidosEntregues")) || 0;
let ultimaData = localStorage.getItem("ultimaData") || new Date().toLocaleDateString();

// Atualiza contador inicial de pedidos, considerando o reset diário
atualizarContadorPedidos();

// Função para atualizar contador de pedidos com reset diário
function atualizarContadorPedidos() {
  const dataAtual = new Date().toLocaleDateString();

  if (dataAtual !== ultimaData) {
    pedidosEntregues = 0;
    ultimaData = dataAtual;
    localStorage.setItem("ultimaData", ultimaData);
  }

  pedidosSpan.textContent = pedidosEntregues;
}

document.getElementById("adicionar").addEventListener("click", () => {
  const valorRecebido = parseFloat(document.getElementById("valor-recebido").value) || 0;
  const valorGasto = parseFloat(document.getElementById("valor-gasto").value) || 0;

  saldoAtual += valorRecebido - valorGasto;
  saldoSpan.textContent = saldoAtual.toFixed(2);

  // Calcula o valor a prestar contas apenas se exceder os 150 reais
  const excedente = saldoAtual > 150 ? saldoAtual - 150 : 0;
  contasPrestarSpan.textContent = excedente.toFixed(2);

  document.getElementById("valor-recebido").value = "";
  document.getElementById("valor-gasto").value = "";
});

document.getElementById("adicionar-pedido").addEventListener("click", () => {
  pedidosEntregues += 1;
  pedidosSpan.textContent = pedidosEntregues;

  // Armazena o contador de pedidos no localStorage
  localStorage.setItem("pedidosEntregues", pedidosEntregues);
});

document.getElementById("redefinir").addEventListener("click", () => {
  saldoAtual = 150.00;
  saldoSpan.textContent = saldoAtual.toFixed(2);
  contasPrestarSpan.textContent = "0.00";

  // Os pedidos entregues não são alterados
});
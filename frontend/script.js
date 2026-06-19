document.addEventListener("DOMContentLoaded", () => {
  
  // =========================
  // SELEÇÃO DE CHIPS (NICHO E ESTILO)
  // =========================
  setupChips("#niche-chips");
  setupChips("#style-chips");

  function setupChips(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });
  }

  // =========================
  // SELEÇÃO DE PLANOS
  // =========================
  const plans = document.querySelectorAll(".plan");

  plans.forEach((plan) => {
    plan.addEventListener("click", () => {
      plans.forEach((item) => item.classList.remove("active"));
      plan.classList.add("active");
      updateCheckout();
    });
  });

  // =========================
  // ATUALIZAÇÃO DO CHECKOUT
  // =========================
  function updateCheckout() {
    const checkoutCard = document.querySelector(".checkout-card");
    const activePlan = document.querySelector(".plan.active");
    
    if (!checkoutCard || !activePlan) return;

    const quantity = activePlan.getAttribute("data-quantity");
    const price = activePlan.getAttribute("data-price");

    checkoutCard.innerHTML = `
      <h3>Resumo do pedido</h3>
      <p>Plano selecionado: <strong>${quantity}</strong></p>
      <p>Entrega: <strong>Imediata via IA</strong></p>
      <h2>${price}</h2>
    `;
  }

  // Inicializa o checkout com o plano padrão ativo
  updateCheckout();

  // =========================
  // ENVIO DO FORMULÁRIO (BOTÃO DE PAGAMENTO)
  // =========================
  const payButton = document.querySelector(".pay-button");

  payButton.addEventListener("click", () => {
    const activeNicheBtn = document.querySelector("#niche-chips button.active");
    const activeStyleBtn = document.querySelector("#style-chips button.active");
    const titleInput = document.getElementById("main-title");
    const activePlan = document.querySelector(".plan.active");

    const niche = activeNicheBtn ? activeNicheBtn.getAttribute("data-value") : "";
    const style = activeStyleBtn ? activeStyleBtn.getAttribute("data-value") : "";
    const title = titleInput ? titleInput.value.trim() : "";

    // Validação
    if (!niche || !style || title === "") {
      alert("Por favor, preencha todos os campos e digite um título principal.");
      return;
    }

    if (!activePlan) {
      alert("Por favor, selecione um plano.");
      return;
    }

    const quantity = activePlan.getAttribute("data-quantity");
    const price = activePlan.getAttribute("data-price");

    // Montagem do Payload
    const payload = {
      niche,
      style,
      title,
      quantity,
      price
    };

    console.log("DADOS ENVIADOS PARA O BACKEND:");
    console.log(payload);

    alert(`Sucesso! Enviando seu pedido de ${quantity} no estilo ${style}. Próximo passo: Integração de Pagamento.`);
  });

});
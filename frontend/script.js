document.addEventListener("DOMContentLoaded", () => {
  
  // =========================
  // EFEITO MÁQUINA DE ESCREVER (TYPING EFFECT)
  // =========================
  const textElement = document.querySelector(".dynamic-text");
  // Lista de frases/palavras que vão alternar no meio do seu título
  const words = ["posts que vendem", "imagens exclusivas", "designs premium"];
  
  let wordIndex = 0;
  let charIndex = words[wordIndex].length; // Começa com a primeira palavra cheia
  let isDeleting = true; // Começa apagando para fazer o loop
  let typeSpeed = 100;

  function typeEffect() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      // Remove uma letra
      charIndex--;
      typeSpeed = 50; // Velocidade de apagar é mais rápida
    } else {
      // Adiciona uma letra
      charIndex++;
      typeSpeed = 100; // Velocidade de digitação
    }

    // Injeta o pedaço de texto atual no HTML
    textElement.textContent = currentWord.substring(0, charIndex);

    // Se terminou de digitar a palavra inteira
    if (!isDeleting && charIndex === currentWord.length) {
      typeSpeed = 2000; // Pausa de 2 segundos após terminar de digitar
      isDeleting = true;
    } 
    // Se terminou de apagar a palavra inteira
    else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length; // Passa para a próxima palavra
      typeSpeed = 500; // Pausa curta antes de começar a digitar a nova
    }

    setTimeout(typeEffect, typeSpeed);
  }

  // Inicia o efeito após 1 segundo que a página carregar
  setTimeout(typeEffect, 1000);

  // =========================
  // CARROSSEL AUTOMÁTICO
  // =========================
  const track = document.querySelector(".carousel-track");
  const dots = document.querySelectorAll(".carousel-indicators .dot");
  let currentIndex = 0;
  const totalSlides = 3;

  function updateCarousel(index) {
    if (!track) return;
    track.style.transform = `translateX(-${index * 33.333}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  setInterval(() => {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateCarousel(currentIndex);
  }, 4000);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentIndex = index;
      updateCarousel(currentIndex);
    });
  });

  // =========================
  // SELEÇÃO DE CHIPS
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
  // SELEÇÃO DE PLANOS CORRIGIDA
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
  // ATUALIZAÇÃO DO CHECKOUT (CORREÇÃO DO NULL)
  // =========================
  function updateCheckout() {
    const activePlan = document.querySelector(".plan.active");
    const qtyElement = document.getElementById("checkout-quantity");
    const priceElement = document.getElementById("checkout-price");
    
    if (!activePlan || !qtyElement || !priceElement) return;

    // CORREÇÃO: Buscando agora dentro de .plan-info para evitar o valor null
    const rawQuantity = activePlan.querySelector(".plan-info strong").innerText;
    const price = activePlan.querySelector(".plan-info span").innerText;

    // Trata o texto (ex: "3 Posts" vira "3 imagens" como no mockup)
    const quantityFormatted = rawQuantity.toLowerCase().replace("posts", "imagens");

    // Injeta nos lugares certos do novo layout
    qtyElement.innerText = quantityFormatted;
    priceElement.innerText = price;
  }

  // Inicializa o estado do checkout
  updateCheckout();
// =========================
  // ENVIO DO FORMULÁRIO (ATUALIZADO)
  // =========================
  const payButton = document.querySelector(".pay-button");

  payButton.addEventListener("click", () => {
    // Dados de Configuração
    const activeNicheBtn = document.querySelector("#niche-chips button.active");
    const activeStyleBtn = document.querySelector("#style-chips button.active");
    const titleInput = document.getElementById("main-title");
    const activePlan = document.querySelector(".plan.active");

    // Novos Campos de Dados do Cliente
    const instagramInput = document.getElementById("client-instagram");
    const whatsappInput = document.getElementById("client-whatsapp");
    const emailInput = document.getElementById("client-email");

    const niche = activeNicheBtn ? activeNicheBtn.getAttribute("data-value") : "";
    const style = activeStyleBtn ? activeStyleBtn.getAttribute("data-value") : "";
    const title = titleInput ? titleInput.value.trim() : "";

    const instagram = instagramInput ? instagramInput.value.trim() : "";
    const whatsapp = whatsappInput ? whatsappInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";

    // Validação de Configuração do Post
    if (!niche || !style || title === "") {
      alert("Por favor, preencha o nicho, estilo visual e o título principal do post.");
      return;
    }

    // Validação dos Dados de Contato do Cliente
    if (instagram === "" || whatsapp === "" || email === "") {
      alert("Por favor, preencha seus dados de contato (Instagram, WhatsApp e E-mail) para podermos garantir o suporte e entrega das imagens.");
      return;
    }

    if (!activePlan) {
      alert("Por favor, selecione um pacote.");
      return;
    }

    const quantity = activePlan.querySelector(".plan-info strong").innerText;
    const price = activePlan.querySelector(".plan-info span").innerText;

    // Payload Completo pronto para a API/SaaS
    const payload = {
      config: { niche, style, title },
      client: { instagram, whatsapp, email },
      purchase: { quantity, price }
    };

    console.log("PAYLOAD COMPLETO PARA O BACKEND:");
    console.log(payload);

    alert(`Perfeito! Dados validados. Enviando pedido de ${quantity} para o checkout seguro.`);
  });
});
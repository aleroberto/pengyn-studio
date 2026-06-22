document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================================================
  // 1. EFEITO MÁQUINA DE ESCREVER (TYPING EFFECT)
  // ==========================================================================
  const textElement = document.querySelector(".dynamic-text");
  const words = ["posts que vendem", "imagens exclusivas", "designs premium"];
  
  let wordIndex = 0;
  let charIndex = words[wordIndex].length;
  let isDeleting = true;
  let typeSpeed = 100;

  function typeEffect() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      charIndex--;
      typeSpeed = 50;
    } else {
      charIndex++;
      typeSpeed = 100;
    }

    if (textElement) {
      textElement.textContent = currentWord.substring(0, charIndex);
    }

    if (!isDeleting && charIndex === currentWord.length) {
      typeSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 500;
    }

    setTimeout(typeEffect, typeSpeed);
  }

  setTimeout(typeEffect, 1000);

  // ==========================================================================
  // 2. VALIDAÇÃO DE SINTAXE DO INSTAGRAM EM TEMPO REAL
  // ==========================================================================
  const instagramInput = document.getElementById("client-instagram");

  if (instagramInput) {
    instagramInput.addEventListener("blur", async () => {
      const usernameValue = instagramInput.value.trim();
      if (!usernameValue) return;

      try {
        const response = await fetch("https://pengyn-studio-api.vercel.app/api/v1/validate-instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usernameValue })
        });

        if (!response.ok) throw new Error("Erro na comunicação com o servidor.");

        const data = await response.json();
        removeInstagramError();

        if (data.valid === false) {
          applyInstagramError(data.message);
        } else {
          applyInstagramSuccess(data.username);
        }

      } catch (error) {
        console.error("Falha ao validar perfil:", error);
      }
    });
  }

  function applyInstagramError(message) {
    if (!instagramInput) return;
    removeInstagramError(); // Limpa erros antigos para evitar duplicação visual no DOM

    instagramInput.style.borderColor = "#EF4444";
    instagramInput.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.15)";
    
    const errorText = document.createElement("span");
    errorText.className = "input-error-msg";
    errorText.innerText = message;
    errorText.style.color = "#EF4444";
    errorText.style.fontSize = "0.8rem";
    errorText.style.marginTop = "4px";
    errorText.style.display = "block";
    
    instagramInput.parentNode.appendChild(errorText);
  }

  function applyInstagramSuccess(cleanUsername) {
    if (!instagramInput) return;
    instagramInput.style.borderColor = "#10B981";
    instagramInput.style.boxShadow = "0 0 0 2px rgba(16, 185, 129, 0.15)";
    instagramInput.value = `@${cleanUsername}`;
  }

  function removeInstagramError() {
    if (!instagramInput) return;
    instagramInput.style.borderColor = "var(--border)";
    instagramInput.style.boxShadow = "none";
    const oldMsg = instagramInput.parentNode.querySelector(".input-error-msg");
    if (oldMsg) oldMsg.remove();
  }
  
  // ==========================================================================
  // 3. MÁSCARA E VALIDAÇÃO DO WHATSAPP EM TEMPO REAL
  // ==========================================================================
  const whatsappInput = document.getElementById("client-whatsapp");

  if (whatsappInput) {
    whatsappInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");

      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})$/, "($1");
      }

      e.target.value = value;
    });
  }

  // ==========================================================================
  // 4. CARROSSEL AUTOMÁTICO
  // ==========================================================================
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

  // ==========================================================================
  // 5. SELEÇÃO DE CHIPS
  // ==========================================================================
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

  // ==========================================================================
  // 6. SELEÇÃO E ATUALIZAÇÃO DE PLANOS
  // ==========================================================================
  const plans = document.querySelectorAll(".plan");

  plans.forEach((plan) => {
    plan.addEventListener("click", () => {
      plans.forEach((item) => item.classList.remove("active"));
      plan.classList.add("active");
      updateCheckout();
    });
  });

  function updateCheckout() {
    const activePlan = document.querySelector(".plan.active");
    const qtyElement = document.getElementById("checkout-quantity");
    const priceElement = document.getElementById("checkout-price");
    
    if (!activePlan || !qtyElement || !priceElement) return;

    const rawQuantity = activePlan.querySelector(".plan-info strong").innerText;
    const price = activePlan.querySelector(".plan-info span").innerText;
    const quantityFormatted = rawQuantity.toLowerCase().replace("posts", "imagens");

    qtyElement.innerText = quantityFormatted;
    priceElement.innerText = price;
  }

  updateCheckout();

  // ==========================================================================
  // 7. DISPARO DO CHECKOUT PARA O BACKEND FASTAPI (UNIFICADO)
  // ==========================================================================
  const payButton = document.querySelector(".pay-button");

  if (payButton) {
    payButton.addEventListener("click", async (e) => {
      e.preventDefault();

      // Captura dos elementos do DOM
      const activeNicheBtn = document.querySelector("#niche-chips button.active");
      const activeStyleBtn = document.querySelector("#style-chips button.active");
      const titleInput = document.getElementById("main-title");
      const activePlan = document.querySelector(".plan.active");

      const instagramVal = document.getElementById("client-instagram")?.value.trim();
      const whatsappVal = document.getElementById("client-whatsapp")?.value.trim();
      const emailVal = document.getElementById("client-email")?.value.trim();

      const niche = activeNicheBtn ? activeNicheBtn.innerText : "Geral";
      const style = activeStyleBtn ? activeStyleBtn.innerText : "Premium Professional";
      const title = titleInput ? titleInput.value.trim() : "Post Gerado via IA";

      // Validações de segurança antes do fetch
      if (!activeNicheBtn || !activeStyleBtn || title === "") {
        alert("Por favor, preencha o nicho, estilo visual e o título do post.");
        return;
      }

      if (!instagramVal || !whatsappVal || !emailVal) {
        alert("Por favor, preencha todos os seus dados de contato.");
        return;
      }

      if (!activePlan) {
        alert("Por favor, selecione um plano.");
        return;
      }

      const planQuantity = activePlan.querySelector(".plan-info strong").innerText;
      const planPrice = activePlan.querySelector(".plan-info span").innerText;

      // Desabilita UI durante o processamento
      payButton.disabled = true;
      payButton.innerText = "Processando pedido...";

      const checkoutPayload = {
        config: { niche, style, title },
        client: { instagram: instagramVal, whatsapp: whatsappVal, email: emailVal },
        purchase: { quantity: planQuantity, price: planPrice }
      };

      console.log("ENVIANDO REQUISIÇÃO REAL PARA O FASTAPI:", checkoutPayload);

      try {
        const response = await fetch("https://pengyn-studio-api.vercel.app/api/v1/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutPayload)
        });

        if (!response.ok) throw new Error("Erro ao registrar intenção de compra no servidor.");

        const result = await response.json();
        console.log("Resposta do Checkout do Servidor:", result);

        if (result.success) {
          alert(`Cobrança Pix criada com sucesso!\n\nCódigo Copia e Cola:\n${result.pix_code}`);
        }

      } catch (error) {
        console.error("Falha no processo de checkout:", error);
        alert("Ocorreu um erro ao processar o seu pagamento. Tente novamente.");
      } finally {
        payButton.disabled = false;
        payButton.innerText = "Gerar Posts com IA";
      }
    });
  }
});
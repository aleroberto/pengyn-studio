const API_BASE = (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
)
  ? "http://127.0.0.1:8000"
  : "https://pengyn-studio-api.vercel.app";

const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
  const triggerBottom = window.innerHeight * 0.85;

  reveals.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top < triggerBottom) {
      element.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
revealOnScroll();

const faqQuestions = document.querySelectorAll(".faq-question");

faqQuestions.forEach((question) => {
  question.addEventListener("click", () => {
    const answer = question.nextElementSibling;
    const isOpen = answer.style.maxHeight;

    document.querySelectorAll(".faq-answer").forEach((item) => {
      item.style.maxHeight = null;
    });

    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Logo scroll to top
  const logoTop = document.getElementById("logo-top");
  if (logoTop) {
    logoTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    logoTop.style.cursor = "pointer";
  }

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

  if (textElement) {
    setTimeout(typeEffect, 1000);
  }

  let state = createEmptyState();
  let preferredQuantity = null;

  const prices = {
    "3": "R$ 9,90",
    "6": "R$ 14,90",
    "12": "R$ 19,90"
  };

  const checkoutPanel = document.getElementById("checkout-panel");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutError = document.getElementById("checkout-error");
  const pixPanel = document.getElementById("pix-panel");
  const pixError = document.getElementById("pix-error");
  const deliveryPanel = document.getElementById("delivery-panel");
  const deliveryGallery = document.getElementById("delivery-gallery");
  const loading = document.getElementById("loading-state");
  const instagramInput = document.getElementById("client-instagram");
  const whatsappInput = document.getElementById("client-whatsapp");

  const onboarding = document.getElementById("onboarding");
  const steps = document.querySelectorAll(".question-block");
  const indicator = document.querySelector(".step-indicator");
  const progressBar = document.querySelector(".progress");
  const startButtons = document.querySelectorAll('a[href="#onboarding"]');

  startButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onboarding.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll(".plan-cta").forEach((btn) => {
    btn.addEventListener("click", () => {
      preferredQuantity = btn.dataset.quantity;
      onboarding.scrollIntoView({ behavior: "smooth" });
    });
  });

  updateProgress(1);

  steps.forEach((step, index) => {
    const buttons = step.querySelectorAll("button");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Handle plan cards differently in step 4
        if (index === 3) {
          const planCards = step.querySelectorAll(".price-card-onboarding");
          planCards.forEach((card) => card.classList.remove("selected"));
          btn.closest(".price-card-onboarding").classList.add("selected");
          state.quantity = btn.dataset.quantity;
          setTimeout(() => {
            finishOnboarding();
          }, 350);
          return;
        }

        // Handle regular chips for steps 1-3
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const value = btn.dataset.value;
        if (index === 0) state.niche = value;
        if (index === 1) state.goal = value;
        if (index === 2) state.style = value;

        setTimeout(() => {
          if (index < steps.length - 1) {
            steps[index].classList.add("hidden");
            steps[index + 1].classList.remove("hidden");

            if (indicator) {
              indicator.textContent = `Etapa ${index + 2} de ${steps.length}`;
            }
            updateProgress(index + 2);
          }
        }, 350);
      });
    });
  });

  function createEmptyState() {
    return {
      niche: null,
      goal: null,
      style: null,
      quantity: null,
      title: null,
      titles: [],
      email: null,
      instagram: null,
      whatsapp: null,
      price: null,
      transactionId: null,
      orderId: null,
      pixCode: null
    };
  }

  function highlightPreferredQuantity() {
    if (!preferredQuantity) return;
    const qtyStep = document.querySelector('.question-block[data-step="4"]');
    if (!qtyStep || qtyStep.classList.contains("hidden")) return;

    const planCards = qtyStep.querySelectorAll(".price-card-onboarding");
    planCards.forEach((card) => {
      const btn = card.querySelector(".plan-cta-onboarding");
      if (btn && btn.dataset.quantity === preferredQuantity) {
        card.classList.add("selected");
      }
    });
  }

  function finishOnboarding() {
    const lastStep = steps[steps.length - 1];
    lastStep.classList.add("hidden");
    if (indicator) indicator.style.display = "none";
    updateProgress(steps.length); // Show 100% progress
    loading.classList.remove("hidden");

    setTimeout(() => {
      loading.classList.add("hidden");
      generateDynamicStrategy();
    }, 1200);
  }

  function updateProgress(step) {
    const totalSteps = steps.length;
    const percent = (step / totalSteps) * 100;
    if (progressBar) progressBar.style.width = percent + "%";
  }

  function generateDynamicStrategy() {
    const resultCard = document.getElementById("result-card");
    resultCard.classList.remove("hidden");

    document.getElementById("out-goal").textContent = formatText(state.goal);
    document.getElementById("out-niche").textContent = formatText(state.niche);
    document.getElementById("out-quantity").textContent = `${state.quantity} Posts`;

    const strategyDatabase = {
      "3": [
        { title: "1. Abertura Hero", desc: "Uma apresentação de altíssimo impacto do seu serviço para gerar desejo imediato." },
        { title: "2. Prova de Autoridade", desc: "Elementos visuais que constroem confiança e mostram que você é referência." },
        { title: "3. Oferta e Escassez", desc: "O gatilho final com condição especial e chamada para ação direta." }
      ],
      "6": [
        { title: "1. Produto Hero", desc: "Uma imagem de altíssimo impacto do seu melhor serviço para gerar desejo imediato." },
        { title: "2. Desejo Sensorial", desc: "Foco nos detalhes e na qualidade. Mostramos a experiência premium do cliente." },
        { title: "3. Autoridade", desc: "Elementos que constroem confiança e justificam seu preço premium." },
        { title: "4. Oferta Irresistível", desc: "Revelação de condição especial ou bônus, impossível de ignorar." },
        { title: "5. Conversão Direta", desc: "Convite claro e elegante para agendamento ou mensagem no WhatsApp." },
        { title: "6. Urgência Final", desc: "Acionamos o senso de escassez de vagas ou tempo para forçar a decisão." }
      ],
      "12": [
        { title: "1. Produto Hero", desc: "Impacto visual máximo no primeiro contato." },
        { title: "2. Desejo Sensorial", desc: "Venda da experiência e do conforto." },
        { title: "3. Educacional de Valor", desc: "Educa a audiência sobre seu diferencial." },
        { title: "4. Bastidores", desc: "Conexão humana mostrando os bastidores." },
        { title: "5. Prova Social", desc: "Validação externa através de depoimentos." },
        { title: "6. Quebra de Objeção", desc: "Responde por que seu produto é o melhor investimento." },
        { title: "7. O Mito vs Verdade", desc: "Quebra paradigmas do seu nicho para gerar autoridade." },
        { title: "8. Check-list do Cliente", desc: "Como se preparar para a sua experiência." },
        { title: "9. Antecipação", desc: "Gera mistério e expectativa para a oferta." },
        { title: "10. Oferta Exclusiva", desc: "A revelação da condição imperdível." },
        { title: "11. CTA de Vendas", desc: "Chamada direta e sem fricção para o WhatsApp." },
        { title: "12. Fechamento Urgente", desc: "Aviso de vagas/estoque esgotando." }
      ]
    };

    const selectedStrategy = strategyDatabase[state.quantity] || strategyDatabase["6"];
    const gridContainer = document.getElementById("dynamic-grid");
    gridContainer.innerHTML = "";

    selectedStrategy.forEach((item) => {
      const cardHTML = `
        <div class="strategy-card reveal active">
          <div class="strategy-header">${item.title}</div>
          <div class="strategy-desc">${item.desc}</div>
        </div>
      `;
      gridContainer.insertAdjacentHTML("beforeend", cardHTML);
    });

    state.titles = selectedStrategy.map((item) => item.title);
    state.title = state.titles[0] || `${state.niche} — ${state.style}`;
    state.price = prices[state.quantity] || prices["6"];

    const btnCheckout = document.getElementById("btn-checkout");
    if (btnCheckout) {
      btnCheckout.textContent = `Contratar ${state.quantity} Posts (${state.price})`;
    }

    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function hideError(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
  }

  function setInputValidity(input, ok) {
    if (!input) return;
    input.classList.toggle("input-invalid", ok === false);
    input.classList.toggle("input-valid", ok === true);
  }

  function resetFlowPanels() {
    hideError(checkoutError);
    hideError(pixError);
    if (checkoutForm) checkoutForm.reset();
    if (checkoutPanel) checkoutPanel.classList.add("hidden");
    if (pixPanel) pixPanel.classList.add("hidden");
    if (deliveryPanel) deliveryPanel.classList.add("hidden");
    if (deliveryGallery) deliveryGallery.innerHTML = "";
    const pixCodeOut = document.getElementById("out-pix-code");
    if (pixCodeOut) pixCodeOut.value = "";
    const txOut = document.getElementById("out-transaction-id");
    if (txOut) txOut.textContent = "-";
    setInputValidity(instagramInput, null);
    setInputValidity(whatsappInput, null);
    removeInstagramError();
  }

  async function apiPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    let data = {};
    try {
      data = await response.json();
    } catch (err) {
      data = {};
    }

    if (!response.ok) {
      const detail = data.detail;
      const message = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg || item).join(" ")
          : `Erro ${response.status} ao falar com a API.`;
      throw new Error(message);
    }

    return data;
  }

  function applyInstagramError(message) {
    if (!instagramInput) return;
    removeInstagramError();
    setInputValidity(instagramInput, false);

    const errorText = document.createElement("span");
    errorText.className = "input-error-msg";
    errorText.textContent = message;
    instagramInput.parentNode.appendChild(errorText);
  }

  function applyInstagramSuccess(cleanUsername) {
    if (!instagramInput) return;
    removeInstagramError();
    setInputValidity(instagramInput, true);
    instagramInput.value = `@${cleanUsername}`;
  }

  function removeInstagramError() {
    if (!instagramInput) return;
    const oldMsg = instagramInput.parentNode.querySelector(".input-error-msg");
    if (oldMsg) oldMsg.remove();
  }

  if (instagramInput) {
    instagramInput.addEventListener("blur", async () => {
      const usernameValue = instagramInput.value.trim();
      if (!usernameValue) return;

      try {
        const data = await apiPost("/api/v1/validate-instagram", { username: usernameValue });
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

  if (whatsappInput) {
    whatsappInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})$/, "($1");
      }

      e.target.value = value;
      const digits = value.replace(/\D/g, "");
      setInputValidity(whatsappInput, digits.length === 10 || digits.length === 11);
    });
  }

  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout && checkoutPanel) {
    btnCheckout.addEventListener("click", () => {
      pixPanel.classList.add("hidden");
      deliveryPanel.classList.add("hidden");
      checkoutPanel.classList.remove("hidden");
      checkoutPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(checkoutError);

      state.instagram = document.getElementById("client-instagram").value.trim();
      state.whatsapp = document.getElementById("client-whatsapp").value.trim();
      state.email = document.getElementById("client-email").value.trim();

      const submitBtn = document.getElementById("btn-submit-checkout");
      if (submitBtn) submitBtn.disabled = true;
      loading.classList.remove("hidden");

      try {
        const data = await apiPost("/api/v1/checkout", {
          config: {
            niche: state.niche,
            style: state.style,
            title: state.title || `${state.niche} — ${state.style}`,
            goal: state.goal || "",
            titles: state.titles
          },
          client: {
            instagram: state.instagram,
            whatsapp: state.whatsapp,
            email: state.email
          },
          purchase: {
            quantity: String(state.quantity),
            price: state.price
          }
        });

        state.transactionId = data.transaction_id;
        state.orderId = data.order_id;
        state.pixCode = data.pix_code;
        document.getElementById("out-transaction-id").textContent = state.transactionId;
        document.getElementById("out-pix-code").value = state.pixCode;
        pixPanel.classList.remove("hidden");
        pixPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        const offline = err instanceof TypeError;
        showError(
          checkoutError,
          offline
            ? "Não foi possível conectar à API. Suba o backend em http://127.0.0.1:8000."
            : err.message
        );
      } finally {
        loading.classList.add("hidden");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const btnCopyPix = document.getElementById("btn-copy-pix");
  if (btnCopyPix) {
    btnCopyPix.addEventListener("click", async () => {
      const code = document.getElementById("out-pix-code").value;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        btnCopyPix.textContent = "Copiado";
        setTimeout(() => {
          btnCopyPix.textContent = "Copiar código";
        }, 1600);
      } catch (err) {
        document.getElementById("out-pix-code").select();
      }
    });
  }

  function renderDelivery(images) {
    if (!deliveryGallery) return;
    deliveryGallery.replaceChildren();
    images.forEach((item) => {
      const figure = document.createElement("figure");
      figure.className = "delivery-card";
      const img = document.createElement("img");
      img.src = new URL(item.image_url, API_BASE).href;
      img.alt = item.title;
      const caption = document.createElement("figcaption");
      caption.textContent = item.title;
      figure.append(img, caption);
      deliveryGallery.append(figure);
    });
    deliveryPanel.classList.remove("hidden");
    deliveryPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function waitForDelivery(orderId) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const response = await fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(orderId)}/delivery`);
      if (!response.ok) throw new Error("Não foi possível consultar o pedido.");
      const delivery = await response.json();
      if (delivery.status === "ready") return delivery.images;
      if (delivery.status === "failed") throw new Error(delivery.error || "Falha na geração da campanha.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("A geração continua em andamento. Consulte o pedido novamente em alguns minutos.");
  }

  const btnSimulate = document.getElementById("btn-simulate-payment");
  if (btnSimulate) {
    btnSimulate.addEventListener("click", async () => {
      hideError(pixError);
      btnSimulate.disabled = true;
      loading.classList.remove("hidden");

      try {
        const data = await apiPost("/api/v1/simulate-payment", {
          transaction_id: state.transactionId
        });

        const images = await waitForDelivery(data.order_id || state.orderId);

        renderDelivery(images);
      } catch (err) {
        const offline = err instanceof TypeError;
        showError(
          pixError,
          offline
            ? "Não foi possível conectar à API para simular o pagamento."
            : err.message
        );
      } finally {
        loading.classList.add("hidden");
        btnSimulate.disabled = false;
      }
    });
  }

  const btnRestart = document.getElementById("btn-restart");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      document.getElementById("result-card").classList.add("hidden");
      document.querySelectorAll(".chips button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".price-card-onboarding").forEach((card) => card.classList.remove("selected"));

      steps.forEach((s) => s.classList.add("hidden"));
      steps[0].classList.remove("hidden");

      state = createEmptyState();
      resetFlowPanels();

      if (indicator) {
        indicator.style.display = "block";
        indicator.textContent = `Etapa 1 de ${steps.length}`;
      }
      updateProgress(1);

      document.getElementById("onboarding").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function formatText(text) {
    if (!text) return "-";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
});

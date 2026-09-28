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

faqQuestions.forEach((question, index) => {
  const answer = question.nextElementSibling;
  answer.id = `faq-answer-${index}`;
  question.setAttribute("aria-controls", answer.id);
  question.setAttribute("aria-expanded", "false");
  question.addEventListener("click", () => {
    const wasOpen = question.getAttribute("aria-expanded") === "true";
    faqQuestions.forEach((other) => {
      other.setAttribute("aria-expanded", "false");
      other.nextElementSibling.style.maxHeight = null;
    });
    if (!wasOpen) {
      question.setAttribute("aria-expanded", "true");
      answer.style.maxHeight = `${answer.scrollHeight}px`;
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
  const words = ["posts para sua marca", "uma campanha visual", "imagens e legendas"];

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
  let paymentMode = "unavailable";
  const modeLabel = document.querySelector(".engine-status");
  const faqPix = document.getElementById("faq-pix-answer");
  const checkoutSubmit = document.getElementById("btn-submit-checkout");
  fetch(`${API_BASE}/`)
    .then((response) => { if (!response.ok) throw new Error("API indisponível"); return response.json(); })
    .then((data) => {
      paymentMode = data.payment_mode || "unavailable";
      if (paymentMode === "live") {
        modeLabel.textContent = "Pagamento Pix disponível";
        faqPix.textContent = "Sim. O código Pix é emitido pelo Mercado Pago. A geração começa após a confirmação do pagamento.";
        checkoutSubmit.textContent = "Gerar Pix do pedido";
      } else if (paymentMode === "demo") {
        modeLabel.textContent = "Demonstração · sem cobrança";
        faqPix.textContent = "Nesta demonstração, o Pix é fictício e o pagamento pode ser simulado para testar o fluxo.";
        checkoutSubmit.textContent = "Gerar Pix de demonstração";
      } else {
        modeLabel.textContent = "Pedidos temporariamente indisponíveis";
        faqPix.textContent = "O checkout está indisponível no momento. Você ainda pode explorar a prévia da campanha.";
        checkoutSubmit.disabled = true;
      }
    })
    .catch(() => {
      modeLabel.textContent = "Serviço temporariamente indisponível";
      faqPix.textContent = "Não foi possível confirmar a disponibilidade do checkout. Tente novamente mais tarde.";
      checkoutSubmit.disabled = true;
    });
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

  const customNichePanel = document.getElementById("custom-niche-panel");
  const customNicheInput = document.getElementById("custom-niche-input");
  const customNicheContinue = document.getElementById("btn-custom-niche-continue");
  const otherNicheButton = document.getElementById("btn-other-niche");

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

  function goBackToStep(index) {
    steps.forEach((step, i) => step.classList.toggle("hidden", i !== index));
    if (indicator) indicator.textContent = `Etapa ${index + 1} de ${steps.length}`;
    updateProgress(index + 1);
    steps[index]?.querySelector("h3")?.focus();
  }

  function goToNextStep(currentIndex) {
    if (currentIndex >= steps.length - 1) return;

    steps[currentIndex].classList.add("hidden");
    steps[currentIndex + 1].classList.remove("hidden");

    if (indicator) {
      indicator.textContent = `Etapa ${currentIndex + 2} de ${steps.length}`;
    }

    updateProgress(currentIndex + 2);
    steps[currentIndex + 1]?.querySelector("h3")?.focus();

    if (currentIndex + 1 === 4) {
      highlightPreferredQuantity();
    }
  }

  function commitCustomNiche() {
    if (!customNicheInput) return;

    const value = customNicheInput.value.trim().replace(/\s+/g, " ");
    if (!value) {
      customNicheInput.focus();
      return;
    }

    state.niche = value;

    const nicheStep = steps[0];
    nicheStep.querySelectorAll(".chips button").forEach((b) => b.classList.remove("active"));

    if (otherNicheButton) {
      otherNicheButton.classList.add("active");
    }

    goToNextStep(0);
  }

  steps.forEach((step, index) => {
    step.querySelector("h3")?.setAttribute("tabindex", "-1");
    step.querySelector(".back-step")?.addEventListener("click", () => goBackToStep(index - 1));
    const buttons = step.querySelectorAll(
      "button[data-value], .plan-cta-onboarding, #btn-other-niche"
    );

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {

        // Etapa 4: seleção do pacote
        if (index === 4) {
          const planCards = step.querySelectorAll(".price-card-onboarding");

          planCards.forEach((card) => {
            card.classList.remove("selected");
          });

          const currentCard = btn.closest(".price-card-onboarding");

          if (currentCard) {
            currentCard.classList.add("selected");
          }

          state.quantity = btn.dataset.quantity;

          setTimeout(() => {
            finishOnboarding();
          }, 350);

          return;
        }

        // Etapa 1: opção "Outro"
        if (index === 0 && btn.id === "btn-other-niche") {
          step.querySelectorAll(".chips button").forEach((b) => {
            b.classList.remove("active");
          });

          btn.classList.add("active");

          state.niche = null;

          if (customNichePanel) {
            customNichePanel.classList.remove("hidden");
          }

          setTimeout(() => {
            if (customNicheInput) {
              customNicheInput.focus();
            }
          }, 80);

          return;
        }

        // Chips regulares
        step.querySelectorAll(".chips button").forEach((b) => {
          b.classList.remove("active");
        });

        btn.classList.add("active");

        const value = btn.dataset.value;

        if (index === 0) {
          state.niche = value;

          if (customNichePanel) {
            customNichePanel.classList.add("hidden");
          }

          if (customNicheInput) {
            customNicheInput.value = "";
          }
        }

        if (index === 1) {
          state.goal = value;
        }

        if (index === 2) {
          state.style = value;
        }

        setTimeout(() => {
          goToNextStep(index);
        }, 350);
      });
    });
  });

  if (customNicheContinue) {
    customNicheContinue.addEventListener("click", commitCustomNiche);
  }

  if (customNicheInput) {
    customNicheInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitCustomNiche();
      }
    });
  }

  document.getElementById("brand-brief-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.product = document.getElementById("brief-product").value.trim();
    state.audience = document.getElementById("brief-audience").value.trim();
    state.colors = document.getElementById("brief-colors").value.trim();
    state.notes = document.getElementById("brief-notes").value.trim();
    if (state.product) goToNextStep(3);
  });

  function createEmptyState() {
    return {
      niche: null,
      goal: null,
      style: null,
      product: null,
      audience: "",
      colors: "",
      notes: "",
      quantity: null,
      title: null,
      titles: [],
      email: null,
      instagram: null,
      whatsapp: null,
      price: null,
      transactionId: null,
      orderId: null,
      orderToken: null,
      pixCode: null
    };
  }

  function highlightPreferredQuantity() {
    if (!preferredQuantity) return;

    const qtyStep = document.querySelector(
      '.question-block[data-step="5"]'
    );

    if (!qtyStep || qtyStep.classList.contains("hidden")) {
      return;
    }

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

    if (indicator) {
      indicator.style.display = "none";
    }

    updateProgress(steps.length);

    if (loading) {
      loading.classList.remove("hidden");
    }

    setTimeout(() => {
      if (loading) {
        loading.classList.add("hidden");
      }

      generateDynamicStrategy();
    }, 1200);
  }

  function updateProgress(step) {
    const totalSteps = steps.length;
    const percent = (step / totalSteps) * 100;

    if (progressBar) {
      progressBar.style.width = percent + "%";
      progressBar.parentElement.setAttribute("aria-valuenow", String(step));
    }
  }

  const goalLabels = {
    vendas: "Mais vendas",
    clientes: "Atrair clientes",
    autoridade: "Criar autoridade",
    whatsapp: "Mensagens no WhatsApp"
  };

  const styleLabels = {
    premium: "Premium",
    minimalista: "Minimalista",
    luxo: "Luxo",
    vibrante: "Vibrante"
  };

  const strategyBlueprints = {

    vendas: {
      journey: [
        "Atenção",
        "Desejo",
        "Prova",
        "Oferta"
      ],

      items: [
        {
          title: "Impacto",
          phase: "Atenção",
          desc: "Abra a sequência com uma mensagem capaz de interromper o scroll."
        },
        {
          title: "Problema",
          phase: "Atenção",
          desc: "Mostre uma dor ou necessidade que o público reconhece rapidamente."
        },
        {
          title: "Desejo",
          phase: "Desejo",
          desc: "Apresente a transformação, experiência ou resultado que o cliente quer alcançar."
        },
        {
          title: "Diferencial",
          phase: "Desejo",
          desc: "Destaque por que a sua oferta merece preferência."
        },
        {
          title: "Valor",
          phase: "Desejo",
          desc: "Reforce benefícios e percepção de valor antes de falar em preço."
        },
        {
          title: "Autoridade",
          phase: "Prova",
          desc: "Mostre domínio, método ou experiência para reduzir a incerteza."
        },
        {
          title: "Prova",
          phase: "Prova",
          desc: "Use evidências, resultados ou sinais de confiança."
        },
        {
          title: "Objeção",
          phase: "Prova",
          desc: "Antecipe a principal dúvida que pode travar a compra."
        },
        {
          title: "Antecipação",
          phase: "Oferta",
          desc: "Prepare o público para a proposta e aumente a expectativa."
        },
        {
          title: "Oferta",
          phase: "Oferta",
          desc: "Apresente a condição comercial com clareza e foco no benefício."
        },
        {
          title: "Ação",
          phase: "Oferta",
          desc: "Faça uma chamada direta e simples para o próximo passo."
        },
        {
          title: "Urgência",
          phase: "Oferta",
          desc: "Feche a sequência com um motivo concreto para agir agora."
        }
      ]
    },

    clientes: {
      journey: [
        "Descoberta",
        "Interesse",
        "Confiança",
        "Contato"
      ],

      items: [
        {
          title: "Descoberta",
          phase: "Descoberta",
          desc: "Chame atenção de quem ainda não conhece a marca."
        },
        {
          title: "Identificação",
          phase: "Descoberta",
          desc: "Faça o público reconhecer uma situação, desejo ou necessidade própria."
        },
        {
          title: "Necessidade",
          phase: "Interesse",
          desc: "Mostre por que vale a pena resolver esse problema agora."
        },
        {
          title: "Solução",
          phase: "Interesse",
          desc: "Apresente de forma simples como a marca pode ajudar."
        },
        {
          title: "Experiência",
          phase: "Interesse",
          desc: "Mostre o que a pessoa pode esperar ao escolher a marca."
        },
        {
          title: "Diferencial",
          phase: "Confiança",
          desc: "Destaque aquilo que torna a proposta mais relevante ou memorável."
        },
        {
          title: "Autoridade",
          phase: "Confiança",
          desc: "Reforce competência, método, qualidade ou experiência."
        },
        {
          title: "Prova",
          phase: "Confiança",
          desc: "Inclua sinais de validação que diminuam a insegurança."
        },
        {
          title: "Benefício",
          phase: "Contato",
          desc: "Traduza a oferta em um benefício claro para o cliente."
        },
        {
          title: "Convite",
          phase: "Contato",
          desc: "Convide o público a conhecer, perguntar ou solicitar informações."
        },
        {
          title: "Contato",
          phase: "Contato",
          desc: "Mostre o canal e a ação que o cliente deve tomar."
        },
        {
          title: "Próximo passo",
          phase: "Contato",
          desc: "Feche a jornada removendo fricção do primeiro contato."
        }
      ]
    },

    autoridade: {
      journey: [
        "Descoberta",
        "Valor",
        "Credibilidade",
        "Referência"
      ],

      items: [
        {
          title: "Ponto de vista",
          phase: "Descoberta",
          desc: "Abra com uma opinião ou perspectiva clara sobre o seu mercado."
        },
        {
          title: "Tema-chave",
          phase: "Descoberta",
          desc: "Apresente um assunto relevante que o público deveria entender."
        },
        {
          title: "Educação",
          phase: "Valor",
          desc: "Ensine algo útil sem transformar o conteúdo em uma aula longa."
        },
        {
          title: "Insight",
          phase: "Valor",
          desc: "Mostre uma leitura mais profunda ou pouco óbvia sobre o tema."
        },
        {
          title: "Método",
          phase: "Valor",
          desc: "Apresente como você pensa ou estrutura a solução."
        },
        {
          title: "Bastidores",
          phase: "Credibilidade",
          desc: "Mostre processo, cuidado e critérios por trás do trabalho."
        },
        {
          title: "Erro comum",
          phase: "Credibilidade",
          desc: "Aponte um erro recorrente e explique uma alternativa melhor."
        },
        {
          title: "Mito x verdade",
          phase: "Credibilidade",
          desc: "Quebre uma percepção comum usando conhecimento e contexto."
        },
        {
          title: "Evidência",
          phase: "Referência",
          desc: "Sustente a mensagem com resultados, exemplos ou demonstrações."
        },
        {
          title: "Caso",
          phase: "Referência",
          desc: "Mostre uma aplicação prática do conhecimento apresentado."
        },
        {
          title: "Posicionamento",
          phase: "Referência",
          desc: "Reforce o território que você quer ocupar na mente do público."
        },
        {
          title: "Referência",
          phase: "Referência",
          desc: "Feche convidando o público a acompanhar a marca como fonte confiável."
        }
      ]
    },

    whatsapp: {
      journey: [
        "Atenção",
        "Interesse",
        "Confiança",
        "Conversa"
      ],

      items: [
        {
          title: "Impacto",
          phase: "Atenção",
          desc: "Comece com uma mensagem simples, forte e fácil de entender."
        },
        {
          title: "Identificação",
          phase: "Atenção",
          desc: "Faça o público se reconhecer no problema ou desejo apresentado."
        },
        {
          title: "Problema",
          phase: "Interesse",
          desc: "Evidencie a situação que leva a pessoa a procurar ajuda ou solução."
        },
        {
          title: "Solução",
          phase: "Interesse",
          desc: "Apresente o caminho de forma clara e sem excesso de informação."
        },
        {
          title: "Desejo",
          phase: "Interesse",
          desc: "Mostre o resultado, experiência ou benefício que desperta vontade."
        },
        {
          title: "Diferencial",
          phase: "Confiança",
          desc: "Explique por que vale a pena iniciar a conversa com a sua marca."
        },
        {
          title: "Autoridade",
          phase: "Confiança",
          desc: "Reduza o risco percebido mostrando domínio e profissionalismo."
        },
        {
          title: "Prova",
          phase: "Confiança",
          desc: "Use sinais que mostrem que outras pessoas já confiaram na solução."
        },
        {
          title: "Objeção",
          phase: "Conversa",
          desc: "Responda uma dúvida importante antes que ela impeça o contato."
        },
        {
          title: "Convite",
          phase: "Conversa",
          desc: "Abra a porta para uma conversa sem compromisso ou com baixa fricção."
        },
        {
          title: "WhatsApp",
          phase: "Conversa",
          desc: "Faça uma chamada direta para iniciar a conversa no WhatsApp."
        },
        {
          title: "Conversa",
          phase: "Conversa",
          desc: "Feche reforçando que o próximo passo é simples: enviar uma mensagem."
        }
      ]
    }
  };

  const quantityIndexes = {
    "3": [0, 6, 10],
    "6": [0, 2, 4, 6, 8, 10],
    "12": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };

  function labelFor(map, value) {
    return map[value] || formatText(value);
  }

  function buildJourney(journey) {
    const journeyEl = document.querySelector(".strategy-journey");

    if (!journeyEl) return;

    journeyEl.innerHTML = journey
      .map((item, index) => {
        const label = `<span>${item}</span>`;

        const arrow = index < journey.length - 1
          ? '<span class="journey-arrow">→</span>'
          : "";

        return label + arrow;
      })
      .join("");
  }

  function generateDynamicStrategy() {
    const resultCard = document.getElementById("result-card");
    const gridContainer = document.getElementById("dynamic-grid");
    const countOutput = document.getElementById("feed-preview-count");

    if (!resultCard || !gridContainer) {
      return;
    }

    resultCard.classList.remove("hidden");

    resultCard.dataset.style = state.style || "premium";

    const outNiche = document.getElementById("out-niche");
    const outGoal = document.getElementById("out-goal");
    const outStyle = document.getElementById("out-style");
    document.getElementById("out-product").textContent = state.product;
    const outQuantity = document.getElementById("out-quantity");

    if (outNiche) {
      outNiche.textContent = formatText(state.niche);
    }

    if (outGoal) {
      outGoal.textContent = labelFor(goalLabels, state.goal);
    }

    if (outStyle) {
      outStyle.textContent = labelFor(styleLabels, state.style);
    }

    if (outQuantity) {
      outQuantity.textContent = `${state.quantity} posts`;
    }

    if (countOutput) {
      countOutput.textContent = `${state.quantity} posts`;
    }

    const blueprint =
      strategyBlueprints[state.goal] ||
      strategyBlueprints.vendas;

    const indexes =
      quantityIndexes[String(state.quantity)] ||
      quantityIndexes["6"];

    const selectedStrategy = indexes
      .map((index) => blueprint.items[index])
      .filter(Boolean);

    buildJourney(blueprint.journey);

    gridContainer.innerHTML = "";

    selectedStrategy.forEach((item, index) => {
      const number = String(index + 1).padStart(2, "0");

      const cardHTML = `
        <article class="feed-tile reveal active">

          <span class="feed-tile-number">
            ${number}
          </span>

          <div class="feed-tile-content">

            <span class="feed-tile-kicker">
              ${item.phase}
            </span>

            <h4 class="feed-tile-title">
              ${item.title}
            </h4>

          </div>

          <p class="feed-tile-desc">
            ${item.desc}
          </p>

        </article>
      `;

      gridContainer.insertAdjacentHTML("beforeend", cardHTML);
      const tile = gridContainer.lastElementChild;
      const desc = tile.querySelector(".feed-tile-desc");
      desc.textContent = `${item.desc} Tema aplicado a ${state.product}${state.audience ? ` para ${state.audience}` : ""}.`;
      if (["Prova", "Oferta", "Urgência"].includes(item.title)) {
        tile.querySelector(".feed-tile-title").textContent = item.title === "Prova" ? "Como funciona" : "Convite";
      }
    });

    state.titles = selectedStrategy.map(
      (item) => `${item.title} — ${state.product}`
    );

    state.title =
      `${formatText(state.niche)} — ` +
      `${labelFor(goalLabels, state.goal)} — ` +
      `${labelFor(styleLabels, state.style)}`;

    state.price =
      prices[state.quantity] ||
      prices["6"];

    const btnCheckout =
      document.getElementById("btn-checkout");

    if (btnCheckout) {
      btnCheckout.textContent =
        `Criar meus ${state.quantity} posts — ${state.price}`;
    }

    resultCard.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
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

    input.classList.toggle(
      "input-invalid",
      ok === false
    );

    input.classList.toggle(
      "input-valid",
      ok === true
    );
  }

  function resetFlowPanels() {
    hideError(checkoutError);
    hideError(pixError);

    if (checkoutForm) {
      checkoutForm.reset();
    }
    sessionStorage.removeItem("pengyn_order");
    document.getElementById("result-card")?.classList.remove("order-recovery");
    document.querySelector("#result-card .result-intro h2").textContent = "Confira os temas da campanha.";

    if (checkoutPanel) {
      checkoutPanel.classList.add("hidden");
    }

    if (pixPanel) {
      pixPanel.classList.add("hidden");
    }

    if (deliveryPanel) {
      deliveryPanel.classList.add("hidden");
    }

    if (deliveryGallery) {
      deliveryGallery.innerHTML = "";
    }

    const pixCodeOut =
      document.getElementById("out-pix-code");

    if (pixCodeOut) {
      pixCodeOut.value = "";
    }

    const txOut =
      document.getElementById("out-transaction-id");

    if (txOut) {
      txOut.textContent = "-";
    }

    setInputValidity(instagramInput, null);
    setInputValidity(whatsappInput, null);

    removeInstagramError();
  }

  async function apiPost(path, body) {
    const response = await fetch(
      `${API_BASE}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (err) {
      data = {};
    }

    if (!response.ok) {
      const detail = data.detail;

      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
              .map((item) => item.msg || item)
              .join(" ")
            : `Erro ${response.status} ao falar com a API.`;

      throw new Error(message);
    }

    return data;
  }

  function applyInstagramError(message) {
    if (!instagramInput) return;

    removeInstagramError();

    setInputValidity(
      instagramInput,
      false
    );

    const errorText =
      document.createElement("span");

    errorText.className =
      "input-error-msg";

    errorText.textContent =
      message;

    instagramInput.parentNode
      .appendChild(errorText);
  }

  function applyInstagramSuccess(cleanUsername) {
    if (!instagramInput) return;

    removeInstagramError();

    setInputValidity(
      instagramInput,
      true
    );

    instagramInput.value =
      `@${cleanUsername}`;
  }

  function removeInstagramError() {
    if (!instagramInput) return;

    const oldMsg =
      instagramInput.parentNode
        .querySelector(".input-error-msg");

    if (oldMsg) {
      oldMsg.remove();
    }
  }

  if (instagramInput) {
    instagramInput.addEventListener(
      "blur",
      async () => {

        const usernameValue =
          instagramInput.value.trim();

        if (!usernameValue) {
          return;
        }

        try {
          const data = await apiPost(
            "/api/v1/validate-instagram",
            {
              username: usernameValue
            }
          );

          if (data.valid === false) {
            applyInstagramError(
              data.message
            );
          } else {
            applyInstagramSuccess(
              data.username
            );
          }

        } catch (error) {
          console.error(
            "Falha ao validar perfil:",
            error
          );
        }
      }
    );
  }

  if (whatsappInput) {
    whatsappInput.addEventListener(
      "input",
      (e) => {

        let value =
          e.target.value.replace(/\D/g, "");

        if (value.length > 11) {
          value = value.slice(0, 11);
        }

        if (value.length > 10) {
          value = value.replace(
            /^(\d{2})(\d{5})(\d{4})$/,
            "($1) $2-$3"
          );

        } else if (value.length > 6) {
          value = value.replace(
            /^(\d{2})(\d{4,5})(\d{0,4})$/,
            "($1) $2-$3"
          );

        } else if (value.length > 2) {
          value = value.replace(
            /^(\d{2})(\d{0,5})$/,
            "($1) $2"
          );

        } else if (value.length > 0) {
          value = value.replace(
            /^(\d{0,2})$/,
            "($1"
          );
        }

        e.target.value = value;

        const digits =
          value.replace(/\D/g, "");

        setInputValidity(
          whatsappInput,
          digits.length === 10 ||
          digits.length === 11
        );
      }
    );
  }

  const btnCheckout =
    document.getElementById("btn-checkout");

  if (btnCheckout && checkoutPanel) {

    btnCheckout.addEventListener(
      "click",
      () => {

        if (pixPanel) {
          pixPanel.classList.add("hidden");
        }

        if (deliveryPanel) {
          deliveryPanel.classList.add("hidden");
        }

        checkoutPanel.classList.remove("hidden");
        const summary = document.getElementById("checkout-summary");
        summary.replaceChildren();
        [`Produto: ${state.product}`, `Pacote: ${state.quantity} posts`, `Total: ${state.price}`,
          "Entrega: galeria e ZIP após confirmação e geração"].forEach((line) => {
          const p = document.createElement("p"); p.textContent = line; summary.append(p);
        });

        checkoutPanel.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    );
  }

  if (checkoutForm) {
    checkoutForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();

        hideError(checkoutError);

        state.instagram =
          document
            .getElementById("client-instagram")
            .value
            .trim();

        state.whatsapp =
          document
            .getElementById("client-whatsapp")
            .value
            .trim();

        state.email =
          document
            .getElementById("client-email")
            .value
            .trim();

        const submitBtn =
          document.getElementById(
            "btn-submit-checkout"
          );

        if (submitBtn) {
          submitBtn.disabled = true;
        }

        if (loading) {
          loading.classList.remove("hidden");
        }

        try {
          const data = await apiPost(
            "/api/v1/checkout",
            {
              config: {
                niche: state.niche,
                style: state.style,
                title:
                  state.title ||
                  `${state.niche} — ${state.style}`,
                goal:
                  state.goal || "",
                titles:
                  state.titles,
                product: state.product,
                audience: state.audience,
                colors: state.colors,
                notes: state.notes
              },

              client: {
                instagram:
                  state.instagram,
                whatsapp:
                  state.whatsapp,
                email:
                  state.email
              },

              purchase: {
                quantity:
                  String(state.quantity),
                price:
                  state.price
              }
            }
          );

          state.transactionId =
            data.transaction_id;

          state.orderId =
            data.order_id;
          state.orderToken = data.order_token;
          sessionStorage.setItem("pengyn_order", JSON.stringify({id: state.orderId, token: state.orderToken}));
          showOrderLink();
          showTicket(data.ticket_url);
          document.getElementById("btn-simulate-payment").classList.toggle("hidden", !data.demo_payment);
          document.getElementById("pix-explanation").textContent = data.demo_payment
            ? "PIX de demonstração: este código não é pagável. Use o botão de simulação."
            : "Pague o Pix e acompanhe a confirmação nesta página.";
          if (!data.demo_payment) followOrder();

          state.pixCode =
            data.pix_code;
          document.getElementById("order-reference").textContent = `Pedido ${state.orderId} · guarde esta página até baixar sua campanha.`;

          const transactionOutput =
            document.getElementById(
              "out-transaction-id"
            );

          const pixOutput =
            document.getElementById(
              "out-pix-code"
            );

          if (transactionOutput) {
            transactionOutput.textContent =
              state.transactionId;
          }

          if (pixOutput) {
            pixOutput.value =
              state.pixCode;
          }

          if (pixPanel) {
            pixPanel.classList.remove(
              "hidden"
            );

            pixPanel.scrollIntoView({
              behavior: "smooth",
              block: "nearest"
            });
          }

        } catch (err) {
          const offline =
            err instanceof TypeError;

          showError(
            checkoutError,
            offline
              ? "Não foi possível conectar à API. Suba o backend em http://127.0.0.1:8000."
              : err.message
          );

        } finally {

          if (loading) {
            loading.classList.add("hidden");
          }

          if (submitBtn) {
            submitBtn.disabled = false;
          }
        }
      }
    );
  }

  const btnCopyPix =
    document.getElementById("btn-copy-pix");

  if (btnCopyPix) {
    btnCopyPix.addEventListener(
      "click",
      async () => {

        const pixOutput =
          document.getElementById(
            "out-pix-code"
          );

        if (!pixOutput) {
          return;
        }

        const code =
          pixOutput.value;

        if (!code) {
          return;
        }

        try {
          await navigator.clipboard
            .writeText(code);

          btnCopyPix.textContent =
            "Copiado";

          setTimeout(() => {
            btnCopyPix.textContent =
              "Copiar código";
          }, 1600);

        } catch (err) {
          pixOutput.select();
        }
      }
    );
  }

  function renderDelivery(images) {
    if (!deliveryGallery) return;
    deliveryGallery.replaceChildren();
    images.forEach((item) => {
      // Pedidos antigos guardavam o número dentro do próprio título.
      const title = (item.title || "").replace(/^\s*\d+\s*[.)-]\s*/, "");
      const captionText = (item.caption || "").replace(/^Conheça\s+\d+\s*[.)-]\s*/i, "Conheça ");
      const figure = document.createElement("figure");
      figure.className = "delivery-card";
      const img = document.createElement("img");
      img.src = new URL(item.image_url, API_BASE).href;
      img.alt = `Arte ${item.position + 1}: ${title}`;
      img.loading = "lazy";
      const caption = document.createElement("figcaption");
      caption.textContent = `Post ${item.position + 1} · ${title}`;
      const text = document.createElement("p");
      text.textContent = captionText;
      const actions = document.createElement("div");
      actions.className = "delivery-actions";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "secondary-button";
      copy.textContent = "Copiar legenda";
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(captionText); copy.textContent = "Legenda copiada"; }
        catch (_) { showError(pixError, "Não foi possível copiar a legenda."); }
      });
      const regen = document.createElement("button");
      regen.type = "button";
      regen.className = "secondary-button";
      regen.textContent = {
        completed: "Nova versão entregue", pending: "Nova versão na fila",
        running: "Gerando nova versão", failed: "Falha na nova versão"
      }[item.regeneration_status] || "Gerar nova versão";
      regen.disabled = Boolean(item.regeneration_status);
      regen.addEventListener("click", async () => {
        regen.disabled = true;
        try {
          const response = await fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(state.orderId)}/posts/${item.position}/regenerate`, {
            method: "POST", headers: {"X-Order-Token": state.orderToken}
          });
          if (!response.ok) throw new Error("Não foi possível solicitar a nova versão.");
          regen.textContent = "Gerando nova versão...";
          const images = await waitForRegeneration(state.orderId, item.position);
          renderDelivery(images);
        } catch (err) { showError(pixError, err.message); }
      });
      actions.append(copy, regen);
      figure.append(img, caption, text, actions);
      deliveryGallery.append(figure);
    });
    deliveryPanel.classList.remove("hidden");
    deliveryPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function waitForRegeneration(orderId, position) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const response = await fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(orderId)}/delivery`, {headers: {"X-Order-Token": state.orderToken}});
      if (!response.ok) throw new Error("Falha ao consultar a nova versão.");
      const delivery = await response.json();
      const post = delivery.images.find((item) => item.position === position);
      if (post?.regeneration_status === "completed") return delivery.images;
      if (post?.regeneration_status === "failed") throw new Error("A nova versão falhou. Entre em contato com o suporte.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("A nova versão continua em andamento.");
  }

  async function waitForDelivery(orderId) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const response = await fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(orderId)}/delivery`, {
        headers: {"X-Order-Token": state.orderToken}
      });
      if (!response.ok) throw new Error("Não foi possível consultar o pedido.");
      const delivery = await response.json();
      document.getElementById("order-progress").textContent = {
        awaiting_payment: "Aguardando pagamento", queued: "Pagamento confirmado · aguardando geração",
        generating: "Criando a campanha", ready: "Campanha pronta", payment_error: "Falha ao gerar Pix"
      }[delivery.status] || "Aguardando atualização";
      if (delivery.status === "ready") return delivery.images;
      if (delivery.status === "payment_error") throw new Error("Houve um problema com o pagamento. Entre em contato com o atendimento.");
      if (delivery.status === "failed") throw new Error(delivery.error || "Falha na geração da campanha.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("O pedido continua em andamento. Sua campanha poderá levar alguns minutos para ficar pronta.");
  }

  function orderLink() {
    const fragment = new URLSearchParams({pedido: state.orderId, acesso: state.orderToken});
    return `${location.origin}${location.pathname}#${fragment.toString()}`;
  }

  function showOrderLink() {
    document.getElementById("order-reference").textContent = `Pedido ${state.orderId} · salve o link de acesso.`;
  }

  function showTicket(url) {
    const link = document.getElementById("payment-ticket");
    if (url && /^https:\/\//.test(url)) {
      link.href = url;
      link.classList.remove("hidden");
    } else {
      link.removeAttribute("href");
      link.classList.add("hidden");
    }
  }

  let followInProgress = false;
  async function followOrder() {
    if (followInProgress || !state.orderId || !state.orderToken) return;
    followInProgress = true;
    hideError(pixError);
    try {
      renderDelivery(await waitForDelivery(state.orderId));
    } catch (err) {
      showError(pixError, `${err.message} Use “Atualizar acompanhamento” para consultar novamente.`);
    } finally { followInProgress = false; }
  }

  document.getElementById("btn-copy-order-link")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(orderLink());
      document.getElementById("btn-copy-order-link").textContent = "Link copiado";
    } catch (_) { showError(pixError, "Não foi possível copiar o link neste navegador."); }
  });
  document.getElementById("btn-refresh-order")?.addEventListener("click", followOrder);

  async function restoreOrder() {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const saved = sessionStorage.getItem("pengyn_order");
    let access = null;
    try { access = saved ? JSON.parse(saved) : null; } catch (_) { sessionStorage.removeItem("pengyn_order"); }
    if (fragment.get("pedido") && fragment.get("acesso")) {
      access = {id: fragment.get("pedido"), token: fragment.get("acesso")};
      sessionStorage.setItem("pengyn_order", JSON.stringify(access));
      history.replaceState(null, "", location.pathname + location.search);
    }
    if (!access?.id || !access?.token) return;
    state.orderId = access.id;
    state.orderToken = access.token;
    try {
      const headers = {"X-Order-Token": state.orderToken};
      const [orderResponse, paymentResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(state.orderId)}`, {headers}),
        fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(state.orderId)}/payment`, {headers})
      ]);
      if (!orderResponse.ok || !paymentResponse.ok) throw new Error("Link do pedido inválido ou indisponível.");
      const order = await orderResponse.json();
      const payment = await paymentResponse.json();
      state.transactionId = order.transaction_id;
      state.pixCode = payment.pix_code;
      document.getElementById("out-transaction-id").textContent = state.transactionId;
      document.getElementById("out-pix-code").value = state.pixCode;
      document.getElementById("btn-simulate-payment").classList.toggle("hidden", !payment.demo_payment);
      document.getElementById("pix-explanation").textContent = payment.demo_payment
        ? "Pix de demonstração: este código não é pagável. Use o botão de simulação."
        : "Acompanhe a confirmação do pagamento nesta página.";
      showTicket(payment.ticket_url);
      showOrderLink();
      document.getElementById("result-card").classList.remove("hidden");
      document.getElementById("result-card").classList.add("order-recovery");
      document.querySelector("#result-card .result-intro h2").textContent = "Seu pedido";
      pixPanel.classList.remove("hidden");
      pixPanel.scrollIntoView({behavior: "smooth", block: "start"});
      followOrder();
    } catch (err) {
      document.getElementById("result-card").classList.remove("hidden");
      document.getElementById("result-card").classList.add("order-recovery");
      document.querySelector("#result-card .result-intro h2").textContent = "Seu pedido";
      pixPanel.classList.remove("hidden");
      showError(pixError, err.message);
    }
  }
  restoreOrder();

  document.getElementById("btn-download-campaign")?.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/orders/${encodeURIComponent(state.orderId)}/download`, {headers: {"X-Order-Token": state.orderToken}});
      if (!response.ok) throw new Error("Não foi possível baixar a campanha.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `pengyn-${state.orderId}.zip`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { showError(pixError, err.message); }
  });

  const btnSimulate =
    document.getElementById(
      "btn-simulate-payment"
    );

  if (btnSimulate) {
    btnSimulate.addEventListener(
      "click",
      async () => {

        hideError(pixError);

        btnSimulate.disabled = true;

        if (loading) {
          loading.classList.remove(
            "hidden"
          );
        }

        try {
          const data = await apiPost(
            "/api/v1/simulate-payment",
            {
              transaction_id:
                state.transactionId
            }
          );

          await followOrder();

        } catch (err) {

          const offline =
            err instanceof TypeError;

          showError(
            pixError,
            offline
              ? "Não foi possível conectar à API para simular o pagamento."
              : err.message
          );

        } finally {

          if (loading) {
            loading.classList.add(
              "hidden"
            );
          }

          btnSimulate.disabled = false;
        }
      }
    );
  }

  const btnRestart =
    document.getElementById(
      "btn-restart"
    );

  if (btnRestart) {
    btnRestart.addEventListener(
      "click",
      () => {

        const resultCard =
          document.getElementById(
            "result-card"
          );

        if (resultCard) {
          resultCard.classList.add(
            "hidden"
          );
        }

        document
          .querySelectorAll(
            ".chips button"
          )
          .forEach((b) => {
            b.classList.remove(
              "active"
            );
          });

        document
          .querySelectorAll(
            ".price-card-onboarding"
          )
          .forEach((card) => {
            card.classList.remove(
              "selected"
            );
          });

        steps.forEach((step) => {
          step.classList.add("hidden");
        });

        if (steps[0]) {
          steps[0].classList.remove(
            "hidden"
          );
        }

        state =
          createEmptyState();

        resetFlowPanels();

        if (customNichePanel) {
          customNichePanel.classList.add(
            "hidden"
          );
        }

        if (customNicheInput) {
          customNicheInput.value = "";
        }

        if (otherNicheButton) {
          otherNicheButton.classList.remove(
            "active"
          );
        }

        if (resultCard) {
          resultCard.removeAttribute(
            "data-style"
          );
        }

        if (indicator) {
          indicator.style.display =
            "block";

          indicator.textContent =
            `Etapa 1 de ${steps.length}`;
        }

        updateProgress(1);

        const onboardingElement =
          document.getElementById(
            "onboarding"
          );

        if (onboardingElement) {
          onboardingElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  }

  function formatText(text) {
    if (!text) {
      return "-";
    }

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );
  }
});

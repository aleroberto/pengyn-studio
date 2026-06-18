// =========================
// PLANS
// =========================

const plans = document.querySelectorAll(".plan");

plans.forEach((plan) => {

  plan.addEventListener("click", () => {

    plans.forEach((item) => {
      item.classList.remove("active");
    });

    plan.classList.add("active");

    updateCheckout();

  });

});

// =========================
// CHIPS
// =========================

const chips = document.querySelectorAll(".chips button");

chips.forEach((chip) => {

  chip.addEventListener("click", () => {

    const parent = chip.parentElement;

    parent.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("active");
    });

    chip.classList.add("active");

  });

});

// =========================
// CHECKOUT
// =========================

const checkoutCard = document.querySelector(".checkout-card");

function updateCheckout() {

  const activePlan = document.querySelector(".plan.active");

  const quantity =
    activePlan.querySelector("strong").innerText;

  const price =
    activePlan.querySelector("span").innerText;

  checkoutCard.innerHTML = `
  
    <h3>
      Resumo do pedido
    </h3>

    <br>

    <p>
      ${quantity}
    </p>

    <p>
      Entrega imediata
    </p>

    <br>

    <h2>
      ${price}
    </h2>

  `;

}

// =========================
// BUTTON
// =========================

const payButton =
  document.querySelector(".pay-button");

payButton.addEventListener("click", () => {

  const selects =
    document.querySelectorAll("select");

  const titleInput =
    document.querySelectorAll("input")[0];

  const niche =
    selects[0].value;

  const style =
    selects[1].value;

  const title =
    titleInput.value;

  // VALIDATION

  if (
    niche === "Selecione o nicho" ||
    style === "Selecione o estilo" ||
    title.trim() === ""
  ) {

    alert(
      "Preencha nicho, estilo e título principal."
    );

    return;

  }

  // PLAN

  const activePlan =
    document.querySelector(".plan.active");

  const quantity =
    activePlan.querySelector("strong").innerText;

  const price =
    activePlan.querySelector("span").innerText;

  // DATA

  const payload = {

    niche,
    style,
    title,
    quantity,
    price

  };

  console.log("DADOS DO PEDIDO:");
  console.log(payload);

  // FUTURE PAYMENT INTEGRATION

  alert(
    "Aqui você integrará Stripe, Mercado Pago ou Asaas."
  );

});

// =========================
// OPTIONAL ANIMATION
// =========================

const cards =
  document.querySelectorAll(".post");

cards.forEach((card) => {

  card.addEventListener("mousemove", (e) => {

    const rect =
      card.getBoundingClientRect();

    const x =
      e.clientX - rect.left;

    const y =
      e.clientY - rect.top;

    card.style.backgroundPosition =
      `${50 + (x / rect.width) * 6}% ${50 + (y / rect.height) * 6}%`;

  });

  card.addEventListener("mouseleave", () => {

    card.style.backgroundPosition =
      "center";

  });

});
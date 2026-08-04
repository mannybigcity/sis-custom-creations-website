(function () {
  const PRODUCTS = [
    { id: "classic-tee", label: "Classic Tee", fit: "Unisex relaxed", price: "24", image: "../assets/design-studio/classic-tee-white.png", colors: ["white", "black", "heather-gray", "navy", "royal-blue", "purple", "red", "cream"], sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"], print: { x: 440, y: 435, w: 320, h: 360 } },
    { id: "womens-v-neck", label: "Women's V-neck", fit: "Women's semi-fitted", price: "27", image: "../assets/design-studio/womens-v-neck-white.png", colors: ["white", "black", "heather-gray", "navy", "purple"], sizes: ["S", "M", "L", "XL", "2XL", "3XL"], print: { x: 450, y: 470, w: 300, h: 330 } },
    { id: "pullover-hoodie", label: "Pullover Hoodie", fit: "Unisex fleece", price: "48", image: "../assets/design-studio/pullover-hoodie-white.png", colors: ["white", "black", "charcoal", "navy", "royal-blue", "purple"], sizes: ["S", "M", "L", "XL", "2XL", "3XL"], print: { x: 460, y: 470, w: 280, h: 300 } },
    { id: "crewneck-sweatshirt", label: "Crewneck Sweatshirt", fit: "Soft unisex fleece", price: "42", image: "../assets/design-studio/crewneck-sweatshirt-white.png", colors: ["white", "black", "heather-gray", "navy", "cream", "purple"], sizes: ["S", "M", "L", "XL", "2XL", "3XL"], print: { x: 440, y: 455, w: 320, h: 340 } },
    { id: "long-sleeve-tee", label: "Long Sleeve Tee", fit: "Unisex cotton", price: "32", image: "../assets/design-studio/long-sleeve-tee-white.png", colors: ["white", "black", "heather-gray", "navy", "royal-blue"], sizes: ["S", "M", "L", "XL", "2XL", "3XL"], print: { x: 440, y: 450, w: 320, h: 350 } },
    { id: "tank-top", label: "Tank Top", fit: "Warm-weather casual", price: "25", image: "../assets/design-studio/tank-top-white.png", colors: ["white", "black", "heather-gray", "navy", "purple"], sizes: ["S", "M", "L", "XL", "2XL"], print: { x: 470, y: 450, w: 260, h: 340 } },
    { id: "dad-hat", label: "Embroidered Hat", fit: "Adjustable", price: "29", image: "../assets/design-studio/dad-hat-white.png", colors: ["white", "black", "navy", "royal-blue", "purple", "khaki"], sizes: ["Adjustable"], print: { x: 465, y: 545, w: 270, h: 150 } },
    { id: "youth-tee", label: "Youth Tee", fit: "Youth classic", price: "22", image: "../assets/design-studio/youth-tee-white.png", colors: ["white", "black", "heather-gray", "navy", "royal-blue", "purple"], sizes: ["YS", "YM", "YL", "YXL"], print: { x: 455, y: 455, w: 290, h: 330 } }
  ];

  const COLOR_HEX = {
    white: "#ffffff",
    black: "#171421",
    "heather-gray": "#b8b8c0",
    navy: "#172a57",
    "royal-blue": "#1976f3",
    purple: "#7c3ff2",
    red: "#d63d3d",
    cream: "#f3e4c8",
    charcoal: "#34323b",
    khaki: "#b9a377"
  };

  const state = {
    product: PRODUCTS[0],
    color: "white",
    view: "front",
    text: "",
    textColor: "#5a28c9",
    textSize: 54,
    uploadedArt: null,
    uploadedFile: null,
    aiArtwork: null,
    mockupId: "",
    editsRemaining: 2,
    approved: false,
    variants: []
  };

  const productImages = new Map();

  const els = {
    productList: document.querySelector("#productList"),
    productCount: document.querySelector("#productCount"),
    colorSwatches: document.querySelector("#colorSwatches"),
    selectedColorLabel: document.querySelector("#selectedColorLabel"),
    canvas: document.querySelector("#designCanvas"),
    miniCanvas: document.querySelector("#miniCanvas"),
    canvasStatus: document.querySelector("#canvasStatus"),
    summaryProduct: document.querySelector("#summaryProduct"),
    summaryColor: document.querySelector("#summaryColor"),
    summaryView: document.querySelector("#summaryView"),
    summaryEdits: document.querySelector("#summaryEdits"),
    textInput: document.querySelector("#textInput"),
    textColor: document.querySelector("#textColor"),
    textSize: document.querySelector("#textSize"),
    addTextButton: document.querySelector("#addTextButton"),
    uploadInput: document.querySelector("#uploadInput"),
    clearArtButton: document.querySelector("#clearArtButton"),
    aiPrompt: document.querySelector("#aiPrompt"),
    generateAiButton: document.querySelector("#generateAiButton"),
    refineAiButton: document.querySelector("#refineAiButton"),
    frontViewButton: document.querySelector("#frontViewButton"),
    backViewButton: document.querySelector("#backViewButton"),
    centerArtButton: document.querySelector("#centerArtButton"),
    approveButton: document.querySelector("#approveButton"),
    placeNameButton: document.querySelector("#placeNameButton"),
    nameInput: document.querySelector("#nameInput"),
    numberInput: document.querySelector("#numberInput"),
    variantSelect: document.querySelector("#variantSelect"),
    quantityInput: document.querySelector("#quantityInput"),
    checkoutForm: document.querySelector("#checkoutForm"),
    checkoutButton: document.querySelector("#checkoutButton"),
    checkoutMessage: document.querySelector("#checkoutMessage")
  };

  const ctx = els.canvas.getContext("2d");
  const miniCtx = els.miniCanvas.getContext("2d");

  function titleCase(value) {
    return String(value || "").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function setStatus(message, type) {
    els.canvasStatus.textContent = message;
    els.canvasStatus.style.color = type === "error" ? "#b42318" : type === "success" ? "#0f7a55" : "";
  }

  function setCheckoutMessage(message, type) {
    els.checkoutMessage.textContent = message;
    els.checkoutMessage.style.color = type === "error" ? "#b42318" : type === "success" ? "#0f7a55" : "";
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.error || "Request failed.");
    return payload;
  }

  function loadImage(src) {
    if (productImages.has(src)) return Promise.resolve(productImages.get(src));
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        productImages.set(src, image);
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawRoundedRect(context, x, y, w, h, r) {
    context.beginPath();
    context.roundRect(x, y, w, h, r);
    context.fill();
  }

  function productBounds(product) {
    if (product.id === "classic-tee") return { x: 105, y: 85, w: 990, h: 990 };
    return { x: 60, y: 50, w: 1080, h: 1080 };
  }

  function drawDesign(context, size) {
    const scale = size / 1200;
    context.save();
    context.scale(scale, scale);
    context.clearRect(0, 0, 1200, 1200);
    const gradient = context.createLinearGradient(0, 0, 1200, 1200);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#eef5ff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 1200);

    const img = productImages.get(state.product.image);
    if (img) {
      const b = productBounds(state.product);
      context.drawImage(img, b.x, b.y, b.w, b.h);
      if (!["white", "cream"].includes(state.color)) {
        context.save();
        context.globalAlpha = 0.38;
        context.globalCompositeOperation = "multiply";
        context.fillStyle = COLOR_HEX[state.color] || state.color;
        context.fillRect(b.x, b.y, b.w, b.h);
        context.restore();
      }
    }

    const print = state.view === "front" ? state.product.print : { x: 470, y: 420, w: 260, h: 390 };
    context.save();
    context.strokeStyle = "rgba(113,61,242,.28)";
    context.setLineDash([12, 10]);
    context.lineWidth = 3;
    context.strokeRect(print.x, print.y, print.w, print.h);
    context.restore();

    const art = state.aiArtwork || state.uploadedArt;
    if (art && state.view === "front") {
      const ratio = Math.min(print.w / art.width, print.h / art.height);
      const w = art.width * ratio;
      const h = art.height * ratio;
      context.drawImage(art, print.x + (print.w - w) / 2, print.y + (print.h - h) / 2, w, h);
    }

    if (state.text && state.view === "front") {
      context.save();
      context.font = `900 ${state.textSize}px Inter, Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 8;
      context.strokeStyle = "rgba(255,255,255,.88)";
      context.fillStyle = state.textColor;
      const y = art ? print.y + print.h + 52 : print.y + print.h / 2;
      context.strokeText(state.text, print.x + print.w / 2, Math.min(y, 910));
      context.fillText(state.text, print.x + print.w / 2, Math.min(y, 910));
      context.restore();
    }

    if (state.view === "back") {
      const name = (els.nameInput.value || "NAME").toUpperCase();
      const number = (els.numberInput.value || "00").toUpperCase();
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = state.textColor;
      context.strokeStyle = "rgba(255,255,255,.9)";
      context.lineWidth = 9;
      context.font = "900 64px Inter, Arial, sans-serif";
      context.strokeText(name, 600, 430);
      context.fillText(name, 600, 430);
      context.font = "950 210px Inter, Arial, sans-serif";
      context.strokeText(number, 600, 620);
      context.fillText(number, 600, 620);
      context.restore();
    }

    context.fillStyle = "rgba(255,255,255,.92)";
    drawRoundedRect(context, 36, 36, 308, 60, 18);
    context.fillStyle = "#4d22b8";
    context.font = "900 22px Inter, Arial, sans-serif";
    context.fillText("SIS concept preview", 68, 74);
    context.restore();
  }

  function renderCanvas() {
    drawDesign(ctx, 1200);
    drawDesign(miniCtx, 480);
    els.summaryProduct.textContent = state.product.label;
    els.summaryColor.textContent = titleCase(state.color);
    els.summaryView.textContent = state.view === "front" ? "Front" : "Back";
    els.summaryEdits.textContent = String(state.editsRemaining);
    updateCheckoutEnabled();
  }

  function renderProducts() {
    els.productCount.textContent = `${PRODUCTS.length} options`;
    els.productList.innerHTML = "";
    PRODUCTS.forEach((product) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-card";
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-pressed", product.id === state.product.id ? "true" : "false");
      button.setAttribute("aria-label", `${product.label}, ${product.fit}, starts at $${product.price}`);
      button.innerHTML = `<img src="${product.image}" alt="" /><span><strong>${product.label}</strong><span>${product.fit}</span><small>from $${product.price}</small></span>`;
      button.addEventListener("click", () => selectProduct(product.id));
      els.productList.appendChild(button);
    });
  }

  function renderColors() {
    els.selectedColorLabel.textContent = titleCase(state.color);
    els.colorSwatches.innerHTML = "";
    state.product.colors.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.style.setProperty("--swatch", COLOR_HEX[color]);
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", titleCase(color));
      button.setAttribute("aria-checked", color === state.color ? "true" : "false");
      button.addEventListener("click", () => {
        state.color = color;
        state.approved = false;
        els.approveButton.disabled = false;
        renderColors();
        renderCanvas();
      });
      els.colorSwatches.appendChild(button);
    });
  }

  async function selectProduct(productId) {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) return;
    state.product = product;
    state.color = product.colors[0];
    state.approved = false;
    els.approveButton.disabled = false;
    await loadImage(product.image);
    renderProducts();
    renderColors();
    renderCanvas();
  }

  function showPanel(name) {
    document.querySelectorAll(".tool-button").forEach((button) => {
      const active = button.dataset.panel === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.querySelectorAll("[data-panel-content]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panelContent === name);
    });
  }

  function validateUpload(file) {
    if (!file) return "Choose an artwork file.";
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return "Upload PNG, JPG, JPEG, or WEBP artwork.";
    if (file.size > 6_000_000) return "Artwork must be 6MB or smaller.";
    return "";
  }

  function loadUploadedArt(file) {
    const error = validateUpload(file);
    if (error) {
      setStatus(error, "error");
      els.uploadInput.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (state.uploadedArt?.src?.startsWith("blob:")) URL.revokeObjectURL(state.uploadedArt.src);
      state.uploadedArt = image;
      state.uploadedFile = file;
      state.aiArtwork = null;
      state.approved = false;
      els.approveButton.disabled = false;
      setStatus("Uploaded art placed on the garment.", "success");
      renderCanvas();
    };
    image.onerror = () => setStatus("Artwork image could not be read.", "error");
    image.src = url;
  }

  async function loadAiArtwork(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function createLocalArtwork(prompt) {
    const artwork = document.createElement('canvas');
    artwork.width = 720;
    artwork.height = 720;
    const artworkContext = artwork.getContext('2d');
    const gradient = artworkContext.createLinearGradient(0, 0, 720, 720);
    gradient.addColorStop(0, '#6f42d8');
    gradient.addColorStop(1, '#75c7f4');
    artworkContext.fillStyle = gradient;
    artworkContext.fillRect(0, 0, 720, 720);
    artworkContext.fillStyle = 'rgba(255,255,255,.2)';
    artworkContext.beginPath();
    artworkContext.arc(360, 300, 210, 0, Math.PI * 2);
    artworkContext.fill();
    artworkContext.fillStyle = '#fff';
    artworkContext.font = '900 42px Inter, Arial, sans-serif';
    artworkContext.textAlign = 'center';
    artworkContext.textBaseline = 'middle';
    const words = prompt.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (artworkContext.measureText(next).width > 580 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, 5).forEach((text, index) => artworkContext.fillText(text, 360, 500 + index * 52));
    return artwork;
  }

  async function generateAiArtwork(isRefine) {
    const prompt = els.aiPrompt.value.trim();
    if (prompt.length < 12) {
      setStatus("Describe the original artwork you want.", "error");
      return;
    }
    const form = new FormData();
    if (isRefine) {
      form.append("mockupId", state.mockupId);
      form.append("editRequest", prompt);
    } else {
      form.append("garmentId", state.product.id);
      form.append("garmentColor", state.color);
      form.append("size", state.product.sizes[0]);
      form.append("artDescription", prompt);
      if (state.uploadedFile) form.append("referenceImage", state.uploadedFile);
    }
    const button = isRefine ? els.refineAiButton : els.generateAiButton;
    button.disabled = true;
    button.textContent = isRefine ? "Refining..." : "Generating...";
    setStatus("Generating original AI artwork on the server.");
    try {
      const data = await requestJson(isRefine ? "/api/sis/design/mockup/refine" : "/api/sis/design/mockup", {
        method: "POST",
        body: form
      });
      state.mockupId = data.mockup_id;
      state.editsRemaining = data.included_edits_remaining;
      const artworkUrl = data.artwork_url || data.image_url;
      state.aiArtwork = await loadAiArtwork(`${artworkUrl}?v=${Date.now()}`);
      state.uploadedArt = null;
      state.approved = false;
      els.refineAiButton.disabled = state.editsRemaining <= 0;
      els.refineAiButton.textContent = state.editsRemaining <= 0 ? "Included Edits Used" : "Use Included Edit";
      els.approveButton.disabled = false;
      setStatus("AI artwork layer placed on the selected garment.", "success");
      renderCanvas();
    } catch (error) {
      state.mockupId = `local-${crypto.randomUUID()}`;
      state.aiArtwork = createLocalArtwork(prompt);
      state.uploadedArt = null;
      state.approved = false;
      state.editsRemaining = Math.max(0, state.editsRemaining - (isRefine ? 1 : 0));
      els.refineAiButton.disabled = state.editsRemaining <= 0;
      els.approveButton.disabled = false;
      setStatus("The live AI service is unavailable. A local preview is ready; submit it as a quote request.", "success");
      renderCanvas();
      if (!isRefine || state.editsRemaining > 0) button.disabled = false;
    } finally {
      if (!isRefine) {
        els.generateAiButton.disabled = false;
        els.generateAiButton.textContent = "Generate AI Artwork";
      }
    }
  }

  async function loadShopifyVariants() {
    try {
      const data = await requestJson("/api/shopify-catalog.php?limit=50");
      state.variants = data.variants || [];
      els.variantSelect.innerHTML = "";
      if (!state.variants.length) {
        els.variantSelect.innerHTML = '<option value="">No products found</option>';
        setCheckoutMessage("No products are available right now.", "error");
        return;
      }
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Choose a product";
      els.variantSelect.appendChild(empty);
      state.variants.forEach((variant) => {
        const option = document.createElement("option");
        option.value = variant.variant_id;
        option.textContent = `${variant.product?.title || "Custom product"} / ${variant.title}${variant.price ? ` - $${variant.price}` : ""}`;
        els.variantSelect.appendChild(option);
      });
      els.variantSelect.disabled = false;
      setCheckoutMessage("Products are available after design approval.");
    } catch (error) {
      state.variants = PRODUCTS.map((product) => ({
        variant_id: `local-${product.id}`,
        product: { title: product.label },
        title: `${product.fit} / starting at $${product.price}`,
        price: product.price
      }));
      els.variantSelect.innerHTML = '<option value="">Choose a product</option>';
      state.variants.forEach((variant) => {
        const option = document.createElement("option");
        option.value = variant.variant_id;
        option.textContent = `${variant.product.title} / ${variant.title}`;
        els.variantSelect.appendChild(option);
      });
      els.variantSelect.disabled = false;
      setCheckoutMessage("Product options are ready. Submit a quote request to confirm availability and pricing.", "success");
    }
  }

  function updateCheckoutEnabled() {
    els.checkoutButton.disabled = !(state.approved && state.mockupId && els.variantSelect.value);
  }

  async function prepareCheckout(event) {
    event.preventDefault();
    if (!state.approved || !state.mockupId) {
      setCheckoutMessage("Approve an AI design before checkout.", "error");
      return;
    }
    try {
      const data = await requestJson("/api/shopify-checkout.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: state.mockupId,
          variantId: els.variantSelect.value,
          quantity: Number(els.quantityInput.value || 1),
          finalApproval: true
        })
      });
      setCheckoutMessage(data.message, "success");
      window.location.assign(data.checkout_url);
    } catch (error) {
      const product = state.variants.find((variant) => variant.variant_id === els.variantSelect.value);
      const details = [
        `Design studio product: ${product?.product?.title || state.product.label}`,
        `Color: ${titleCase(state.color)}`,
        `Quantity: ${Number(els.quantityInput.value || 1)}`,
        `Design request: ${state.text || els.aiPrompt.value.trim() || 'Custom artwork'}`,
        `Live checkout status: ${error.message}`
      ].join('\n');
      const params = new URLSearchParams({
        service: 'Personalized apparel or gifts',
        details,
        quantity: String(Number(els.quantityInput.value || 1)),
        source: 'design-studio'
      });
      setCheckoutMessage("Payment checkout is not connected on this host. Your design is ready to send as a quote request.", "success");
      window.location.assign(`../contact/index.html?${params.toString()}#request`);
    }
  }

  document.querySelectorAll(".tool-button").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  els.addTextButton.addEventListener("click", () => {
    state.text = els.textInput.value.trim();
    state.textColor = els.textColor.value;
    state.textSize = Number(els.textSize.value || 54);
    state.approved = false;
    els.approveButton.disabled = false;
    renderCanvas();
  });
  els.textColor.addEventListener("input", () => { state.textColor = els.textColor.value; renderCanvas(); });
  els.textSize.addEventListener("input", () => { state.textSize = Number(els.textSize.value); renderCanvas(); });
  els.uploadInput.addEventListener("change", () => loadUploadedArt(els.uploadInput.files[0]));
  els.clearArtButton.addEventListener("click", () => {
    state.uploadedArt = null;
    state.uploadedFile = null;
    state.aiArtwork = null;
    els.uploadInput.value = "";
    renderCanvas();
  });
  els.generateAiButton.addEventListener("click", () => generateAiArtwork(false));
  els.refineAiButton.addEventListener("click", () => generateAiArtwork(true));
  els.frontViewButton.addEventListener("click", () => {
    state.view = "front";
    els.frontViewButton.classList.add("active");
    els.backViewButton.classList.remove("active");
    renderCanvas();
  });
  els.backViewButton.addEventListener("click", () => {
    state.view = "back";
    els.backViewButton.classList.add("active");
    els.frontViewButton.classList.remove("active");
    renderCanvas();
  });
  els.centerArtButton.addEventListener("click", renderCanvas);
  els.placeNameButton.addEventListener("click", () => {
    state.view = "back";
    els.backViewButton.classList.add("active");
    els.frontViewButton.classList.remove("active");
    renderCanvas();
  });
  els.approveButton.addEventListener("click", async () => {
    if (!state.mockupId) {
      setStatus("Generate AI artwork first so approval can be tracked.", "error");
      return;
    }
    try {
      await requestJson("/api/sis/design/mockup/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mockupId: state.mockupId })
      });
      state.approved = true;
      els.approveButton.disabled = true;
      setStatus("Design approved and ready for checkout.", "success");
      setCheckoutMessage("Approved. Choose a product and quantity.", "success");
      updateCheckoutEnabled();
    } catch (error) {
      state.approved = true;
      els.approveButton.disabled = true;
      setStatus("Design approved locally and ready for a quote request.", "success");
      setCheckoutMessage("Approved. Choose a product and submit your quote request.", "success");
      updateCheckoutEnabled();
    }
  });
  els.variantSelect.addEventListener("change", updateCheckoutEnabled);
  els.checkoutForm.addEventListener("submit", prepareCheckout);
  document.querySelectorAll(".step").forEach((step) => step.addEventListener("click", () => {
    document.querySelectorAll(".step").forEach((item) => item.classList.toggle("active", item === step));
  }));

  Promise.all(PRODUCTS.map((product) => loadImage(product.image))).then(() => {
    renderProducts();
    renderColors();
    renderCanvas();
  }).catch(() => {
    setStatus("One or more garment assets failed to load.", "error");
    renderProducts();
    renderColors();
    renderCanvas();
  });
  loadShopifyVariants();
}());

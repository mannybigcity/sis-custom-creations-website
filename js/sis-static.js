/* Static-host helpers. No Shopify storefront, cart, or checkout calls. */
(function () {
  function noteFor(form) {
    var note = form.querySelector("[data-static-form-note]");
    if (!note) {
      note = document.createElement("p");
      note.className = "static-form-note";
      note.setAttribute("data-static-form-note", "");
      note.setAttribute("role", "status");
      form.prepend(note);
    }
    return note;
  }

  var params = new URLSearchParams(window.location.search);
  function setNamedField(form, names, value) {
    if (!value) return;
    names.forEach(function (name) {
      var field = form.elements.namedItem(name);
      if (!field || field.value) return;
      if (field.tagName === "SELECT") {
        var match = Array.prototype.some.call(field.options, function (option) {
          return option.value === value || option.text === value;
        });
        if (!match) {
          var option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          field.appendChild(option);
        }
      }
      field.value = value;
    });
  }

  document.querySelectorAll("form").forEach(function (form) {
    setNamedField(form, ["Service", "Offer"], params.get("service") || params.get("offer"));
    setNamedField(form, ["Project Details", "Details"], params.get("details"));
    setNamedField(form, ["Quantity", "Guest Count"], params.get("quantity"));
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var note = noteFor(form);
      note.textContent = "Online requests are paused while this site moves off Shopify. Email siscustomcreationstx@gmail.com and SIS will follow up. Book / Pay coming soon.";
    });
  });

  document.querySelectorAll("img[data-missing-asset]").forEach(function (image) {
    var note = document.createElement("p");
    note.className = "static-form-note";
    note.textContent = "Photo unavailable from the current public site files (" + image.getAttribute("data-missing-asset") + ").";
    image.replaceWith(note);
  });

  document.querySelectorAll('[data-stripe-link="TODO"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var slot = document.getElementById("checkout") || document.getElementById("pay-coming-soon");
      if (slot && typeof slot.scrollIntoView === "function") {
        slot.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
})();

const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

document.querySelectorAll(".filter-pill").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      const selected = pill === button;
      pill.classList.toggle("selected", selected);
      pill.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll(".dashboard-grid > [data-tags]").forEach((panel) => {
      panel.hidden = filter !== "all" && !panel.dataset.tags.split(" ").includes(filter);
    });
  });
});

document.querySelectorAll("[data-section]").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll("[data-section]").forEach((item) => {
      item.classList.toggle("active", item.dataset.section === link.dataset.section);
    });
  });
});

document.querySelector("#shield-toggle").addEventListener("change", (event) => {
  const label = event.currentTarget.closest(".shield-toggle").querySelector("b");
  label.textContent = event.currentTarget.checked ? "ON" : "OFF";
  showToast(event.currentTarget.checked ? "Slouch Shield is back on." : "Slouch Shield paused.");
});

const actionMessages = {
  scan: "Live optical scan ready — position your phone to begin.",
  diagnostic: "Desk diagnostic started. Keep your camera in view.",
  rep: "Rep flow started — follow the movement cues.",
  coach: "AI form coach is ready to guide your next set.",
  reset: "Micro-reset started. Breathe slowly and move with control.",
  hacks: "Bio-hacks: roll a bath towel for lumbar support; use a shoebox to raise your screen.",
  vault: "Your full cross-discipline exercise vault is coming up.",
  exercise: "Exercise guide opened — review form cues before you begin.",
  shop: "Bio-Gear shop opened with scan-matched tools.",
  product: "Product details opened — scan-matched gear, ready to explore.",
  challenge: "5-second tech-neck challenge started. Hold tall and look straight ahead."
};

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    if (action === "share" || action === "export") {
      const message = "My Apex Biomechanics scan: 14.3° tech-neck score. Small moves. Stronger days.";
      try {
        if (action === "share" && navigator.share) {
          await navigator.share({ title: "My Apex movement snapshot", text: message });
          return;
        }
        await navigator.clipboard.writeText(message);
        showToast(action === "share" ? "Story caption copied — add your biomechanics slide to share." : "IG biomechanics slide caption copied.");
      } catch {
        showToast("Your biomechanics story is ready to share.");
      }
      return;
    }
    showToast(actionMessages[action] || "Your Apex workspace is ready.");
  });
});

document.querySelectorAll(".profile-button,.notification-button").forEach((button) => {
  button.addEventListener("click", () => showToast("You're all caught up."));
});

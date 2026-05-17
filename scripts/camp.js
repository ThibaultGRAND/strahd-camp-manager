// ============================================================
// CAMP.JS — Point d'entrée principal du module
// ============================================================

let campZoneManager = null;
let campApp = null;

Hooks.once("init", () => {
  console.log("Strahd Camp Manager | Initialisation...");

  // Enregistrement du setting de sauvegarde
  game.settings.register("strahd-camp-manager", "campState", {
    name: "État du camp",
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => { if (campApp?.rendered) campApp.render(); }
  });

  // Enregistrement du Handlebars helper pour les boucles de tiers
  Handlebars.registerHelper("range", (n) => Array.from({ length: n }, (_, i) => i + 1));
  Handlebars.registerHelper("repeat", (n, opts) => Array.from({ length: n }).map(() => opts.fn(this)).join(""));
  Handlebars.registerHelper("pct", (val, max) => Math.round((val / max) * 100));
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("inc", (n) => n + 1);
  Handlebars.registerHelper("axeColor", (key) => {
    const colors = { defense: "#8B0000", logement: "#228B22", production: "#DAA520", magie: "#4B0082" };
    return colors[key] || "#333";
  });
  Handlebars.registerHelper("catColor", (cat) => {
    const c = { victory:"#2D6A4F", threat:"#8B0000", build:"#1A3A5C", recruit:"#B5541C", discover:"#4B0082", secret:"#444", neutral:"#666" };
    return c[cat] || "#666";
  });
  Handlebars.registerHelper("catLabel", (cat) => {
    const l = { victory:"Victoire", threat:"Menace", build:"Construction", recruit:"Recrutement", discover:"Découverte", secret:"Secret MJ", neutral:"Neutre" };
    return l[cat] || cat;
  });
  Handlebars.registerHelper("sign", (n) => n >= 0 ? `+${n}` : `${n}`);
  Handlebars.registerHelper("abs", (n) => Math.abs(n));
});

Hooks.once("ready", () => {
  campZoneManager = new CampZoneManager();
  campApp = new CampManagerApp(campZoneManager);

  // Sync en temps réel entre MJ et joueurs
  game.socket.on("module.strahd-camp-manager", async (data) => {
    if (data.type === "stateUpdate") {
      campZoneManager.state = data.state;
      if (campApp?.rendered) campApp.render();
    }
  });

  // Override saveState pour émettre aux joueurs
  const origSave = campZoneManager.saveState.bind(campZoneManager);
  campZoneManager.saveState = async function() {
    await origSave();
    if (game.user.isGM) {
      game.socket.emit("module.strahd-camp-manager", {
        type: "stateUpdate",
        state: campZoneManager.state
      });
    }
  };

  console.log("Strahd Camp Manager | Prêt !");
});

// Bouton dans la barre de scène
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;
  tokenControls.tools.push({
    name: "strahd-camp",
    title: "Sanctuaire d'Austrade",
    icon: "fa-solid fa-campground",
    button: true,
    onClick: () => {
      if (!campApp) return;
      if (campApp.rendered) campApp.bringToTop();
      else campApp.render(true);
    }
  });
});

// Bouton dans la barre de macros / raccourci clavier
Hooks.on("renderSidebar", () => {
  // rien ici, on passe par le SceneControl
});

// Macro helper (optionnel)
window.openCampManager = () => {
  if (!campApp) return;
  if (campApp.rendered) campApp.bringToTop();
  else campApp.render(true);
};

// Écoute des mises à jour d'état
Hooks.on("campStateUpdated", (state) => {
  if (game.user.isGM && state.axes?.magie === 0 && state.barrierActive) {
    ui.notifications.error("⚠️ La barrière d'Austrade est tombée ! Strahd peut localiser le camp !", { permanent: true });
  }
});

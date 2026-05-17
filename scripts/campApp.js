// ============================================================
// CAMP APP — Interface principale ApplicationV2 Foundry V13
// ============================================================

class CampManagerApp extends foundry.applications.api.ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id: "strahd-camp-manager",
    classes: ["strahd-camp"],
    tag: "div",
    window: {
      title: "⛺ Sanctuaire d'Austrade",
      icon: "fa-solid fa-campground",
      resizable: true,
      minimizable: true,
    },
    position: { width: 1100, height: 750, top: 50, left: 50 },
    actions: {}
  };

  static PARTS = {
    main: { template: "modules/strahd-camp-manager/templates/camp-main.hbs" }
  };

  constructor(zoneManager) {
    super();
    this.zoneManager = zoneManager;
    this._activeTab = "map";
    this._selectedZone = null;
    this._buildMode = false;
    this._selectedBuilding = null;
    this._draggingBuild = false;
  }

  async _prepareContext(options) {
    const state = this.zoneManager.getState();
    const upkeep = this.zoneManager.getUpkeep();
    const malus = this.zoneManager.getMalusActifs();

    // Enrichir les zones avec état
    const zones = CAMP_ZONES.map(z => {
      const zd = state.zoneData[z.id] || { cleared: false, buildingId: null };
      const building = zd.buildingId ? CAMP_BUILDINGS[zd.buildingId] : null;
      return {
        ...z,
        cleared: zd.cleared,
        buildingId: zd.buildingId,
        building,
        canClear: z.type === "forest" && !zd.cleared && game.user.isGM,
        canBuild: zd.cleared && !zd.buildingId && z.type !== "water",
      };
    });

    // Grouper les bâtiments par tier
    const buildingsByTier = { 1: [], 2: [], 3: [], 4: [] };
    Object.values(CAMP_BUILDINGS).forEach(b => {
      const built = this.zoneManager.isBuilt(b.id);
      const canBuild = this.zoneManager.canBuild(b.id);
      const affordable = this.zoneManager.canAfford(b.cost);
      buildingsByTier[b.tier].push({
        ...b,
        built,
        available: !built && canBuild,
        locked: !built && !canBuild,
        affordable,
        statusLabel: built ? "✓ Construit" : canBuild ? (affordable ? "Disponible" : "Fonds insuffisants") : "Verrouillé",
        missingReqs: b.requires.filter(r => !this.zoneManager.isBuilt(r)).map(r => CAMP_BUILDINGS[r].name)
      });
    });

    // Axes de progression
    const axes = [
      { key: "defense",    label: "Défense",    val: state.axes.defense,    max: 5, color: "#8B0000", icon: "🛡️" },
      { key: "logement",   label: "Logement",   val: state.axes.logement,   max: 5, color: "#228B22", icon: "🏠" },
      { key: "production", label: "Production",  val: state.axes.production, max: 5, color: "#DAA520", icon: "⚙️" },
      { key: "magie",      label: "Magie",       val: state.axes.magie,      max: 5, color: "#4B0082", icon: "✨" },
    ].map(a => ({ ...a, pct: Math.round((a.val / a.max) * 100), warn: a.val <= 1 }));

    // Sessions enrichies
    const sessions = (state.sessions || []).map((s, i) => ({
      ...s, cumul: state.sessions.slice(0, i + 1).reduce((acc, x) => acc + x.pts, 0)
    }));

    return {
      isGM: game.user.isGM,
      activeTab: this._activeTab,
      state, zones, buildingsByTier, axes, sessions,
      upkeep, malus,
      residents: state.residents || [],
      events: (state.events || []).filter(e => game.user.isGM || e.visible),
      transactions: (state.transactions || []).slice(0, 15),
      barrierActive: state.barrierActive,
      traitorAlert: !state.traitorRevealed && game.user.isGM,
      selectedBuilding: this._selectedBuilding,
      buildMode: this._buildMode,
      pointsColor: state.points <= 0 ? "#cc0000" : state.points <= 5 ? "#cc6600" : "#2D6A4F",
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const html = this.element;
    this._bindTabs(html);
    this._bindMap(html);
    this._bindControls(html);
  }

  _bindTabs(html) {
    html.querySelectorAll(".camp-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeTab = btn.dataset.tab;
        this.render();
      });
    });
  }

  _bindMap(html) {
    const mapWrap = html.querySelector(".camp-map-wrap");
    if (!mapWrap) return;

    // Zones cliquables
    html.querySelectorAll(".camp-zone").forEach(zoneEl => {
      const zoneId = zoneEl.dataset.zoneId;
      const zone = CAMP_ZONES.find(z => z.id === zoneId);
      const zd = this.zoneManager.getZoneData(zoneId);

      zoneEl.addEventListener("mouseenter", () => this._showZoneTooltip(zoneEl, zone, zd));
      zoneEl.addEventListener("mouseleave", () => this._hideTooltip(html));

      zoneEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!game.user.isGM) {
          // Joueurs : juste info
          this._showZoneInfo(zone, zd);
          return;
        }

        if (this._buildMode && this._selectedBuilding && zd.cleared && !zd.buildingId) {
          // Mode construction : placer le bâtiment
          await this.zoneManager.buildOnZone(zoneId, this._selectedBuilding);
          this._buildMode = false;
          this._selectedBuilding = null;
          this.render();
        } else if (zone.type === "forest" && !zd.cleared) {
          // Déboiser
          await this.zoneManager.clearZone(zoneId);
          this.render();
        } else if (zd.cleared && !zd.buildingId) {
          // Zone vide : choisir un bâtiment
          await this._openBuildDialog(zoneId);
        } else if (zd.buildingId) {
          // Zone avec bâtiment : options
          await this._openBuildingOptions(zoneId, zd.buildingId);
        }
      });

      // Clic droit MJ : démolir
      if (game.user.isGM) {
        zoneEl.addEventListener("contextmenu", async (e) => {
          e.preventDefault();
          if (zd.buildingId) await this.zoneManager.demolishOnZone(zoneId);
          this.render();
        });
      }
    });

    // Annuler mode construction
    mapWrap.addEventListener("click", () => {
      if (this._buildMode) {
        this._buildMode = false; this._selectedBuilding = null;
        this.render();
      }
    });
  }

  _showZoneTooltip(el, zone, zd) {
    // handled via CSS :hover tooltip
  }

  _hideTooltip(html) {}

  async _openBuildDialog(zoneId) {
    const state = this.zoneManager.getState();
    const available = Object.values(CAMP_BUILDINGS).filter(b => {
      return !this.zoneManager.isBuilt(b.id);
    });

    // Build HTML options
    const rows = [1, 2, 3, 4].map(tier => {
      const tierBuildings = available.filter(b => b.tier === tier);
      if (!tierBuildings.length) return "";
      const cards = tierBuildings.map(b => {
        const canBuild = this.zoneManager.canBuild(b.id);
        const affordable = this.zoneManager.canAfford(b.cost);
        const ok = canBuild && affordable;
        const missing = b.requires.filter(r => !this.zoneManager.isBuilt(r)).map(r => CAMP_BUILDINGS[r].name).join(", ");
        return `
          <div class="build-card ${ok ? 'build-card--ok' : 'build-card--locked'}" data-id="${b.id}" title="${b.desc}">
            <div class="build-card__icon">${b.icon}</div>
            <div class="build-card__name">${b.name}</div>
            <div class="build-card__cost">${b.cost} pts</div>
            ${!canBuild ? `<div class="build-card__req">Req: ${missing}</div>` : ""}
            ${canBuild && !affordable ? `<div class="build-card__req">Fonds insuffisants</div>` : ""}
          </div>`;
      }).join("");
      return `<div class="build-tier"><div class="build-tier__label">Tier ${tier}</div><div class="build-tier__cards">${cards}</div></div>`;
    }).join("");

    const content = `
      <div class="camp-build-dialog">
        <p style="margin-bottom:12px;color:#666">Points disponibles : <strong style="color:#2D6A4F">${state.points}</strong></p>
        ${rows || "<p>Tous les bâtiments sont construits !</p>"}
      </div>`;

    const dialog = new Dialog({
      title: "Que construire ici ?",
      content,
      buttons: { cancel: { label: "Annuler" } },
      render: (html) => {
        html.querySelectorAll(".build-card--ok").forEach(card => {
          card.addEventListener("click", async () => {
            const buildingId = card.dataset.id;
            dialog.close();
            await this.zoneManager.buildOnZone(zoneId, buildingId);
            this.render();
          });
        });
      },
      default: "cancel"
    }, { width: 600 });
    dialog.render(true);
  }

  async _openBuildingOptions(zoneId, buildingId) {
    const b = CAMP_BUILDINGS[buildingId];
    const content = `
      <div style="font-family:serif;padding:8px">
        <h2 style="color:#4A3728">${b.icon} ${b.name}</h2>
        <p style="color:#666;font-style:italic;margin-bottom:8px">${b.flavor}</p>
        <p>${b.desc}</p>
        <hr style="margin:10px 0">
        <p><strong>Bonus :</strong></p>
        <ul>${b.bonuses.map(bx => `<li>${bx}</li>`).join("")}</ul>
        <hr style="margin:10px 0">
        <p style="font-size:11px;color:#999">Clic droit sur la zone pour démolir (remboursement 50%).</p>
      </div>`;

    new Dialog({
      title: b.name,
      content,
      buttons: { ok: { label: "Fermer" } },
      default: "ok"
    }, { width: 420 }).render(true);
  }

  _showZoneInfo(zone, zd) {
    const b = zd.buildingId ? CAMP_BUILDINGS[zd.buildingId] : null;
    const content = b
      ? `<div style="padding:8px;font-family:serif"><h3>${b.icon} ${b.name}</h3><p>${b.desc}</p><ul>${b.bonuses.map(x=>`<li>${x}</li>`).join("")}</ul></div>`
      : `<p style="padding:8px">${zone.label} — ${zd.cleared ? "Zone disponible" : zone.type === "forest" ? "Forêt dense (à déboiser)" : "Eau"}</p>`;
    new Dialog({ title: zone.label, content, buttons: { ok: { label: "OK" } }, default: "ok" }, { width: 380 }).render(true);
  }

  _bindControls(html) {
    // Onglet sessions — ajouter
    html.querySelector("#btn-add-session")?.addEventListener("click", () => this._addSession(html));

    // Points manuels
    html.querySelector("#btn-add-points")?.addEventListener("click", () => this._addPointsDialog());

    // Upkeep
    html.querySelector("#btn-upkeep")?.addEventListener("click", async () => {
      await this.zoneManager.triggerUpkeep();
      this.render();
    });

    // Ajouter événement
    html.querySelector("#btn-add-event")?.addEventListener("click", () => this._addEventDialog());

    // Toggle événement visible
    html.querySelectorAll(".event-toggle").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.idx);
        const state = this.zoneManager.getState();
        if (state.events[idx]) {
          state.events[idx].visible = !state.events[idx].visible;
          await this.zoneManager.saveState();
          this.render();
        }
      });
    });
  }

  async _addSession(html) {
    if (!game.user.isGM) return;
    const title = html.querySelector("#sess-title")?.value?.trim();
    const pts = parseInt(html.querySelector("#sess-pts")?.value) || 0;
    if (!title || !pts) { ui.notifications.warn("Remplir titre et points."); return; }
    const state = this.zoneManager.getState();
    state.sessions.push({ num: state.sessions.length + 1, title, pts, date: new Date().toLocaleDateString("fr-FR") });
    await this.zoneManager.addPoints(pts, `Session ${state.sessions.length} : ${title}`);
    this.render();
  }

  async _addPointsDialog() {
    const content = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:8px">
        <label>Nombre de points (négatif pour retirer)
          <input type="number" id="pts-amount" style="width:100%;margin-top:4px;padding:6px;border:1px solid #ccc;border-radius:4px" value="0">
        </label>
        <label>Raison
          <input type="text" id="pts-reason" style="width:100%;margin-top:4px;padding:6px;border:1px solid #ccc;border-radius:4px" placeholder="Ex : Objectif accompli">
        </label>
      </div>`;
    new Dialog({
      title: "Modifier les points",
      content,
      buttons: {
        ok: { label: "Confirmer", callback: async (html) => {
          const amt = parseInt(html.find("#pts-amount").val()) || 0;
          const reason = html.find("#pts-reason").val() || "Ajustement MJ";
          await this.zoneManager.addPoints(amt, reason);
          this.render();
        }},
        cancel: { label: "Annuler" }
      }, default: "ok"
    }, { width: 360 }).render(true);
  }

  async _addEventDialog() {
    const content = `
      <div style="display:flex;flex-direction:column;gap:8px;padding:8px">
        <input id="ev-title" placeholder="Titre de l'événement" style="padding:6px;border:1px solid #ccc;border-radius:4px">
        <textarea id="ev-text" placeholder="Description..." style="padding:6px;border:1px solid #ccc;border-radius:4px;min-height:60px;resize:vertical"></textarea>
        <select id="ev-cat" style="padding:6px;border:1px solid #ccc;border-radius:4px">
          <option value="victory">Victoire</option>
          <option value="threat">Menace</option>
          <option value="build">Construction</option>
          <option value="recruit">Recrutement</option>
          <option value="discover">Découverte</option>
          <option value="secret">Secret MJ</option>
          <option value="neutral">Neutre</option>
        </select>
        <label style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" id="ev-visible" checked> Visible par les joueurs
        </label>
        <input type="number" id="ev-pts" placeholder="Points liés (optionnel)" style="padding:6px;border:1px solid #ccc;border-radius:4px">
      </div>`;
    new Dialog({
      title: "Ajouter un événement",
      content,
      buttons: {
        ok: { label: "Ajouter", callback: async (html) => {
          const state = this.zoneManager.getState();
          const title = html.find("#ev-title").val().trim();
          if (!title) return;
          const ev = {
            id: `e${Date.now()}`,
            title,
            text: html.find("#ev-text").val(),
            category: html.find("#ev-cat").val(),
            visible: html.find("#ev-visible").is(":checked"),
            pts: parseInt(html.find("#ev-pts").val()) || 0,
            session: state.sessions.length
          };
          if (!state.events) state.events = [];
          state.events.unshift(ev);
          await this.zoneManager.saveState();
          this.render();
        }},
        cancel: { label: "Annuler" }
      }, default: "ok"
    }, { width: 420 }).render(true);
  }
}

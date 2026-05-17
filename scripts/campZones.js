// ============================================================
// CAMP ZONES — Gestion des zones et placement des bâtiments
// ============================================================

class CampZoneManager {
  constructor() {
    this.state = this._loadState();
  }

  _loadState() {
    const saved = game.settings.get("strahd-camp-manager", "campState");
    if (saved && Object.keys(saved).length > 0) return saved;
    // Init zones par défaut
    const s = foundry.utils.deepClone(CAMP_DEFAULT_STATE);
    CAMP_ZONES.forEach(z => {
      s.zoneData[z.id] = { cleared: z.cleared ?? false, buildingId: null };
    });
    return s;
  }

  async saveState() {
    await game.settings.set("strahd-camp-manager", "campState", this.state);
    Hooks.callAll("campStateUpdated", this.state);
  }

  getState() { return this.state; }

  getPoints() { return this.state.points; }
  getTotal()  { return this.state.pointsTotal; }

  getBuilt()  { return this.state.built; }
  isBuilt(id) { return this.state.built.includes(id); }

  getZoneData(zoneId) {
    return this.state.zoneData[zoneId] || { cleared: false, buildingId: null };
  }

  getBuildingOnZone(zoneId) {
    const zd = this.getZoneData(zoneId);
    return zd.buildingId ? CAMP_BUILDINGS[zd.buildingId] : null;
  }

  // Prérequis satisfaits ?
  canBuild(buildingId) {
    const b = CAMP_BUILDINGS[buildingId];
    if (!b) return false;
    return b.requires.every(req => this.isBuilt(req));
  }

  // Peut-on se permettre ?
  canAfford(cost) { return this.state.points >= cost; }

  // Peut-on construire sur cette zone ?
  canBuildOnZone(zoneId, buildingId) {
    const zd = this.getZoneData(zoneId);
    const zone = CAMP_ZONES.find(z => z.id === zoneId);
    if (!zone) return { ok: false, reason: "Zone introuvable." };
    if (zone.type === "water") return { ok: false, reason: "On ne peut pas construire sur l'eau." };
    if (!zd.cleared) return { ok: false, reason: "Cette zone doit d'abord être déboisée." };
    if (zd.buildingId) return { ok: false, reason: "Un bâtiment occupe déjà cet emplacement." };
    if (!this.canBuild(buildingId)) {
      const missing = CAMP_BUILDINGS[buildingId].requires
        .filter(r => !this.isBuilt(r))
        .map(r => CAMP_BUILDINGS[r].name).join(", ");
      return { ok: false, reason: `Prérequis manquants : ${missing}` };
    }
    if (!this.canAfford(CAMP_BUILDINGS[buildingId].cost))
      return { ok: false, reason: `Points insuffisants (coût : ${CAMP_BUILDINGS[buildingId].cost} pts, disponibles : ${this.state.points} pts).` };
    return { ok: true };
  }

  // Déboiser une zone
  async clearZone(zoneId) {
    if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut déboiser une zone.");
    const zone = CAMP_ZONES.find(z => z.id === zoneId);
    if (!zone || zone.type !== "forest") return;
    const cost = zone.clearCost || 2;
    if (!this.canAfford(cost)) {
      ui.notifications.warn(`Pas assez de points (coût : ${cost} pts, disponibles : ${this.state.points}).`);
      return;
    }
    const confirm = await Dialog.confirm({
      title: "Déboiser la zone",
      content: `<p>Déboiser <strong>${zone.label}</strong> coûte <strong>${cost} points</strong>.<br>Points disponibles : ${this.state.points}</p>`,
      yes: () => true, no: () => false, defaultYes: false
    });
    if (!confirm) return;
    this.state.zoneData[zoneId].cleared = true;
    this.state.points -= cost;
    this._logTransaction(-cost, `Déboisage : ${zone.label}`);
    await this.saveState();
    ui.notifications.info(`Zone "${zone.label}" déboisée !`);
  }

  // Construire un bâtiment sur une zone
  async buildOnZone(zoneId, buildingId) {
    if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut construire.");
    const check = this.canBuildOnZone(zoneId, buildingId);
    if (!check.ok) { ui.notifications.warn(check.reason); return; }
    const b = CAMP_BUILDINGS[buildingId];
    const confirm = await Dialog.confirm({
      title: `Construire : ${b.name}`,
      content: `
        <div style="font-family:serif;padding:8px">
          <h3 style="color:#4A3728">${b.icon} ${b.name}</h3>
          <p style="color:#666;font-style:italic">${b.flavor}</p>
          <p>${b.desc}</p>
          <hr>
          <p><strong>Coût :</strong> ${b.cost} pts &nbsp;|&nbsp; <strong>Disponibles :</strong> ${this.state.points} pts</p>
          <p><strong>Bonus :</strong> ${b.bonuses.join(" · ")}</p>
        </div>`,
      yes: () => true, no: () => false, defaultYes: false
    });
    if (!confirm) return;

    this.state.built.push(buildingId);
    this.state.zoneData[zoneId].buildingId = buildingId;
    this.state.points -= b.cost;
    // Mise à jour de l'axe
    this.state.axes[b.axe] = Math.min(5, (this.state.axes[b.axe] || 0) + b.axeVal);
    this._logTransaction(-b.cost, `Construction : ${b.name}`);
    await this.saveState();
    ui.notifications.info(`${b.name} construit !`);
  }

  // Démolir un bâtiment (MJ uniquement)
  async demolishOnZone(zoneId) {
    if (!game.user.isGM) return;
    const zd = this.getZoneData(zoneId);
    if (!zd.buildingId) return;
    const b = CAMP_BUILDINGS[zd.buildingId];
    const confirm = await Dialog.confirm({
      title: "Démolir le bâtiment",
      content: `<p>Démolir <strong>${b.name}</strong> ? L'axe <em>${b.axe}</em> sera réduit de ${b.axeVal}. Remboursement : ${Math.floor(b.cost/2)} pts.</p>`,
      yes: () => true, no: () => false, defaultYes: false
    });
    if (!confirm) return;
    this.state.built = this.state.built.filter(id => id !== zd.buildingId);
    this.state.axes[b.axe] = Math.max(0, (this.state.axes[b.axe] || 0) - b.axeVal);
    const refund = Math.floor(b.cost / 2);
    this.state.points += refund;
    this._logTransaction(refund, `Démolition : ${b.name}`);
    this.state.zoneData[zoneId].buildingId = null;
    await this.saveState();
    ui.notifications.info(`${b.name} démoli. Remboursement : ${refund} pts.`);
  }

  // Ajouter des points (MJ)
  async addPoints(amount, reason = "") {
    if (!game.user.isGM) return;
    this.state.points += amount;
    if (amount > 0) this.state.pointsTotal += amount;
    this._logTransaction(amount, reason || (amount > 0 ? "Gain de points" : "Dépense de points"));
    await this.saveState();
  }

  _logTransaction(amount, label) {
    if (!this.state.transactions) this.state.transactions = [];
    this.state.transactions.unshift({
      id: Date.now(), amount, label,
      date: new Date().toLocaleDateString("fr-FR"),
      balance: this.state.points
    });
    if (this.state.transactions.length > 50) this.state.transactions.pop();
  }

  // Calcul upkeep
  getUpkeep() {
    const buildUpkeep = this.state.built.reduce((s, id) => s + (CAMP_BUILDINGS[id]?.upkeep || 0), 0);
    const residentUpkeep = (this.state.residents || [])
      .filter(r => r.status === "active")
      .reduce((s, r) => s + (r.upkeep || 0), 0);
    return buildUpkeep + residentUpkeep;
  }

  // Déclencher upkeep mensuel
  async triggerUpkeep() {
    if (!game.user.isGM) return;
    const cost = this.getUpkeep();
    const confirm = await Dialog.confirm({
      title: "Upkeep mensuel",
      content: `<p>Déclencher l'upkeep mensuel de <strong>${cost} pts</strong> ?<br>Points disponibles : ${this.state.points}</p>`,
      yes: () => true, no: () => false
    });
    if (!confirm) return;
    await this.addPoints(-cost, "Upkeep mensuel");
    ui.notifications.info(`Upkeep de ${cost} pts prélevé.`);
  }

  getMalusActifs() {
    const ax = this.state.axes;
    const malus = [];
    if (ax.defense <= 1)   malus.push({ label: "Défense faible", text: "Pas d'alerte automatique, -2 Perception camp", color: "#cc0000" });
    if (ax.logement <= 1)  malus.push({ label: "Moral bas", text: "Résidents -1 à tous jets, repos long = 50% HP", color: "#cc6600" });
    if (ax.production <= 1)malus.push({ label: "Disette", text: "Pas de fabrication, potions +1pt", color: "#cc6600" });
    if (ax.magie === 0)    malus.push({ label: "BARRIÈRE TOMBÉE", text: "Strahd peut localiser le camp !", color: "#880000" });
    else if (ax.magie <= 1)malus.push({ label: "Magie faible", text: "Barrière affaiblie, sorts -1 DD", color: "#cc6600" });
    if (ax.logement >= ax.production + 2)
      malus.push({ label: "Surpopulation", text: "Logement >> Production : upkeep +3/mois", color: "#884400" });
    return malus;
  }
}

// ============================================================
// CAMP DATA — Données centrales du camp d'Austrade
// ============================================================

const CAMP_BUILDINGS = {
  // ─── TIER I ───────────────────────────────────────────────
  poste_garde: {
    id: "poste_garde", tier: 1, name: "Poste de Garde",
    icon: "🗼", emoji: "🗼",
    desc: "Sentinelles permanentes. Avertissement en cas d'approche ennemie.",
    flavor: "Des yeux dans l'ombre de la forêt de Svalich.",
    cost: 5, upkeep: 0,
    requires: [],
    axe: "defense", axeVal: 1,
    bonuses: ["Alarme automatique si ennemi à <500m", "Avantage sur jets de Perception du camp", "+1 à l'initiative de tout le groupe"],
    unlocks: ["palissade", "salle_entrainement"],
    color: "#8B4513"
  },
  palissade: {
    id: "palissade", tier: 1, name: "Palissade",
    icon: "🪵", emoji: "🪵",
    desc: "Mur de bois autour du périmètre. Défense basique.",
    flavor: "Le bois de Svalich est dur comme l'acier.",
    cost: 4, upkeep: 0,
    requires: ["poste_garde"],
    axe: "defense", axeVal: 1,
    bonuses: ["CA du camp +2", "Ralentit les assaillants (terrain difficile)", "+1 Défense"],
    unlocks: ["donjon", "tour_guet"],
    color: "#8B4513"
  },
  infirmerie: {
    id: "infirmerie", tier: 1, name: "Infirmerie",
    icon: "⛺", emoji: "⛺",
    desc: "Soins accélérés entre les sessions.",
    flavor: "Les herbes de Barovia ont des propriétés étranges.",
    cost: 6, upkeep: 0,
    requires: [],
    axe: "logement", axeVal: 1,
    bonuses: ["Repos long restaure 100% HP", "Stabilisation auto 1 PJ/session à 0HP", "+1 Logement"],
    unlocks: ["bibliotheque", "autel"],
    color: "#228B22"
  },
  entrepot: {
    id: "entrepot", tier: 1, name: "Entrepôt",
    icon: "🏚️", emoji: "🏚️",
    desc: "Stockage organisé. Gestion des ressources.",
    flavor: "Ce qu'on accumule dans l'ombre protège dans la lumière.",
    cost: 4, upkeep: 0,
    requires: [],
    axe: "production", axeVal: 1,
    bonuses: ["Ressources ×1.5", "Stockage 30 jours", "+1 Production"],
    unlocks: ["atelier"],
    color: "#DAA520"
  },

  // ─── TIER II ──────────────────────────────────────────────
  atelier: {
    id: "atelier", tier: 2, name: "Atelier",
    icon: "🔨", emoji: "🔨",
    desc: "Fabrication d'équipements simples et réparations.",
    flavor: "Les mains calleuses font les guerriers survivants.",
    cost: 7, upkeep: 1,
    requires: ["entrepot"],
    axe: "production", axeVal: 1,
    bonuses: ["Fabrique flèches, torches, outils", "Permet recrutement Artisan", "+1 Production"],
    unlocks: ["forge", "atelier_alchimique"],
    color: "#DAA520"
  },
  forge: {
    id: "forge", tier: 2, name: "Forge & Armurerie",
    icon: "⚒️", emoji: "⚒️",
    desc: "Amélioration des armes et armures des aventuriers.",
    flavor: "L'acier trempé dans l'eau de Svalich résiste aux créatures de la nuit.",
    cost: 9, upkeep: 1,
    requires: ["atelier"],
    axe: "production", axeVal: 1,
    bonuses: ["Amélioration d'arme Tier I (2pts)", "Amélioration d'arme Tier II si +Bibliothèque", "Maîtrise d'arme Tier III si +Autel", "+1 Défense"],
    unlocks: [],
    color: "#B22222"
  },
  bibliotheque: {
    id: "bibliotheque", tier: 2, name: "Bibliothèque",
    icon: "📚", emoji: "📚",
    desc: "Grimoires et cartes de Barovia. Sorts de connaissance.",
    flavor: "Van Richten y a laissé quelques notes... inquiétantes.",
    cost: 8, upkeep: 1,
    requires: ["infirmerie"],
    axe: "magie", axeVal: 1,
    bonuses: ["+1 Arcane/Histoire/Religion pour tous les PJ", "Identification gratuite 1/session", "Débloque sorts de connaissance", "+1 Magie"],
    unlocks: ["atelier_alchimique", "autel"],
    color: "#4B0082"
  },
  autel: {
    id: "autel", tier: 2, name: "Autel Consacré",
    icon: "✨", emoji: "✨",
    desc: "Lieu saint. Renforce la barrière d'Enry.",
    flavor: "La lumière ici brûle les yeux de ceux qui servent le seigneur des ténèbres.",
    cost: 10, upkeep: 0,
    requires: ["infirmerie"],
    axe: "magie", axeVal: 2,
    bonuses: ["Barrière renforcée", "Sanctification 1/semaine", "Résistance à la Peur de Strahd (tous PJ)", "+2 Magie"],
    unlocks: ["nexus"],
    color: "#FFD700"
  },
  salle_entrainement: {
    id: "salle_entrainement", tier: 2, name: "Salle d'Entraînement",
    icon: "⚔️", emoji: "⚔️",
    desc: "Entraînement des recrues et des PJ.",
    flavor: "Cohortys peut y superviser l'entraînement entre les sessions.",
    cost: 8, upkeep: 1,
    requires: ["poste_garde"],
    axe: "defense", axeVal: 1,
    bonuses: ["PNJ du camp : +1 attaque", "Débloque recrutement Guerrier", "+1 Défense"],
    unlocks: ["tour_guet"],
    color: "#8B0000"
  },

  // ─── TIER III ─────────────────────────────────────────────
  atelier_alchimique: {
    id: "atelier_alchimique", tier: 3, name: "Atelier Alchimique",
    icon: "⚗️", emoji: "⚗️",
    desc: "Production de potions, antidotes et consommables.",
    flavor: "L'odeur de soufre et d'herbes mêlés réveille les morts.",
    cost: 12, upkeep: 2,
    requires: ["atelier", "bibliotheque"],
    axe: "production", axeVal: 1,
    bonuses: ["1 potion de soin/semaine gratuite", "Huile d'argent (3 doses/sem)", "Fumigène sacré (2 doses/sem)", "+1 Production"],
    unlocks: ["nexus"],
    color: "#006400"
  },
  donjon: {
    id: "donjon", tier: 3, name: "Donjon / Prison",
    icon: "🔒", emoji: "🔒",
    desc: "Cellule sécurisée pour prisonniers et interrogatoires.",
    flavor: "Tildo n'aurait pas dû finir là... ou peut-être que si.",
    cost: 10, upkeep: 0,
    requires: ["palissade", "poste_garde"],
    axe: "defense", axeVal: 1,
    bonuses: ["Interrogatoire de prisonniers", "Avantage sur Persuasion/Intimidation", "+1 Défense"],
    unlocks: [],
    color: "#696969"
  },
  tour_guet: {
    id: "tour_guet", tier: 3, name: "Tour de Guet",
    icon: "🏰", emoji: "🏰",
    desc: "Vision étendue sur la forêt. Portée d'alarme maximale.",
    flavor: "Par temps clair, on voit les tours du château Ravenloft.",
    cost: 15, upkeep: 1,
    requires: ["palissade", "salle_entrainement"],
    axe: "defense", axeVal: 2,
    bonuses: ["Portée alarme 1 km", "Jamais surpris dans rayon 1km", "+4 initiative si ennemi vient du camp", "+2 Défense"],
    unlocks: [],
    color: "#8B4513"
  },

  // ─── TIER IV ──────────────────────────────────────────────
  nexus: {
    id: "nexus", tier: 4, name: "Nexus Magique",
    icon: "🔮", emoji: "🔮",
    desc: "Canal d'énergie lié à la barrière d'Enry. Puissance maximale.",
    flavor: "Enry pose sa main sur la pierre et murmure dans une langue oubliée.",
    cost: 20, upkeep: 2,
    requires: ["autel", "bibliotheque", "atelier_alchimique"],
    axe: "magie", axeVal: 2,
    bonuses: ["Emplacement sort bonus Niv.3 (tous lanceurs)", "Glyphe de garde disponible", "Mur de force 1/repos long", "Gardien permanent possible", "+2 Magie"],
    unlocks: [],
    color: "#8B008B"
  }
};

// Zones sur la carte (positions en % de l'image)
// La carte fait 1080×1080, zones calibrées sur les espaces dégagés
const CAMP_ZONES = [
  // Centre-bas : zone principale dégagée (là où sont les planches)
  { id: "z1",  x: 48, y: 58, label: "Zone centrale",      type: "buildable", size: "large",  cleared: true  },
  { id: "z2",  x: 55, y: 62, label: "Rive est",           type: "buildable", size: "medium", cleared: true  },
  { id: "z3",  x: 43, y: 65, label: "Clairière sud-ouest",type: "buildable", size: "medium", cleared: true  },
  // Zones à déboiser — forêt dense
  { id: "z4",  x: 35, y: 55, label: "Forêt ouest",        type: "forest",    size: "large",  cleared: false, clearCost: 3 },
  { id: "z5",  x: 60, y: 50, label: "Forêt est",          type: "forest",    size: "large",  cleared: false, clearCost: 3 },
  { id: "z6",  x: 50, y: 72, label: "Forêt sud",          type: "forest",    size: "medium", cleared: false, clearCost: 2 },
  { id: "z7",  x: 38, y: 72, label: "Berge sud-ouest",    type: "forest",    size: "small",  cleared: false, clearCost: 2 },
  { id: "z8",  x: 63, y: 68, label: "Lisière est",        type: "forest",    size: "small",  cleared: false, clearCost: 2 },
  // Zone de rivière — non constructible
  { id: "z9",  x: 48, y: 48, label: "Pont nord",          type: "water",     size: "small",  cleared: false },
  { id: "z10", x: 30, y: 40, label: "Lac ouest",          type: "water",     size: "large",  cleared: false },
];

const CAMP_DEFAULT_STATE = {
  points: 14,
  pointsTotal: 28,
  upkeepMonthly: 5,
  axes: { defense: 1, logement: 1, production: 1, magie: 2 },
  built: [],          // IDs des bâtiments construits
  zoneData: {},       // { zoneId: { cleared: bool, buildingId: string|null } }
  sessions: [
    { num: 1, title: "Arrivée à Barovia — Maison Deurtz", pts: 4, date: "" },
    { num: 2, title: "Village de Barovia — Combat vampire", pts: 6, date: "" },
    { num: 3, title: "Camp des Vistani — Luvash, mort d'Arxen", pts: 8, date: "" },
    { num: 4, title: "Découverte du campement — barrière d'Enry", pts: 10, date: "" },
  ],
  residents: [
    { id: "enry",      name: "Enry",          role: "Mage kobold → humain", upkeep: 0, status: "active", secret: "Transformation en cours. Les joueurs ignorent.", bonus: "Barrière anti-Strahd active" },
    { id: "nejo",      name: "Nejo",           role: "Guide local",          upkeep: 1, status: "active", secret: "", bonus: "Avantage Navigation forêt" },
    { id: "villagers", name: "3 Villageois",   role: "Main d'œuvre",         upkeep: 3, status: "active", secret: "", bonus: "Entretien automatique du camp" },
  ],
  events: [
    { id: "e1", title: "Barrière érigée", category: "victory", text: "Enry protège la zone d'Austrade avec ses pouvoirs magiques.", pts: 8, visible: true, session: 4 },
    { id: "e2", title: "Traître inconnu", category: "threat",  text: "Enry a averti Denna et Cohortys : quelqu'un pourrait briser le sceau.", pts: 0, visible: false, session: 4 },
  ],
  barrierActive: true,
  traitorRevealed: false,
};

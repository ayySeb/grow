// All game rules and texts in one place. To change how grow plays, change this file; the rest reads from here.

// --- XP ------------------------------------------------------------------------

export const XP = {
  habit: { 1: 5, 2: 10, 3: 15 },  // per check, by intensity: leicht / normal / stark
  miniFactor: 0.5,                // the mini version of a habit gives half
  best: 20,                       // a new personal best on a habit with amounts (km, Min, Wdh.)
  milestone: { S: 30, M: 60, L: 120 },
  moment: 25,                     // an "Erstes Mal", also a ticked bucket-list item
  learn: 30,                      // a finished book, course, podcast …
  sideFactor: 0.5,                // share the Nebenbereich gets
  review: { day: 2, week: 20, month: 30, quarter: 40, year: 60 },
};

// XP needed to get from level L to L + 1: base × (1 + growth × (L − 1)).
// Skill: level 2 after 50 XP, level 5 after 290, level 10 after about 1000.
export const CURVES = {
  skill: { base: 50, growth: 0.3 },
  area: { base: 100, growth: 0.3 },
  character: { base: 250, growth: 0.3 },
};

// After this many days without a check, a habit's mini version is offered (never a "you missed" message).
export const PAUSE_DAYS = 7;

export const INTENSITY = [[1, 'Leicht'], [2, 'Normal'], [3, 'Stark']];
export const MOODS = ['Schwer', 'Mau', 'Okay', 'Gut', 'Super'];
export const SIZES = { S: 'Klein', M: 'Mittel', L: 'Groß' };
export const LEARN_TYPES = ['Buch', 'Kurs', 'Podcast', 'Video', 'Song'];

// --- reviews ---------------------------------------------------------------------
// `questions` are always shown, `more` sits behind "Mehr Fragen". Ids keep answers when a text changes.

export const REVIEWS = {
  day: { label: 'Tagessatz' },
  week: {
    label: 'Wochenrückblick',
    questions: [
      { id: 'better', text: 'Was kann ich jetzt besser als letzte Woche?' },
      { id: 'energy', text: 'Was hat mir Energie gegeben?' },
      { id: 'proud', text: 'Worauf bin ich stolz?' },
    ],
    more: [
      { id: 'drain', text: 'Was hat mich Energie gekostet?' },
      { id: 'thanks', text: 'Wofür bin ich dankbar?' },
      { id: 'try', text: 'Was will ich nächste Woche ausprobieren?' },
      { id: 'attention', text: 'Welcher Bereich braucht Aufmerksamkeit?' },
    ],
  },
  month: {
    label: 'Monatsrückblick',
    wheel: true,
    questions: [
      { id: 'highlight', text: 'Was war mein Highlight des Monats?' },
      { id: 'learned', text: 'Was habe ich diesen Monat gelernt?' },
    ],
    more: [{ id: 'next', text: 'Worauf freue ich mich nächsten Monat?' }],
  },
  quarter: {
    label: 'Quartalsrückblick',
    compare: true,
    questions: [
      { id: 'changed', text: 'Was hat sich in meinem Rad verändert?' },
      { id: 'focus', text: 'Worauf will ich im nächsten Quartal den Fokus legen?' },
    ],
    more: [],
  },
  year: {
    label: 'Jahresrückblick',
    compare: true,
    questions: [
      { id: 'can', text: 'Was kann ich heute, was ich vor einem Jahr nicht konnte?' },
      { id: 'moment', text: 'Was war mein schönster Moment?' },
      { id: 'next', text: 'Wer will ich nächstes Jahr sein?' },
    ],
    more: [],
  },
};

// --- badges ------------------------------------------------------------------------
// Only for firsts and things reached, never for streaks. `s` is the summary built in views/character.js.

export const BADGES = [
  { id: 'first-check', title: 'Erster Haken', text: 'Die erste Gewohnheit abgehakt', test: s => s.checks >= 1 },
  { id: 'first-milestone', title: 'Kann was Neues', text: 'Den ersten Meilenstein erreicht', test: s => s.milestones >= 1 },
  { id: 'ten-milestones', title: 'Zehn Fähigkeiten', text: 'Zehn Meilensteine erreicht', test: s => s.milestones >= 10 },
  { id: 'first-moment', title: 'Zum ersten Mal', text: 'Das erste Erlebnis eingetragen', test: s => s.moments >= 1 },
  { id: 'first-quest', title: 'Quest geschafft', text: 'Die erste Quest abgeschlossen', test: s => s.questsDone >= 1 },
  { id: 'main-quest', title: 'Hauptquest geschafft', text: 'Eine Hauptquest abgeschlossen', test: s => s.mainDone >= 1 },
  { id: 'best', title: 'Bestleistung', text: 'Einen eigenen Rekord gebrochen', test: s => s.bests >= 1 },
  { id: 'skill-5', title: 'Geübt', text: 'Ein Skill auf Level 5', test: s => s.maxSkill >= 5 },
  { id: 'skill-10', title: 'Gekonnt', text: 'Ein Skill auf Level 10', test: s => s.maxSkill >= 10 },
  { id: 'char-5', title: 'Level 5', text: 'Charakterlevel 5 erreicht', test: s => s.character >= 5 },
  { id: 'char-10', title: 'Level 10', text: 'Charakterlevel 10 erreicht', test: s => s.character >= 10 },
  { id: 'week-review', title: 'Innegehalten', text: 'Den ersten Wochenrückblick geschrieben', test: s => s.weekReviews >= 1 },
  { id: 'wheel', title: 'Rad gedreht', text: 'Das erste Lebensrad bewertet', test: s => s.wheels >= 1 },
  { id: 'learn', title: 'Ausgelernt', text: 'Ein Buch, einen Kurs oder Podcast abgeschlossen', test: s => s.learnDone >= 1 },
  { id: 'bucket', title: 'Von der Liste', text: 'Den ersten Bucket-Listen-Punkt erlebt', test: s => s.bucketDone >= 1 },
  { id: 'all-round', title: 'Rundum', text: 'XP in jedem Bereich gesammelt', test: s => s.areaCount > 0 && s.areasWithXp >= s.areaCount },
];

// --- start content --------------------------------------------------------------------
// Created once on a fresh device. Skills are referenced as "Bereich/Skill"; a bare "Bereich" means the area itself.

const song = (title, artist) => [`Kann ${title} (${artist}) spielen`, 'S'];

export const SEED = {
  areas: [
    { name: 'Körper', focus: true, skills: ['Ausdauer', 'Kraft', 'Handstand', 'Core'] },
    { name: 'Geist', focus: true, skills: ['Meditation', 'Fokus', 'Selbstwahrnehmung'] },
    { name: 'Lebensfreude', focus: true, skills: ['Gitarre', 'Erlebnisse'] },
    { name: 'Berufung', skills: [] },
    { name: 'Studium', skills: [] },
    { name: 'Wachstum', skills: ['Englisch', 'Eigenes Geld verdienen'] },
    { name: 'Finanzen', skills: ['Investieren', 'Ausgaben'] },
    { name: 'Seele', skills: ['Stille', { name: 'Reflexion', role: 'reflection' }] },
    { name: 'Freundschaften', skills: ['Initiative', 'Neue Menschen'] },
    { name: 'Romantik', skills: [] },
    { name: 'Familie', skills: ['In Kontakt bleiben'] },
    { name: 'Kreativität', skills: [] },
  ],
  quests: [
    { title: 'Halbmarathon', main: true, skill: 'Körper/Ausdauer', milestones: [
      ['Kann 5 km am Stück laufen', 'M'], ['Kann 10 km am Stück laufen', 'M'], ['Kann 15 km am Stück laufen', 'L'], ['Kann einen Halbmarathon (21,1 km) laufen', 'L']] },
    { title: '20 Minuten meditieren', main: true, skill: 'Geist/Meditation', milestones: [
      ['Kann 5 Min am Stück meditieren', 'S'], ['Kann 10 Min am Stück meditieren', 'M'], ['Kann 15 Min am Stück meditieren', 'M'], ['Kann 20 Min am Stück meditieren', 'L']] },
    { title: 'Gitarre: 3 Fokus-Songs', main: true, skill: 'Lebensfreude/Gitarre', milestones: [
      ['Kann Fade Into You (Mazzy Star) spielen', 'M'], ['Kann Wonderwall (Oasis) spielen', 'M'], ['Kann Handyman (Teezo Touchdown) spielen', 'M']] },
    { title: '50 Liegestütze am Stück', skill: 'Körper/Kraft', milestones: [
      ['Kann 20 Liegestütze am Stück', 'S'], ['Kann 30 Liegestütze am Stück', 'M'], ['Kann 40 Liegestütze am Stück', 'M'], ['Kann 50 Liegestütze am Stück', 'L']] },
    { title: 'Handstand', skill: 'Körper/Handstand', milestones: [
      ['Kann 30 s Handstand an der Wand', 'M'], ['Kann 5 s frei im Handstand stehen', 'M'], ['Kann 20 s frei im Handstand stehen', 'L']] },
    { title: 'Sixpack', skill: 'Körper/Core', milestones: [
      ['Kann 2 Min Plank halten', 'M'], ['Kann 15 Hanging Leg Raises', 'M']] },
    { title: '3 Stunden Laserfokus', skill: 'Geist/Fokus', milestones: [
      ['Kann 45 Min ohne Handy fokussiert arbeiten', 'S'], ['Kann 90 Min ohne Handy fokussiert arbeiten', 'M'],
      ['Kann 2 Std. ohne Handy fokussiert arbeiten', 'M'], ['Kann 3 Std. ohne Handy fokussiert arbeiten', 'L']] },
    { title: 'Sensibler für Themen aus der Psychotherapie', skill: 'Geist/Selbstwahrnehmung', milestones: [
      ['Kann ein Gefühl im Moment benennen', 'M'], ['Kann drei eigene Muster benennen', 'M']] },
    { title: 'Songliste', skill: 'Lebensfreude/Gitarre', milestones: [
      song('All Along the Watchtower', 'Jimi Hendrix'), song('Cripple Creek Ferry', 'Neil Young'), song('Löwenzahn', 'Titelthema'),
      song('Stay', 'Post Malone'), song('Still Beating', 'Mac DeMarco'), song('There She Goes', "The La's"),
      song('Triumph', 'XXXTENTACION'), song('Upside Down', 'Jack Johnson'), song('Watch Me', 'Labi Siffre')] },
    { title: 'Englisch C1', skill: 'Wachstum/Englisch', milestones: [
      ['Kann einen englischen Podcast ohne Untertitel verstehen', 'M'], ['Kann 30 Min frei Englisch sprechen', 'M'], ['Besteht einen C1-Probetest', 'L']] },
    { title: 'Die ersten 50 € selbst verdient', skill: 'Wachstum/Eigenes Geld verdienen', milestones: [
      ['Weiß, womit er Geld verdienen kann', 'S'], ['Hat den ersten Euro selbst verdient', 'M'], ['Hat 50 € selbst verdient', 'L']] },
    { title: 'Ausgaben aufräumen', skill: 'Finanzen/Ausgaben', milestones: [
      ['Hat alle Abos geprüft', 'S'], ['Kennt seine monatlichen Fixkosten', 'S'], ['Kann einen Monat im Budget bleiben', 'M']] },
  ],
  habits: [
    { title: 'Laufen', skill: 'Körper/Ausdauer', rhythm: { type: 'weekly', times: 3 }, mode: 'amount', unit: 'km', mini: '10 Min zügig gehen', quest: 'Halbmarathon' },
    { title: 'Liegestütze', skill: 'Körper/Kraft', rhythm: { type: 'weekly', times: 3 }, mode: 'amount', unit: 'Wdh.', mini: '5 Liegestütze', quest: '50 Liegestütze am Stück' },
    { title: 'Meditieren', skill: 'Geist/Meditation', rhythm: { type: 'daily' }, mode: 'amount', unit: 'Min', mini: '1 Min bewusst atmen', quest: '20 Minuten meditieren' },
    { title: 'Kein Handy im Bett', skill: 'Geist/Fokus', rhythm: { type: 'daily' }, avoid: true },
    { title: 'Gitarre üben', skill: 'Lebensfreude/Gitarre', rhythm: { type: 'weekly', times: 4 }, mode: 'amount', unit: 'Min', mini: '2 Min Akkorde wechseln', quest: 'Gitarre: 3 Fokus-Songs' },
    { title: '10 Min Stille', skill: 'Seele/Stille', rhythm: { type: 'daily' }, mini: '2 Min Stille' },
    { title: 'Familie anrufen', skill: 'Familie/In Kontakt bleiben', rhythm: { type: 'weekly', times: 2 }, mini: 'Kurze Sprachnachricht' },
    { title: 'In der Gruppe etwas vorschlagen', skill: 'Freundschaften/Initiative', rhythm: { type: 'weekly', times: 1 } },
  ],
  mottos: ['Können statt Pensum.', 'Ein verpasster Tag zählt einfach als null.'],
};

// --- quest ideas, per area name ------------------------------------------------------------

export const QUEST_IDEAS = {
  Körper: [
    { title: 'Klimmzüge', milestones: ['Kann 1 Klimmzug', 'Kann 5 Klimmzüge am Stück', 'Kann 10 Klimmzüge am Stück'] },
    { title: 'Beweglich werden', milestones: ['Kann mit gestreckten Beinen den Boden berühren', 'Kann 1 Min tief hocken'] },
    { title: 'Guter Schlaf', milestones: ['Kann 2 Wochen lang vor Mitternacht einschlafen', 'Kann ohne Wecker vor 8 Uhr aufwachen'] },
    { title: 'Kochen', milestones: ['Kann 3 Gerichte ohne Rezept kochen', 'Kann 5 eiweißreiche Gerichte ohne Rezept kochen'] },
  ],
  Geist: [
    { title: 'Mehr lesen', milestones: ['Kann 30 Min am Stück lesen', 'Hat 3 Bücher beendet'] },
    { title: 'Digitale Ruhe', milestones: ['Kann einen Abend ohne Handy verbringen', 'Kann einen ganzen Tag offline sein'] },
    { title: 'Stress früh erkennen', milestones: ['Kann 3 eigene Stresssignale benennen', 'Kann in akuten Momenten eine Atemübung nutzen'] },
  ],
  Lebensfreude: [
    { title: 'Neue Orte', milestones: ['War an 3 neuen Orten in der Stadt', 'Hat einen Tagesausflug allein geplant'] },
    { title: 'Ein neues Hobby', milestones: ['Hat 3 Hobbys ausprobiert', 'Kann eins davon so, dass es Spaß macht'] },
  ],
  Berufung: [
    { title: 'Portfolio', milestones: ['Hat eine Arbeitsprobe fertig', 'Hat 3 Arbeitsproben online', 'Kann sein Portfolio in 2 Min vorstellen'] },
    { title: 'Bewerbung', milestones: ['Hat einen Lebenslauf, der passt', 'Kann ein Anschreiben in 1 Std. schreiben'] },
  ],
  Studium: [
    { title: 'Entspannte Klausurphase', milestones: ['Kann einen Lernplan 3 Wochen vorher aufstellen', 'Kann eine Altklausur unter Zeit lösen'] },
    { title: 'Lernmethode', milestones: ['Kann Stoff in eigenen Worten erklären', 'Kann Karteikarten täglich nutzen'] },
  ],
  Wachstum: [
    { title: 'Frei sprechen', milestones: ['Kann 5 Min frei vor Freunden sprechen', 'Kann ein Referat ohne Karteikarten halten'] },
    { title: 'Programmieren', milestones: ['Kann ein kleines Skript schreiben', 'Hat eine eigene Web-App online'] },
  ],
  Finanzen: [
    { title: 'Notgroschen', milestones: ['Hat eine Monatsausgabe als Puffer', 'Hat 3 Monatsausgaben als Puffer'] },
    { title: 'ETFs verstehen', milestones: ['Kann erklären, was ein ETF ist', 'Hat seinen Sparplan bewusst überprüft'] },
  ],
  Seele: [
    { title: 'Eigene Werte', milestones: ['Kann seine 5 wichtigsten Werte benennen', 'Hat eine Entscheidung bewusst nach seinen Werten getroffen'] },
    { title: 'Allein sein', milestones: ['Kann einen Abend allein genießen', 'War allein im Café oder Kino'] },
  ],
  Freundschaften: [
    { title: 'Gastgeber sein', milestones: ['Hat einen Spieleabend organisiert', 'Hat für 6 Leute gekocht'] },
    { title: 'Neue Menschen', milestones: ['Hat jemand Neues angesprochen', 'Hat einen neuen Kontakt ein zweites Mal getroffen'] },
  ],
  Romantik: [
    { title: 'Offen reden', milestones: ['Kann eigene Bedürfnisse ansprechen', 'Kann ein schwieriges Thema ruhig ansprechen'] },
  ],
  Familie: [
    { title: 'Familienritual', milestones: ['Hat ein gemeinsames Ritual vorgeschlagen', 'Das Ritual hat 3-mal stattgefunden'] },
    { title: 'Familiengeschichte', milestones: ['Kennt 3 Geschichten aus der Jugend der Eltern'] },
  ],
  Kreativität: [
    { title: 'Eigener Song', milestones: ['Kann 4 Akkorde flüssig wechseln', 'Hat einen eigenen Song geschrieben'] },
    { title: 'Fotografie', milestones: ['Kann manuell belichten', 'Hat eine Fotoserie gemacht'] },
  ],
};

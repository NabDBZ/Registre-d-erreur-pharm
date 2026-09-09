import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:5250'
const OUT_DIR = process.argv[2] || 'guide-shots'
mkdirSync(OUT_DIR, { recursive: true })

function shotPath(name) {
  return path.join(OUT_DIR, `${name}.png`)
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser console error]', msg.text())
  })

  await page.goto(BASE_URL)
  await page.waitForTimeout(500)

  // ---- 1. First-run setup screen ----
  await page.waitForSelector('text=Première utilisation')
  await page.screenshot({ path: shotPath('01-setup'), fullPage: false })

  await page.getByPlaceholder('Ex. : Marie Tremblay').fill('Marie Tremblay')
  await page.getByPlaceholder('mtremblay').fill('mtremblay')
  const pwFields = page.locator('input[type=password]')
  await pwFields.nth(0).fill('motdepasse123')
  await pwFields.nth(1).fill('motdepasse123')
  await page.getByRole('button', { name: /Créer le compte et démarrer/ }).click()
  await page.waitForSelector('text=Tableau de bord')
  await page.waitForTimeout(400)

  // ---- 2. Personnel: add two members ----
  await page.goto(`${BASE_URL}/#/personnel`)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Ajouter une personne/ }).click()
  await page.waitForSelector('text=Ajouter un membre du personnel')
  await page.locator('input').first().fill('Julien Roy')
  await page.locator('select').first().selectOption({ label: 'ATP (Assistant technique)' })
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Ajouter une personne/ }).click()
  await page.waitForSelector('text=Ajouter un membre du personnel')
  await page.locator('input').first().fill('Sophie Bergeron')
  await page.locator('select').first().selectOption({ label: 'Pharmacien' })
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotPath('08-personnel'), fullPage: false })

  // ---- helper to declare an event ----
  async function declarer({ description, graviteIndex, medicament, classe, typeErreur, personnePersonnelIndex, role, divulgue }) {
    await page.goto(`${BASE_URL}/#/declarer`)
    await page.waitForTimeout(300)
    await page.getByPlaceholder("Que s'est-il passé ? Comment l'erreur a-t-elle été détectée ?").fill(description)
    if (typeErreur) {
      await page.locator('select').nth(2).selectOption({ label: typeErreur })
    }
    if (medicament) {
      await page.getByPlaceholder('Ex. : Apo-Metformin 500mg').fill(medicament)
    }
    if (classe) {
      await page.locator('select').nth(3).selectOption({ label: classe })
    }
    if (graviteIndex != null) {
      await page.locator('input[type=radio]').nth(graviteIndex).click({ force: true })
    }
    if (personnePersonnelIndex != null) {
      const personSelect = page.locator('select').nth(4)
      await personSelect.selectOption({ index: personnePersonnelIndex })
      if (role) {
        await page.locator('select').nth(5).selectOption({ label: role })
      }
    }
    if (divulgue) {
      await page.locator('input[type=checkbox]').click()
    }
    await page.getByRole('button', { name: /Enregistrer le signalement/ }).click()
    await page.waitForSelector('text=Historique et traçabilité')
    await page.waitForTimeout(300)
  }

  await declarer({
    description:
      "Un comprimé de 850 mg a été délivré au lieu de la dose prescrite de 500 mg. L'erreur a été détectée par le pharmacien lors de la vérification finale, avant la remise au patient.",
    graviteIndex: 3, // D
    medicament: 'Apo-Metformin 850mg',
    typeErreur: 'Mauvaise dose / concentration'
  })
  const evtUrl1 = page.url()

  await declarer({
    description:
      "Lors de la préparation d'un pilulier hebdomadaire, un comprimé de lorazépam a été inséré dans le mauvais compartiment (mercredi au lieu de mardi). Détecté par l'ATP lors du contrôle de la qualité, avant la remise au patient.",
    graviteIndex: 1, // B
    medicament: 'Lorazépam 1mg',
    typeErreur: "Non-respect d'une procédure / protocole",
    personnePersonnelIndex: 1,
    role: 'A commis'
  })

  await declarer({
    description:
      "Une allergie connue à la pénicilline n'a pas été détectée lors de la validation de l'ordonnance. Le patient a reçu une dose d'amoxicilline et a présenté une réaction cutanée légère quelques heures plus tard. Le patient a été dirigé vers une clinique sans hospitalisation.",
    graviteIndex: 5, // E2
    medicament: 'Amoxicilline 500mg',
    typeErreur: 'Allergie connue non détectée',
    divulgue: true
  })

  await declarer({
    description: 'Retard de livraison de 24 heures pour un renouvellement de médication de maintien — client avisé, aucune rupture de traitement.',
    graviteIndex: 0, // A
    typeErreur: 'Erreur de livraison (adresse, destinataire, délai)'
  })
  const evtUrl4 = page.url()

  // ---- 3. Dashboard ----
  await page.goto(`${BASE_URL}/#/`)
  await page.waitForTimeout(700)
  await page.screenshot({ path: shotPath('04-dashboard'), fullPage: false })

  // ---- 4. Declarer form (fresh, empty, scrolled to top) ----
  await page.goto(`${BASE_URL}/#/declarer`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotPath('05-declarer-haut'), fullPage: false })
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 600))
  await page.waitForTimeout(150)
  await page.screenshot({ path: shotPath('05b-declarer-bas'), fullPage: false })
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 0))

  // ---- 5. Registre ----
  await page.goto(`${BASE_URL}/#/registre`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shotPath('06-registre'), fullPage: false })

  // ---- 6. Detail page (event 1) ----
  await page.goto(evtUrl1)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shotPath('07-detail'), fullPage: false })

  // Change status to Fermé for variety, screenshot the status dropdown area
  await page.locator('select').first().selectOption({ label: 'Fermé' })
  await page.waitForTimeout(300)

  // ---- 7. Archive flow screenshot (event 4) ----
  await page.goto(evtUrl4)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Archiver$/ }).click()
  await page.waitForSelector('text=Archiver ce signalement')
  await page.getByPlaceholder('Ex. : Doublon avec le signalement #4').fill('Doublon avec un signalement papier déjà traité — test de démonstration.')
  await page.waitForTimeout(200)
  await page.screenshot({ path: shotPath('09-archiver-modal'), fullPage: false })
  await page.getByRole('button', { name: /Confirmer l'archivage/ }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shotPath('09b-archive-banniere'), fullPage: false })

  // ---- 8. Registre with archives visible ----
  await page.goto(`${BASE_URL}/#/registre`)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Voir les archives/ }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotPath('09c-registre-archives'), fullPage: false })

  // ---- 9. Statistiques ----
  await page.goto(`${BASE_URL}/#/statistiques`)
  await page.waitForTimeout(600)
  await page.screenshot({ path: shotPath('10-statistiques'), fullPage: false })

  // ---- 10. Journal d'audit ----
  await page.goto(`${BASE_URL}/#/journal`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shotPath('11-journal'), fullPage: false })

  // ---- 11. Utilisateurs ----
  await page.goto(`${BASE_URL}/#/utilisateurs`)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Ajouter un utilisateur/ }).click()
  await page.waitForSelector('text=Ajouter un utilisateur')
  await page.waitForTimeout(200)
  await page.screenshot({ path: shotPath('12-utilisateur-modal'), fullPage: false })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await page.screenshot({ path: shotPath('12b-utilisateurs'), fullPage: false })

  // ---- 12. Paramètres ----
  await page.goto(`${BASE_URL}/#/parametres`)
  await page.waitForTimeout(300)
  await page.getByPlaceholder('Ex. : Pharmacie Tremblay et associés').fill('Pharmacie Tremblay et associés')
  await page.getByRole('button', { name: 'Enregistrer' }).first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotPath('13-parametres-haut'), fullPage: false })
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 600))
  await page.waitForTimeout(150)
  await page.screenshot({ path: shotPath('13b-parametres-listes'), fullPage: false })
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 99999))
  await page.waitForTimeout(150)
  await page.screenshot({ path: shotPath('13c-parametres-apropos'), fullPage: false })

  // ---- 13. Sidebar closeup (logged in, dashboard) ----
  await page.goto(`${BASE_URL}/#/`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shotPath('03-sidebar'), fullPage: false, clip: { x: 0, y: 0, width: 240, height: 900 } })

  // ---- 14. Login screen (logged out) ----
  await page.getByTitle('Se déconnecter').click()
  await page.waitForSelector('text=Sécurité du circuit du médicament')
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotPath('02-connexion'), fullPage: false })

  await browser.close()
  console.log('DONE')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

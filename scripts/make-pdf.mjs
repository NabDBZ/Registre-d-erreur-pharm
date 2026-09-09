import { chromium } from 'playwright'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const inputPath = process.argv[2]
const outputPath = process.argv[3]

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(pathToFileURL(path.resolve(inputPath)).href)
  await page.emulateMedia({ media: 'print' })
  await page.pdf({
    path: path.resolve(outputPath),
    format: 'Letter',
    printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '10mm', right: '10mm' }
  })
  await browser.close()
  console.log('DONE')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

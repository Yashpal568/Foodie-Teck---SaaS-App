import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT, QR_OUTPUT_ROOT, MANIFESTS_ROOT, parseCliArgs, generateRunId } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import { loadManifest } from './lib/supabase-staging.js'
import { buildSyntheticRestaurantPlan } from './seed-restaurants.js'
import {
  generateRestaurantSignature,
  verifyRestaurantSignature,
  generateTableSignature,
  verifyTableSignature,
} from '../../client/src/utils/tableSecurity.js'

const require = createRequire(import.meta.url)
const QRCode = require(require.resolve('qrcode', { paths: [path.join(REPO_ROOT, 'client')] }))

export async function runGenerateQRCodes(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: false,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  let restaurantsForQr = []
  let runId = flags.runId || generateRunId('qr')

  if (flags.dryRun && !flags.manifest) {
    const plan = buildSyntheticRestaurantPlan({
      runId,
      restaurantCount: Math.min(flags.restaurants || 5, 5),
      minTables: flags.minTables,
      maxTables: flags.maxTables,
      publicOrigin: stagingEnv.publicOrigin || 'https://staging-menu.servora.invalid',
    })
    restaurantsForQr = plan.map((r) => ({
      code: r.code,
      restaurantId: r.id,
      tables: r.tables.map((t) => ({ tableNumber: t.table_number })),
    }))
  } else {
    const manifest = loadManifest(flags.manifest || flags.runId)
    runId = manifest.runId
    restaurantsForQr = manifest.restaurants
  }

  const publicOrigin = stagingEnv.publicOrigin || 'https://staging-menu.servora.invalid'
  const outRoot = path.join(QR_OUTPUT_ROOT, runId)
  fs.mkdirSync(outRoot, { recursive: true })
  fs.mkdirSync(MANIFESTS_ROOT, { recursive: true })

  const entries = []
  let signatureFailures = 0

  for (const r of restaurantsForQr) {
    const restDir = path.join(outRoot, r.code)
    fs.mkdirSync(restDir, { recursive: true })

    const masterSig = generateRestaurantSignature(r.restaurantId)
    const masterUrl = `${publicOrigin}/menu?restaurant=${r.restaurantId}&sig=${masterSig}`
    if (!verifyRestaurantSignature(r.restaurantId, masterSig)) {
      signatureFailures += 1
    }

    const masterPngPath = path.join(restDir, 'master-menu.png')
    await QRCode.toFile(masterPngPath, masterUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M' })

    for (const t of r.tables) {
      const tableNum = t.tableNumber ?? t.table_number
      const sig = generateTableSignature(r.restaurantId, tableNum)
      const qrUrl = `${publicOrigin}/menu?restaurant=${r.restaurantId}&table=${tableNum}&sig=${sig}`
      const parsed = new URL(qrUrl)

      const sigValid = verifyTableSignature(
        parsed.searchParams.get('restaurant'),
        parsed.searchParams.get('table'),
        parsed.searchParams.get('sig')
      )
      // Also verify cross-restaurant signature tampering is rejected
      const crossTamperBlocked = !verifyTableSignature('00000000-0000-4000-8000-000000000099', tableNum, sig)

      if (!sigValid || !crossTamperBlocked) {
        signatureFailures += 1
      }

      const filePath = path.join(restDir, `table-${String(tableNum).padStart(2, '0')}.png`)
      await QRCode.toFile(filePath, qrUrl, { width: 280, margin: 1, errorCorrectionLevel: 'M' })

      entries.push({
        restaurantCode: r.code,
        restaurantId: r.restaurantId,
        tableSessionId: t.tableSessionId || null,
        tableNumber: Number(tableNum),
        qrUrl,
        signature: sig,
        signatureVerified: sigValid,
        crossRestaurantTamperBlocked: crossTamperBlocked,
        pngFile: path.relative(REPO_ROOT, filePath).replace(/\\/g, '/'),
      })
    }
  }

  const qrManifestJson = path.join(MANIFESTS_ROOT, `qr-manifest-${runId}.json`)
  const qrManifestCsv = path.join(MANIFESTS_ROOT, `qr-manifest-${runId}.csv`)
  fs.writeFileSync(qrManifestJson, JSON.stringify({ runId, totalQRCodes: entries.length, signatureFailures, entries }, null, 2))
  fs.writeFileSync(
    qrManifestCsv,
    [
      'restaurant_code,restaurant_id,table_number,table_session_id,qr_url,signature_verified,png_file',
      ...entries.map(
        (e) =>
          `${e.restaurantCode},${e.restaurantId},${e.tableNumber},${e.tableSessionId || ''},"${e.qrUrl}",${e.signatureVerified},${e.pngFile}`
      ),
    ].join('\n')
  )

  const summary = {
    mode: flags.dryRun ? 'DRY_RUN' : 'LIVE',
    runId,
    restaurantsProcessed: restaurantsForQr.length,
    qrPngGenerated: entries.length,
    signatureFailures,
    qrOutputDir: path.relative(REPO_ROOT, outRoot).replace(/\\/g, '/'),
    qrManifestJson: path.relative(REPO_ROOT, qrManifestJson).replace(/\\/g, '/'),
    qrManifestCsv: path.relative(REPO_ROOT, qrManifestCsv).replace(/\\/g, '/'),
  }
  console.log(JSON.stringify(summary, null, 2))
  if (signatureFailures > 0) {
    throw new Error(`QR signature verification failed ${signatureFailures} times.`)
  }
  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGenerateQRCodes().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

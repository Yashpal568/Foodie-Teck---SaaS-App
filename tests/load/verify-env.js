import { pathToFileURL } from 'node:url'
import { parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'

export function runVerifyEnv(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const result = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: !flags.dryRun,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (!result.configured) {
    console.log(
      JSON.stringify(
        {
          status: 'DRY_RUN_UNCONFIGURED_STAGING',
          isolated: false,
          reason: result.reason,
          denylistedProductionRefs: result.denylistedProductionRefs,
          nextStep:
            'Copy tests/load/.env.staging.example to tests/load/.env.staging and supply isolated staging Supabase credentials.',
        },
        null,
        2
      )
    )
    return result
  }

  console.log(
    JSON.stringify(
      {
        status: 'VERIFIED_ISOLATED_STAGING',
        isolated: true,
        projectRef: result.projectRef,
        envFile: result.envFile,
        publicOrigin: result.publicOrigin,
        denylistedProductionRefs: result.denylistedProductionRefs,
      },
      null,
      2
    )
  )
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runVerifyEnv()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

import fs from 'node:fs'
import path from 'node:path'

export function computePercentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return 0
  const idx = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1)
  )
  return Number(sortedValues[idx].toFixed(2))
}

export class LoadMetricsCollector {
  constructor(name = 'servora-load-test', runId = 'dryrun') {
    this.name = name
    this.runId = runId
    this.startedAt = new Date().toISOString()
    this.startPerf = performance.now()
    this.latencies = []
    this.recentSamples = []
    this.totalRequests = 0
    this.successfulRequests = 0
    this.failedRequests = 0
    this.consecutiveFailures = 0
    this.httpStatusDistribution = {}
    this.errorsByType = {}
    this.ordersCreated = 0
    this.ordersFailed = 0
    this.duplicateOrders = 0
    this.realtimeLatencies = []
    this.realtimeExpected = 0
    this.realtimeReceived = 0
    this.realtimeCrossTenantLeaks = 0
    this.inventoryFailures = []
    this.isolationFailures = []
    this.stageHistory = []
    this.abortedReason = null
  }

  recordRequest({
    ok,
    status = ok ? 200 : 500,
    latencyMs = 0,
    error = null,
    isOrderCreate = false,
    isDuplicate = false,
  }) {
    this.totalRequests += 1
    const cleanLatency = Number(Math.max(0, latencyMs).toFixed(2))
    this.latencies.push(cleanLatency)
    this.recentSamples.push({ ok: Boolean(ok), latencyMs: cleanLatency })
    if (this.recentSamples.length > 200) this.recentSamples.shift()

    const statusKey = String(status || (ok ? 200 : 'ERR'))
    this.httpStatusDistribution[statusKey] = (this.httpStatusDistribution[statusKey] || 0) + 1

    if (ok) {
      this.successfulRequests += 1
      this.consecutiveFailures = 0
      if (isOrderCreate) this.ordersCreated += 1
      if (isDuplicate) this.duplicateOrders += 1
    } else {
      this.failedRequests += 1
      this.consecutiveFailures += 1
      if (isOrderCreate) this.ordersFailed += 1
      const baseMsg = String(error?.message || error || 'Unknown error')
      const causeCode = error?.cause?.code ? ` [${error.cause.code}]` : ''
      const errMsg = `${baseMsg}${causeCode}`.slice(0, 140)
      this.errorsByType[errMsg] = (this.errorsByType[errMsg] || 0) + 1
    }
  }

  recordRealtimeEvent({ latencyMs, crossTenantLeak = false }) {
    this.realtimeReceived += 1
    if (Number.isFinite(latencyMs)) this.realtimeLatencies.push(Number(latencyMs.toFixed(2)))
    if (crossTenantLeak) this.realtimeCrossTenantLeaks += 1
  }

  recordStageSnapshot(stageInfo) {
    this.stageHistory.push({
      timestamp: new Date().toISOString(),
      ...stageInfo,
    })
  }

  shouldTripCircuitBreaker(thresholds) {
    if (this.consecutiveFailures >= thresholds.maxConsecutiveFailures) {
      return `Consecutive failure threshold exceeded (${this.consecutiveFailures} >= ${thresholds.maxConsecutiveFailures})`
    }
    if (this.recentSamples.length >= thresholds.minSamplesForErrorRate) {
      const recentFails = this.recentSamples.filter((s) => !s.ok).length
      const rate = recentFails / this.recentSamples.length
      if (rate > thresholds.maxErrorRate) {
        return `Sustained error rate ${(rate * 100).toFixed(1)}% exceeded ${(thresholds.maxErrorRate * 100).toFixed(1)}%`
      }
      const recentSorted = this.recentSamples.map((s) => s.latencyMs).sort((a, b) => a - b)
      const recentP95 = computePercentile(recentSorted, 95)
      if (recentP95 > thresholds.maxP95LatencyMs) {
        return `Severe latency spike: p95=${recentP95}ms > ${thresholds.maxP95LatencyMs}ms`
      }
    }
    for (const msg of Object.keys(this.errorsByType)) {
      const lower = msg.toLowerCase()
      if (thresholds.connectionErrorPatterns.some((pat) => lower.includes(pat))) {
        if (this.errorsByType[msg] >= 5) {
          return `Database/connection exhaustion detected ("${msg}" x${this.errorsByType[msg]})`
        }
      }
    }
    return null
  }

  summarize() {
    const durationSec = Number(((performance.now() - this.startPerf) / 1000).toFixed(2))
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const sum = sorted.reduce((acc, v) => acc + v, 0)
    const rtSorted = [...this.realtimeLatencies].sort((a, b) => a - b)
    const orderAttempts = this.ordersCreated + this.ordersFailed
    const mem = process.memoryUsage()

    return {
      testName: this.name,
      runId: this.runId,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      durationSec,
      abortedReason: this.abortedReason,
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        successRatePct: this.totalRequests > 0 ? Number(((this.successfulRequests / this.totalRequests) * 100).toFixed(2)) : 0,
        throughputRps: durationSec > 0 ? Number((this.totalRequests / durationSec).toFixed(2)) : 0,
        httpStatusDistribution: this.httpStatusDistribution,
      },
      orders: {
        created: this.ordersCreated,
        failed: this.ordersFailed,
        successRatePct: orderAttempts > 0 ? Number(((this.ordersCreated / orderAttempts) * 100).toFixed(2)) : 0,
        duplicateCount: this.duplicateOrders,
      },
      latencyMs: {
        min: sorted[0] ?? 0,
        avg: sorted.length > 0 ? Number((sum / sorted.length).toFixed(2)) : 0,
        p50: computePercentile(sorted, 50),
        p95: computePercentile(sorted, 95),
        p99: computePercentile(sorted, 99),
        max: sorted[sorted.length - 1] ?? 0,
      },
      realtime: {
        expectedEvents: this.realtimeExpected,
        receivedEvents: this.realtimeReceived,
        crossTenantLeaks: this.realtimeCrossTenantLeaks,
        latencyMs: {
          p50: computePercentile(rtSorted, 50),
          p95: computePercentile(rtSorted, 95),
          p99: computePercentile(rtSorted, 99),
          max: rtSorted[rtSorted.length - 1] ?? 0,
        },
      },
      consistency: {
        inventoryFailuresCount: this.inventoryFailures.length,
        inventoryFailures: this.inventoryFailures,
        tenantIsolationFailuresCount: this.isolationFailures.length,
        tenantIsolationFailures: this.isolationFailures,
      },
      errorsByType: this.errorsByType,
      stages: this.stageHistory,
      processResourceUsage: {
        rssMb: Number((mem.rss / (1024 * 1024)).toFixed(2)),
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      },
    }
  }

  writeReports(outputDir) {
    fs.mkdirSync(outputDir, { recursive: true })
    const summary = this.summarize()
    const jsonPath = path.join(outputDir, `${this.name}-${this.runId}.json`)
    const csvPath = path.join(outputDir, `${this.name}-${this.runId}.csv`)
    const svgPath = path.join(outputDir, `${this.name}-${this.runId}-latency.svg`)

    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2))

    const csvLines = [
      'metric,value',
      `total_requests,${summary.requests.total}`,
      `successful_requests,${summary.requests.successful}`,
      `failed_requests,${summary.requests.failed}`,
      `order_success_rate_pct,${summary.orders.successRatePct}`,
      `duplicate_orders,${summary.orders.duplicateOrders}`,
      `avg_latency_ms,${summary.latencyMs.avg}`,
      `p50_latency_ms,${summary.latencyMs.p50}`,
      `p95_latency_ms,${summary.latencyMs.p95}`,
      `p99_latency_ms,${summary.latencyMs.p99}`,
      `max_latency_ms,${summary.latencyMs.max}`,
      `inventory_failures,${summary.consistency.inventoryFailuresCount}`,
      `tenant_isolation_failures,${summary.consistency.tenantIsolationFailuresCount}`,
    ]
    fs.writeFileSync(csvPath, csvLines.join('\n'))

    // Render lightweight standalone SVG percentile bar chart
    const bars = [
      { label: 'p50', value: summary.latencyMs.p50, color: '#10b981' },
      { label: 'avg', value: summary.latencyMs.avg, color: '#3b82f6' },
      { label: 'p95', value: summary.latencyMs.p95, color: '#f59e0b' },
      { label: 'p99', value: summary.latencyMs.p99, color: '#f97316' },
      { label: 'max', value: summary.latencyMs.max, color: '#ef4444' },
    ]
    const maxVal = Math.max(10, ...bars.map((b) => b.value))
    const barRects = bars
      .map((b, i) => {
        const y = 48 + i * 38
        const w = Math.max(4, Math.round((b.value / maxVal) * 380))
        return `<text x="16" y="${y + 18}" font-family="monospace" font-size="13" fill="#0f172a">${b.label.toUpperCase()}</text><rect x="70" y="${y}" width="${w}" height="24" rx="4" fill="${b.color}"/><text x="${78 + w}" y="${y + 17}" font-family="monospace" font-size="12" fill="#334155">${b.value} ms</text>`
      })
      .join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="250" style="background:#ffffff;border:1px solid #e2e8f0"><text x="16" y="26" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">${this.name} (${this.runId}) Latency Distribution</text>${barRects}</svg>`
    fs.writeFileSync(svgPath, svg)

    return { summary, jsonPath, csvPath, svgPath }
  }
}

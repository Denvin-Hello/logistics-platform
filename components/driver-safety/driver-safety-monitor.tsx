"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

const LEFT_EYE = [362, 385, 387, 263, 373, 380]
const RIGHT_EYE = [33, 160, 158, 133, 153, 144]
const INITIAL_EAR_THRESHOLD = 0.21
const INITIAL_CLOSED_TIME_LIMIT = 1.8

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function eyeAspectRatio(landmarks: Array<{ x: number; y: number }>, indices: number[]) {
  const points = indices.map((index) => landmarks[index])
  const vertical1 = distance(points[1], points[5])
  const vertical2 = distance(points[2], points[4])
  const horizontal = distance(points[0], points[3])
  return (vertical1 + vertical2) / (2.0 * horizontal)
}

export function DriverSafetyMonitor() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const graphRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<any>(null)
  const faceMeshRef = useRef<any>(null)
  const sessionStartRef = useRef<number | null>(null)
  const closedSinceRef = useRef<number | null>(null)
  const wasClosedRef = useRef(false)
  const earHistoryRef = useRef<number[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const alertOscRef = useRef<any>(null)

  const [scriptsReady, setScriptsReady] = useState(false)
  const [faceMeshLoaded, setFaceMeshLoaded] = useState(false)
  const [cameraLoaded, setCameraLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState("Offline")
  const [alertActive, setAlertActive] = useState(false)
  const [blinkCount, setBlinkCount] = useState(0)
  const [closedTime, setClosedTime] = useState(0)
  const [sessionTime, setSessionTime] = useState("00:00")
  const [ear, setEar] = useState("--")
  const [focusScore, setFocusScore] = useState(92)
  const [alertLog, setAlertLog] = useState<string[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [earThreshold, setEarThreshold] = useState(INITIAL_EAR_THRESHOLD)
  const [closedTimeLimit, setClosedTimeLimit] = useState(INITIAL_CLOSED_TIME_LIMIT)
  const [fps, setFps] = useState("--")

  useEffect(() => {
    setScriptsReady(faceMeshLoaded && cameraLoaded)
  }, [faceMeshLoaded, cameraLoaded])

  useEffect(() => {
    const camera = cameraRef.current
    const video = videoRef.current
    const audioCtx = audioCtxRef.current

    return () => {
      if (camera) {
        try {
          camera.stop()
        } catch {
          // ignore
        }
      }
      if (video?.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
      if (audioCtx) {
        try {
          void audioCtx.close()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!running) return

    const interval = window.setInterval(() => {
      if (!sessionStartRef.current) return
      const seconds = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainder = seconds % 60
      setSessionTime(`${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [running])

  useEffect(() => {
    setFocusScore(alertActive ? 72 : 92)
  }, [alertActive])

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  function startAlertSound() {
    if (!soundEnabled) return
    ensureAudioContext()
    if (alertOscRef.current) return

    const audioCtx = audioCtxRef.current!
    const oscillator = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    oscillator.type = "square"
    oscillator.frequency.value = 880
    gain.gain.value = 0.15
    oscillator.connect(gain).connect(audioCtx.destination)
    oscillator.start()

    const interval = window.setInterval(() => {
      const now = audioCtx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.linearRampToValueAtTime(0.0, now + 0.25)
    }, 400)

    alertOscRef.current = { oscillator, interval }
  }

  function stopAlertSound() {
    if (!alertOscRef.current) return
    clearInterval(alertOscRef.current.interval)
    alertOscRef.current.oscillator.stop()
    alertOscRef.current.oscillator.disconnect()
    alertOscRef.current = null
  }

  function addAlert(message: string) {
    setAlertLog((current) => [
      `${new Date().toLocaleTimeString()} — ${message}`,
      ...current,
    ].slice(0, 6))
  }

  function drawGraph() {
    const canvas = graphRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.lineWidth = 2
    ctx.strokeStyle = alertActive ? "#f97316" : "#22c55e"
    ctx.beginPath()

    const history = earHistoryRef.current.slice(-80)
    if (history.length === 0) return

    const step = width / Math.max(history.length - 1, 1)
    history.forEach((value, index) => {
      const x = index * step
      const y = height - (value / 0.45) * height
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    ctx.stroke()
    ctx.strokeStyle = "rgba(255,255,255,0.2)"
    ctx.setLineDash([4, 4])
    const thresholdY = height - (earThreshold / 0.45) * height
    ctx.beginPath()
    ctx.moveTo(0, thresholdY)
    ctx.lineTo(width, thresholdY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  function onResults(results: any) {
    const video = videoRef.current
    const overlay = overlayRef.current
    if (!video || !overlay) return

    const now = performance.now()
    const fpsValue = Math.round(1000 / Math.max(1, now - (overlay as any)._lastTime || now))
    ;(overlay as any)._lastTime = now
    setFps(String(fpsValue))

    overlay.width = video.videoWidth
    overlay.height = video.videoHeight
    const octx = overlay.getContext("2d")
    if (octx) {
      octx.clearRect(0, 0, overlay.width, overlay.height)
    }

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setStatus("No driver visible")
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const leftEAR = eyeAspectRatio(landmarks, LEFT_EYE)
    const rightEAR = eyeAspectRatio(landmarks, RIGHT_EYE)
    const currentEar = (leftEAR + rightEAR) / 2

    earHistoryRef.current = [...earHistoryRef.current, currentEar].slice(-120)
    setEar(currentEar.toFixed(3))

    if (octx) {
      octx.fillStyle = alertActive ? "rgba(249, 115, 22, 0.95)" : "rgba(34, 197, 94, 0.95)"
      ;[...LEFT_EYE, ...RIGHT_EYE].forEach((index) => {
        const point = landmarks[index]
        octx.beginPath()
        octx.arc(point.x * overlay.width, point.y * overlay.height, 2.5, 0, Math.PI * 2)
        octx.fill()
      })
    }

    const closed = currentEar < earThreshold
    if (closed) {
      if (closedSinceRef.current === null) {
        closedSinceRef.current = now
      }
      const elapsed = (now - closedSinceRef.current) / 1000
      setClosedTime(elapsed)
      setStatus(elapsed >= closedTimeLimit ? "Drowsiness alert" : "Eyes closing")

      if (elapsed >= closedTimeLimit) {
        if (!alertActive) {
          setAlertActive(true)
          startAlertSound()
          addAlert("Driver fatigue alert")
        }
      }
    } else {
      if (wasClosedRef.current) {
        setBlinkCount((count) => count + 1)
      }
      closedSinceRef.current = null
      setClosedTime(0)
      if (alertActive) {
        setAlertActive(false)
        stopAlertSound()
        addAlert("Alert cleared")
      }
      setStatus("Monitoring")
    }

    wasClosedRef.current = closed
    drawGraph()
  }

  async function startMonitoring() {
    if (running || !scriptsReady) return
    setStatus("Initializing camera")
    const win = window as any
    if (!win.FaceMesh || !win.Camera) {
      setStatus("Waiting for models")
      return
    }

    const faceMesh = new win.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    })
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    faceMesh.onResults(onResults)
    faceMeshRef.current = faceMesh

    cameraRef.current = new win.Camera(videoRef.current, {
      onFrame: async () => {
        if (!faceMeshRef.current) return
        await faceMeshRef.current.send({ image: videoRef.current })
      },
      width: 640,
      height: 480,
    })

    try {
      await cameraRef.current.start()
      sessionStartRef.current = Date.now()
      wasClosedRef.current = false
      setRunning(true)
      setAlertActive(false)
      setBlinkCount(0)
      setClosedTime(0)
      setStatus("Monitoring")
    } catch (error: any) {
      setStatus("Camera permission required")
      console.error(error)
    }
  }

  function stopMonitoring() {
    if (cameraRef.current) {
      cameraRef.current.stop()
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    stopAlertSound()
    setRunning(false)
    setAlertActive(false)
    setStatus("Offline")
    setEar("--")
    setClosedTime(0)
    setSessionTime("00:00")
    setFps("--")
    earHistoryRef.current = []
  }

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js"
        strategy="afterInteractive"
        onLoad={() => setFaceMeshLoaded(true)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => setCameraLoaded(true)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Driver safety</p>
          <h2 className="mt-2 text-3xl font-semibold">Eye gesture monitor</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Real-time fatigue detection for logistics drivers. Use camera-based eye monitoring to keep drivers alert and deliveries on schedule.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={running || !scriptsReady}
            onClick={startMonitoring}
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start monitor
          </button>
          <button
            type="button"
            disabled={!running}
            onClick={stopMonitoring}
            className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-5 py-3 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop monitor
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled((value) => !value)}
            className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-5 py-3 text-sm font-semibold transition hover:bg-muted"
          >
            {soundEnabled ? "Sound on" : "Sound muted"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-4 rounded-3xl border border-border bg-muted p-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-inner">
            <video
              ref={videoRef}
              className="h-[320px] w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              {status}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Session time</p>
              <p className="mt-2 text-2xl font-semibold">{sessionTime}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Driver focus</p>
              <p className="mt-2 text-2xl font-semibold">{focusScore}%</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Blink count</p>
              <p className="mt-2 text-2xl font-semibold">{blinkCount}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Current EAR</p>
              <p className="mt-2 text-2xl font-semibold">{ear}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Logistics metrics</h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl bg-muted p-4">
                <p className="text-sm font-semibold">Fatigue alert</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {alertActive ? "Driver alert is active" : "Monitoring normal eye movement"}
                </p>
              </div>
              <div className="rounded-3xl bg-muted p-4">
                <p className="text-sm font-semibold">Eyes closed</p>
                <p className="mt-1 text-sm text-muted-foreground">{closedTime.toFixed(1)}s</p>
              </div>
              <div className="rounded-3xl bg-muted p-4">
                <p className="text-sm font-semibold">Frame rate</p>
                <p className="mt-1 text-sm text-muted-foreground">{fps} fps</p>
              </div>
              <div className="rounded-3xl bg-muted p-4">
                <p className="text-sm font-semibold">Alert threshold</p>
                <p className="mt-1 text-sm text-muted-foreground">{earThreshold.toFixed(2)} EAR / {closedTimeLimit.toFixed(1)}s</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Recent alerts</h3>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {alertLog.length > 0 ? (
                alertLog.map((item) => (
                  <div key={item} className="rounded-2xl bg-muted p-3">
                    {item}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-muted p-3">No alerts recorded yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-muted p-4">
            <h3 className="text-lg font-semibold">Safety briefing</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              When driver fatigue is detected, logistics teams can pause routes, reroute deliveries, or assign backup drivers. This link between safety and operations improves completion rates and customer trust.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-muted p-4">
        <h3 className="text-lg font-semibold">Eye movement history</h3>
        <div className="mt-4 h-40 rounded-3xl bg-slate-950 p-4">
          <canvas ref={graphRef} className="h-full w-full rounded-3xl" />
        </div>
      </div>
    </section>
  )
}

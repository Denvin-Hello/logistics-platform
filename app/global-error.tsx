"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.75rem" }}>Something went wrong</h1>
            <p style={{ color: "#666", marginBottom: "2rem" }}>
              An unexpected error occurred while loading this page.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
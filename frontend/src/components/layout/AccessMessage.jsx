import { Link } from "react-router-dom"

export default function AccessMessage({ missing = false, settings = false }) {
  return (
    <section className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-4 px-3 text-center">
      <h1 className="text-2xl font-semibold">{missing ? "Page not found" : "Access denied"}</h1>
      <p className="text-muted-foreground">
        {missing ? "This page does not exist." : "Your account does not have permission to view this page."}
      </p>
      <Link className="rounded text-primary underline underline-offset-4" to={settings ? "/settings?tab=personalization" : "/dashboard"}>
        {settings ? "Go to Personalization" : "Go to Dashboard"}
      </Link>
    </section>
  )
}

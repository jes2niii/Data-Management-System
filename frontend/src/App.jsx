import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toast"
import { router } from "@/routes"
import { LanguageProvider } from "@/contexts/LanguageContext"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </LanguageProvider>
    </QueryClientProvider>
  )
}

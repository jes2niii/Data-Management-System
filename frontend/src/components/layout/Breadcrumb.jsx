import { useLocation, Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const routeLabels = {
  dashboard: "Dashboard",
  users: "Users",
  employees: "Employees",
  files: "Files",
  forms: "Forms",
  billing: "Billing",
  "activity-logs": "Activity Logs",
  reports: "Reports",
  settings: "Settings",
  notifications: "Notifications",
  profile: "Profile",
  login: "Login",
}

export default function DynamicBreadcrumb() {
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter(Boolean)

  if (pathnames.length === 0) return null

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pathnames.map((segment, index) => {
          const isLast = index === pathnames.length - 1
          const to = `/${pathnames.slice(0, index + 1).join("/")}`
          const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          return (
            <BreadcrumbItem key={to}>
              <BreadcrumbSeparator />
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={to}>{label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

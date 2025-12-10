import { Routes, Route } from "react-router-dom";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@material-tailwind/react";

import {
  Sidenav,
  DashboardNavbar,
  Configurator,
  Footer,
} from "@/widgets/layout";

import routes from "@/routes";
import { useMaterialTailwindController, setOpenConfigurator } from "@/context";
import ProtectedRoute from "@/auth/ProtectedRoute";
import NotAuthorized from "@/pages/dashboard/NotAuthorized";
import { getAccessToken, decodeJwt } from "@/services/authService";

export function Dashboard() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavType } = controller;

  const token = getAccessToken();
  const decoded = decodeJwt(token);

  // Extract user roles
  const userRoles = (decoded?.realm_access?.roles || [])
    .map((role) => role.toLowerCase())
    .filter((v, i, arr) => arr.indexOf(v) === i);

  console.log("SIDENAV USER ROLES:", userRoles);

  // Layouts allowed in the dashboard sidebar
  const allowedLayouts = ["dashboard", "documentation"];

  // Sidebar filter
  const sidebarRoutes = routes.filter((r) =>
    allowedLayouts.includes(r.layout)
  );

  // Filter pages by user role
  const filteredRoutes = routes
    .filter((r) => allowedLayouts.includes(r.layout))
    .map((routeGroup) => ({
      ...routeGroup,
      pages: routeGroup.pages.filter((page) =>
        page.roles?.some(
          (role) => userRoles.includes(role.toLowerCase()) || role === "*"
        )
      ),
    }));

  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      {/* SIDENAV */}
      <Sidenav
        routes={filteredRoutes}
        brandImg={
          sidenavType === "dark" ? "/img/logo-ct.png" : "/img/logo-ct-dark.png"
        }
      />

      <div className="p-5 xl:ml-80">
        <DashboardNavbar />
        <Configurator />

        {/* Configurator Floating Button */}
        <IconButton
          size="lg"
          color="white"
          className="fixed bottom-8 right-8 z-40 rounded-full shadow-blue-gray-900/10"
          ripple={false}
          onClick={() => setOpenConfigurator(dispatch, true)}
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </IconButton>

        {/* ROUTES */}
        <Routes>
          <Route path="403" element={<NotAuthorized />} />

          {routes.map(
            ({ layout, pages }) =>
              allowedLayouts.includes(layout) &&
              pages.map(({ path, element, roles }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
                  }
                />
              ))
          )}
        </Routes>

         <div className="mt-auto text-blue-gray-600">
          <Footer />
        </div>
      </div>
    </div>
  );
}

Dashboard.displayName = "/src/layout/dashboard.jsx";

export default Dashboard;

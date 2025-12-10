import {
  HomeIcon,
  BoltIcon,
  GlobeAmericasIcon,
  TruckIcon,
  ServerStackIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";
import { Home, Energy, Environment, Mobility, Documentation } from "@/pages/dashboard";
import { SignIn, SignUp } from "@/pages/auth";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <Home />,
        roles: ["areamanager","admin", "user", "manager"],
      },
      {
        icon: <BoltIcon {...icon} />,
        name: "energy",
        path: "/energy",
        element: <Energy />,
        roles: ["areamanager","admin", "manager"],
      },
      {
        icon: <GlobeAmericasIcon {...icon} />,
        name: "environment",
        path: "/environment",
        element: <Environment />,
        roles: ["areamanager","admin", "manager"],
      },
      {
        icon: <TruckIcon {...icon} />,
        name: "mobility",
        path: "/mobility",
        element: <Mobility />,
        roles: ["areamanager","user", "admin"],
      },
    ],
  },
  {
    layout: "dashboard",
    title: "Documentation",
    pages: [
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "documentation",
        path: "/documentation",
        element: <Documentation />,
        roles: ["areamanager","user", "admin", "manager"],
      },
    ],
  },
  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
        roles: ["*"],
      },
    ],
  },
];

export default routes;
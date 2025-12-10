import React from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import {
  Navbar as MTNavbar,
  Collapse,
  Typography,
  Button,
  IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/auth/useAuth"; // 🔥 ΠΡΟΣΟΧΗ στο path!


export function Navbar({ brandName, routes, action }) {
  const [openNav, setOpenNav] = React.useState(false);

  const { logout } = useAuth();       // 🔥 Παίρνουμε logout από AuthContext
  const navigate = useNavigate();     // 🔥 Για redirect μετά το logout

  const handleLogout = () => {
    logout();                // 🔥 Καθαρίζει tokens, clientId, clientSecret, session
    navigate("/auth/sign-in"); // 🔥 Redirect στην σελίδα login
  };

  React.useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
  }, []);

  const navList = (
    <ul className="mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
      {routes.map(({ name, path, icon }) => (
        <Typography
          key={name}
          as="li"
          variant="small"
          color="blue-gray"
          className="capitalize"
        >
          <Link to={path} className="flex items-center gap-1 p-1 font-normal">
            {icon &&
              React.createElement(icon, {
                className: "w-[18px] h-[18px] opacity-50 mr-1",
              })}
            {name}
          </Link>
        </Typography>
      ))}
    </ul>
  );

  return (
    <MTNavbar className="p-3">
      <div className="container mx-auto flex items-center justify-between text-blue-gray-900 ">
        <Link to="/">
          <Typography
            variant="small"
            className="mr-4 ml-2 cursor-pointer py-1.5 font-bold"
          >
            {brandName}
          </Typography>
        </Link>

        <div className="hidden lg:block">{navList}</div>

        {React.cloneElement(action, {
          className: "hidden lg:inline-block",
        })}

        🔥 ΕΔΩ ΤΟ LOGOUT BUTTON
        <button
          onClick={handleLogout}
          className="text-red-500 font-semibold ml-4 hidden lg:block"
        >
          Logout
        </button>

        <IconButton
          variant="text"
          size="sm"
          className="ml-auto text-inherit hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden"
          onClick={() => setOpenNav(!openNav)}
        >
          {openNav ? (
            <XMarkIcon strokeWidth={2} className="h-6 w-6" />
          ) : (
            <Bars3Icon strokeWidth={2} className="h-6 w-6" />
          )}
        </IconButton>
      </div>

      <Collapse open={openNav}>
        <div className="container mx-auto">
          {navList}

          {/* 🔥 Logout και στο mobile menu */}
          <button
            onClick={handleLogout}
            className="text-red-500 font-semibold w-full text-left"
          >
            Logout
          </button>

          {React.cloneElement(action, {
            className: "w-full block lg:hidden",
          })}
        </div>
      </Collapse>
    </MTNavbar>
  );
}

Navbar.defaultProps = {
  brandName: "Material Tailwind React",
  action: (
    <a
      href="https://www.creative-tim.com/product/material-tailwind-dashboard-react"
      target="_blank"
    >
      <Button variant="gradient" size="sm" fullWidth>
        free download
      </Button>
    </a>
  ),
};

Navbar.propTypes = {
  brandName: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  action: PropTypes.node,
};

Navbar.displayName = "/src/widgets/layout/navbar.jsx";

export default Navbar;
